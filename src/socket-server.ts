import WebSocket, { Server } from 'ws/index.js';
import { ClientEvent, ClientRole, DevicePlatform, AppClientType, ERROR_CODE } from '@/@types/enum';
import { createTargetByWs, model } from '@/db';
import { appClientManager } from '@/client';
import { AppClient, AppClientOption } from '@/client/app-client';
import { AppClientFullOptionOmicCtx } from '@/client/app-client-manager';
import { debugTargetToUrlParsedContext } from '@/middlewares';
import { DebugTargetManager } from '@/controller/debug-targets';
import { DebugTarget } from '@/@types/debug-target';
import { DomainRegister } from '@/utils/cdp';
import { Logger } from '@/utils/log';
import { parseWsUrl } from '@/utils/url';
import { config } from '@/config';

const log = new Logger('socket-bridge');

export class SocketServer extends DomainRegister {
  // key: clientId
  private connectionMap: Map<string, Connection> = new Map();
  private wss: Server;
  private server;
  private debugTarget: DebugTarget;
  // key: req id
  private idWsMap: Map<number, WebSocket> = new Map();

  constructor(server) {
    super();
    this.server = server;
  }

  public start() {
    const wss = new Server({
      server: this.server,
      path: config.wsPath,
    });
    this.wss = wss;
    wss.on('connection', this.onConnection.bind(this));

    wss.on('error', (e) => {
      log.info(`wss error: %s`, e.stack);
    });
    wss.on('headers', (headers) => {
      log.info('wss headers: %j', headers);
    });
    wss.on('upgrade', (response) => {
      log.info('wss upgrade: %j', response);
    });
  }

  public close() {
    this.wss.close(() => {
      log.info('close wss.');
    });
  }

  public sendMessage(msg: Adapter.CDP.Req): Promise<Adapter.CDP.Res> {
    return new Promise((resolve, reject) => {
      const appClientList = this.selectDebugTarget(this.debugTarget);
      if (!appClientList) return reject(ERROR_CODE.NO_APP_CLIENT);
      Promise.all(appClientList.map((appClient) => appClient.sendToApp(msg).catch(() => null))).then((resList) => {
        const filtered = resList.filter((res) => res);
        if (filtered?.length) {
          return resolve(filtered[0]);
        }
      });
    });
  }

  /**
   * app 端连接过来时，添加 pub/sub
   */
  public addPubSub() {}

  /**
   * 选择调试页面，为其搭建通道
   */
  public selectDebugTarget(debugTarget: DebugTarget, ws?: WebSocket): AppClient[] {
    /**
     * ios 使用 title 作为 clientId，不同环境的 title 取值不同
     * - hippy: title === contextName, title 需要和 IWDP 获取到的 contextName 匹配
     * - TDFCore: title === deviceName, 只有 tunnel 通道
     */
    const clientId = debugTarget.platform === DevicePlatform.IOS ? debugTarget.title : debugTarget.clientId;
    if (!this.connectionMap.has(clientId)) {
      // const pubChannelId = `${clientId}_down`;
      // const subChannelId = `${clientId}_up`;
      // const subscriber = await model.createPublisher(pubChannelId);
      // const publisher = await model.createPublisher(subChannelId);
      this.connectionMap.set(clientId, {
        appClientList: [],
        devtoolsWsList: [],
        appWs: undefined,
        subscriber: undefined,
        publisher: undefined,
      });
    }
    const conn = this.connectionMap.get(clientId);
    if (!conn.appClientList?.length) {
      let options;
      if (debugTarget.platform === DevicePlatform.Android) {
        options = appClientManager.getAndroidAppClientOptions();
      } else {
        options = appClientManager.getIosAppClientOptions();
      }

      conn.appClientList = options
        .map(({ Ctor, ...option }: AppClientFullOptionOmicCtx) => {
          log.info(`use app client ${Ctor.name}`);
          const urlParsedContext = debugTargetToUrlParsedContext(debugTarget);
          const newOption: AppClientOption = {
            urlParsedContext,
            ...option,
          };
          if (Ctor.name === AppClientType.WS) {
            newOption.ws = conn.appWs;
            if (!newOption.ws) {
              return log.error('no app ws connection, ignore WsAppClient.');
            }
          }
          return new Ctor(clientId, newOption);
        })
        .filter((v) => v);
    }
    if (ws) conn.devtoolsWsList.push(ws);

    // 绑定数据上行
    conn.appClientList.forEach((appClient) => {
      appClient.removeAllListeners(ClientEvent.Message);
      appClient.on(ClientEvent.Message, (msg: Adapter.CDP.Res) => {
        // 上行到监听器
        this.triggerListerner(msg);
        // 上行到devtools
        if ('id' in msg) {
          // command 上行到调用的 ws
          const currentWs = this.idWsMap.get(msg.id);
          if (!currentWs) return;
          currentWs.send(JSON.stringify(msg));
          this.idWsMap.delete(msg.id);
        } else {
          // event 无法判断是谁触发的，上行到每一个 ws。客户端如果不关心该事件，就不会注册监听，不会有影响。
          conn.devtoolsWsList.forEach((ws) => {
            ws.send(JSON.stringify(msg));
          });
        }
      });
    });

    // 绑定数据下行
    if (ws) {
      ws.on('message', (msg: string) => {
        // appClient 和 ws 是一对多的关系（插件会单独建立一个通道），所以appClient收到消息后需查询上行到哪个ws
        const msgObj: Adapter.CDP.Req = JSON.parse(msg);
        this.idWsMap.set(msgObj.id, ws);
        conn.appClientList.forEach((appClient) => {
          appClient.sendToApp(msgObj).catch((e) => {
            if (e !== ERROR_CODE.DOMAIN_FILTERED) {
              return log.error('%s app client send error: %j', appClient.type, e);
            }
          });
        });
      });

      ws.on('close', () => {
        log.info('devtools ws disconnect.');
        conn.appClientList.forEach((appClient) => {
          appClient.resumeApp();
        });
        const i = conn.devtoolsWsList.findIndex((v) => v === ws);
        if (i !== -1) conn.devtoolsWsList.splice(i, 1);
      });
      ws.on('error', (e) => {
        log.error('ws error %s', e.stack);
      });
    }

    return conn.appClientList;
  }

