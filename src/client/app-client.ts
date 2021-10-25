/**
 * app 客户端，未来可能有多个消息通道：
 *    - tunnel 通道
 *    - app ws client 通道
 *    - IWDP ws client 通道
 *
 * 统一封装一层，防止app端通道频繁修改
 */
import { EventEmitter } from 'events';
import WebSocket from 'ws/index.js';
import { AppClientType, ClientEvent, DevicePlatform } from '../@types/enum';
import { ERROR_CODE } from '../error-code';
import {
  defaultDownwardMiddleware,
  defaultUpwardMiddleware,
  MiddleWareManager,
  UrlParsedContext,
} from '../middlewares';
import { requestId } from '../middlewares/global-id';
import { CDP_DOMAIN_LIST, getDomain } from '../utils/cdp';
import { Logger } from '../utils/log';
import { compose } from '../utils/middleware';

const downwardLog = new Logger('↓↓↓', 'red');
const upwardLog = new Logger('↑↑↑', 'green');

/**
 * 对外接口：
 *  on:
 *      message       : app response
 *      close         : app 断连后触发，需通知 devtools 也断连
 *  send              : send command to app
 **/
export abstract class AppClient extends EventEmitter {
  public id: string;
  public type: AppClientType;
  protected middleWareManager: MiddleWareManager;
  protected urlParsedContext: UrlParsedContext;
  protected msgBuffer: any[] = [];
  protected acceptDomains: string[] = CDP_DOMAIN_LIST;
  protected ignoreDomains: string[] = [];
  protected useAllDomain = true;
  protected isClosed = false;
  protected msgIdMethodMap: Map<number, string> = new Map();
  protected platform: DevicePlatform;

  constructor(
    id,
    {
      useAllDomain = true,
      acceptDomains,
      ignoreDomains = [],
      middleWareManager,
      urlParsedContext,
      platform,
    }: AppClientOption,
  ) {
    super();
    this.id = id;
    this.useAllDomain = useAllDomain;
    this.acceptDomains = acceptDomains;
    this.ignoreDomains = ignoreDomains;
    this.middleWareManager = middleWareManager;
    this.urlParsedContext = urlParsedContext;
    this.platform = platform;
  }

  public send(msg: Adapter.CDP.Req): Promise<Adapter.CDP.Res> {
    if (!this.filter(msg)) {
      downwardLog.info(`'${msg.method}' is filtered in app client type: ${this.type}`);
      return Promise.reject(ERROR_CODE.DOMAIN_FILTERED);
    }

    const { method } = msg;
    this.msgIdMethodMap.set(msg.id, msg.method);
    let middlewareList = this.middleWareManager.downwardMiddleWareListMap[method];
    if (!middlewareList) middlewareList = [];
    if (!(middlewareList instanceof Array)) middlewareList = [middlewareList];
    const fullMiddlewareList = [...middlewareList, defaultDownwardMiddleware];
    downwardLog.info(`'${msg.method}' middlewareLength: ${fullMiddlewareList.length}`);

    return compose(fullMiddlewareList)(this.makeContext(msg));
  }

  protected sendToDevtools(msg: Adapter.CDP.Res) {
    if (!msg) return Promise.reject(ERROR_CODE.EMPTY_COMMAND);
    this.emit(ClientEvent.Message, msg);
    return Promise.resolve(msg);
  }

  protected onMessage(msg: Adapter.CDP.Res): Promise<Adapter.CDP.Res> {
    try {
      if ('id' in msg) {
        const method = this.msgIdMethodMap.get(msg.id);
        if (method) msg.method = method;
        this.msgIdMethodMap.delete(msg.id);
      }

      const { method } = msg;
      let middlewareList = this.middleWareManager.upwardMiddleWareListMap[method] || [];
      if (!middlewareList) middlewareList = [];
      if (!(middlewareList instanceof Array)) middlewareList = [middlewareList];
      const fullMiddlewareList = [...middlewareList, defaultUpwardMiddleware];
      return compose(fullMiddlewareList)(this.makeContext(msg));
    } catch (e) {
      console.error(`app client on message error: ${JSON.stringify(e)}`);
      return Promise.reject(e);
    }
  }

  protected makeContext(msg: Adapter.CDP.Req | Adapter.CDP.Res) {
    return {
      ...this.urlParsedContext,
      msg,
      sendToApp: (msg: Adapter.CDP.Req): Promise<Adapter.CDP.Res> => {
        if (!msg.id) {
          msg.id = requestId.create();
        }
        downwardLog.info('%j', msg);
        return this.sendToApp(msg);
      },
      sendToDevtools: (msg: Adapter.CDP.Res) => {
        upwardLog.info('%j %j', (msg as Adapter.CDP.CommandRes).id, msg.method);
        return this.sendToDevtools(msg);
      },
    };
  }

  /**
   * 通过filter的才会下行，否则直接丢弃
   */
  protected filter(msg: Adapter.CDP.Req) {
    if (this.useAllDomain) return true;
    const { method } = msg;
    const domain = getDomain(method);

    if (this.ignoreDomains.length) {
      const isIgnoreDomain = this.ignoreDomains.indexOf(domain) !== -1 || this.ignoreDomains.indexOf(method) !== -1;
      return !isIgnoreDomain;
    }
    const isAcceptDomain = this.acceptDomains.indexOf(domain) !== -1 || this.acceptDomains.indexOf(method) !== -1;
    return isAcceptDomain;
  }

  public abstract resumeApp(): void;
  protected abstract sendToApp(msg: Adapter.CDP.Req): Promise<Adapter.CDP.Res>;
  protected abstract registerMessageListener(): void;
}

export type AppClientOption = {
  useAllDomain: boolean;
  acceptDomains?: string[];
  ignoreDomains?: string[];
  ws?: WebSocket;
  middleWareManager: MiddleWareManager;
  urlParsedContext: UrlParsedContext;
  platform: DevicePlatform;
};
