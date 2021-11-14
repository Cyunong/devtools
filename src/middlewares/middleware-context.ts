import { AppClientType, DevicePlatform, ClientRole } from '@/@types/enum';
import { DebugTarget } from '@/@types/tunnel';

export interface ContextBase {
  url?: string;
}

export interface UrlParsedContext extends ContextBase {
  clientId: string;
  targetId: string;
  debugTarget: DebugTarget;
  platform: DevicePlatform;
  appClientTypeList?: AppClientType[];
  clientRole?: ClientRole;
  bundleName?: string;
  customDomains?: string[];
  pathname?: string;
}

export interface MiddleWareContext extends UrlParsedContext {
  msg: Adapter.CDP.Req | Adapter.CDP.Res;
  sendToApp: (msg: Adapter.CDP.Data) => Promise<Adapter.CDP.Res>;
  sendToDevtools: (msg: Adapter.CDP.Data) => Promise<Adapter.CDP.Res>;
}

export type MiddleWare = (ctx: MiddleWareContext, next: () => Promise<Adapter.CDP.Res>) => Promise<Adapter.CDP.Res>;

export interface MiddleWareManager {
  upwardMiddleWareListMap?: { [k: string]: Array<MiddleWare> | MiddleWare };
  downwardMiddleWareListMap?: { [k: string]: Array<MiddleWare> | MiddleWare };
}

export const debugTargetToUrlParsedContext = (debugTarget: DebugTarget): UrlParsedContext => ({
  clientId: debugTarget.clientId,
  targetId: debugTarget.id,
  debugTarget,
  platform: debugTarget.platform,
});
