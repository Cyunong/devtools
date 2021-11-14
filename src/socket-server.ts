import WebSocket, { Server } from 'ws/index.js';
import { ClientEvent, ClientRole, DevicePlatform, AppClientType, ERROR_CODE } from '@/@types/enum';
import { DebugTarget } from '@/@types/tunnel';
import { getDebugTargetManager } from '@/target-manager';
import { appClientManager } from '@/client';
import { AppClient, AppClientOption } from '@/client/app-client';
import { AppClientFullOptionOmicCtx } from '@/client/app-client-manager';
import { debugTargetToUrlParsedContext } from '@/middlewares';
import { DebugTargetManager } from '@/router/chrome-inspect-router';
import { DomainRegister } from '@/utils/cdp';
import { Logger } from '@/utils/log';
import { parseWsUrl } from '@/utils/url';

const log = new Logger('socket-bridge');

export class SocketServer extends DomainRegister {
  // key: appClientId
  private connectionMap: Map<string, Connection> = new Map();
  private wsPath: string;
  private wss: Server;
  private server;
  private debugTarget: DebugTarget;
  // key: req id
  private idWsMap: Map<number, WebSocket> = new Map();

  constructor(server, { wsPath }) {
    super();
    this.wsPath = wsPath;
    this.server = server;
  }

  public start() {
    const wss = new Server({
      server: this.server,
      path: this.wsPath,
    });
    this.wss = wss;
    wss.on('connection', this.onConnection.bind(this));

    wss.on('error', (e) => {
      log.info('wss error: %j', e);
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
   * 选择调试页面，为其搭建通道
   */
  public selectDebugTarget(debugTarget: DebugTarget, ws?: WebSocket): AppClient[] {
    if (!debugTarget) return;
    this.debugTarget = debugTarget;
    // ios 用 jsContext name 作为 appClientId，用来匹配 ws 通道和 IWDP 通道
    const appClientId = debugTarget.platform === DevicePlatform.IOS ? debugTarget.title : debugTarget.id;
    if (!this.connectionMap.has(appClientId)) {
      this.connectionMap.set(appClientId, {
        appClientList: [],
        devtoolsWsList: [],
        appWs: undefined,
      });
    }
    const conn = this.connectionMap.get(appClientId);
    if (!conn.appClientList?.length) {
      let options;
      if (debugTarget.platform === DevicePlatform.Android) {
        options = appClientManager.getAndroidAppClientOptions();
      } else {
        options = appClientManager.getIosAppClientOptions();
      }

      conn.appClientList = options
        .map(({ Ctor, ...option }: AppClientFullOptionOmicCtx) => {
          log.info(`app client ${Ctor.name}`);
          const urlParsedContext = debugTargetToUrlParsedContext(debugTarget);
          const newOption: AppClientOption = {
            urlParsedContext,
            ...option,
          };
          if (Ctor.name === AppClientType.WS) {
            newOption.ws = conn.appWs;
            if (!newOption.ws) {
              return log.info('no app ws connection, ignore WsAppClient.');
            }
          }
          return new Ctor(appClientId, newOption);
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
            if (e === ERROR_CODE.DOMAIN_FILTERED) {
              return log.info('command is filtered');
            }
            log.error('app client send error: %j', e);
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
        log.info('ws error %j', e);
      });
    }

    return conn.appClientList;
  }

  private async onConnection(ws, req) {
    log.info('on connection, ws url: %s', req.url);
    const ctx = parseWsUrl(req.url);
    const { clientRole, targetId, pathname, contextName, platform } = ctx;
    let { clientId } = ctx;
    const debugTarget = await DebugTargetManager.findTarget(targetId);
    log.info('page: %j', debugTarget);
    log.info('%s connected!', clientRole);

    if (pathname !== this.wsPath) {
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
    if (clientRole === ClientRole.Ios && platform === DevicePlatform.IOS) {
      if (!contextName) {
        ws.close();
        return log.info('invalid ios connection, should request with contextName!');
      }
      clientId = contextName;
    }

    if (!clientId) {
      ws.close();
      return log.info('invalid ws connection!');
    }
    ws.clientId = clientId;

    if (clientRole === ClientRole.Devtools) {
      this.selectDebugTarget(debugTarget, ws);
    } else {
      log.info('ws app client connected. %s', clientId);
      getDebugTargetManager(platform).addWsTarget(clientId);
      if (!this.connectionMap.has(clientId)) {
        this.connectionMap.set(clientId, {
          appClientList: [],
          devtoolsWsList: [],
          appWs: ws,
        });
      } else {
        const conn = this.connectionMap.get(clientId);
        conn.appWs = ws;
      }
      ws.on('close', () => {
        log.info('ws app client disconnect. %s', clientId);
        for (const [clientId, { appWs }] of this.connectionMap.entries()) {
          if (appWs === ws) {
            this.connectionMap.delete(clientId);
          }
        }
        getDebugTargetManager(platform).removeWsTarget(ws.clientId);
      });
      ws.on('error', (e) => {
        log.info('app ws error %j', e);
      });
    }
  }
}

type Connection = {
  appClientList: AppClient[];
  devtoolsWsList: WebSocket[];
  appWs?: WebSocket;
};