  private async onConnection(ws, req) {
    log.info('on connection, ws url: %s', req.url);
    const wsUrlParams = parseWsUrl(req.url);
    const { clientRole, pathname, contextName } = wsUrlParams;
    const { clientId } = wsUrlParams;
    const debugTarget = await DebugTargetManager.findDebugTarget(clientId);
    log.info('debug target: %j', debugTarget);
    log.info('%s connected!', clientRole);

    if (pathname !== config.wsPath) {
      ws.close();
      return log.info('invalid ws connection path!');
    }
    if (clientRole === ClientRole.Devtools && !debugTarget) {
      ws.close();
      return log.info("debugTarget doesn't exist!");
    }
    if (!Object.values(ClientRole).includes(clientRole)) {
      ws.close();
      return log.info('invalid client role!');
    }
    if (clientRole === ClientRole.IOS) {
      if (!contextName) {
        ws.close();
        return log.info('invalid ios connection, should request with contextName!');
      }
      // iOS 这里以 contextName 作为 clientId，方便与 IWDP 获取到的调试列表做匹配
      // clientId = contextName;
    }

    if (!clientId) {
      ws.close();
      return log.info('invalid ws connection!');
    }

    if (clientRole === ClientRole.Devtools) {
      this.selectDebugTarget(debugTarget, ws);
    } else {
      log.info('ws app client connected. %s', clientId);
      const debugTarget = createTargetByWs(wsUrlParams);
      model.upsert(config.redis.key, debugTarget.clientId, debugTarget);
      if (!this.connectionMap.has(clientId)) {
        const pubChannelId = `${clientId}_down`;
        const subChannelId = `${clientId}_up`;
        const subscriber = await model.createPublisher(pubChannelId);
        const publisher = await model.createPublisher(subChannelId);
        this.connectionMap.set(clientId, {
          appClientList: [],
          devtoolsWsList: [],
          appWs: ws,
          publisher,
          subscriber,
        });
      } else {
        const conn = this.connectionMap.get(clientId);
        conn.appWs = ws;
      }
      ws.on('close', () => {
        log.info('ws app client disconnect. %s', debugTarget.clientId);
        model.delete(config.redis.key, debugTarget.clientId);
        for (const [clientId, { appWs }] of this.connectionMap.entries()) {
          if (appWs === ws) {
            this.connectionMap.delete(clientId);
          }
        }
      });
      ws.on('error', (e) => {
        log.error('app ws error %s', e.stack);
      });
    }
  }

  /**
   * 创建 pub sub，pipe msg to redis
   */
  private onDevtoolsConnection() {}

  private onAppConnection() {}
}

type Connection = {
  appClientList: AppClient[];
  devtoolsWsList: WebSocket[];
  appWs?: WebSocket;
  publisher: Publisher;
  subscriber: Subscriber;
};
