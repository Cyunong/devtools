export const enum DevtoolsEnv {
  Hippy = 'hippy',
  Voltron = 'voltron',
  TDF = 'TDF',
  TDFCore = 'TDFCore',
}

export const enum DevicePlatform {
  Unkonwn = '0',
  IOS = '1',
  Android = '2',
}

export const enum DeviceStatus {
  Connected = '1',
  Disconnected = '2',
}

export const TunnelEvent = {
  AddDevice: 'tunnel_add_device',
  RemoveDevice: 'tunnel_remove_device',
  AppConnect: 'tunnel_app_connect',
  AppDisconnect: 'tunnel_app_disconnect',
  ReceiveData: 'tunnel_recv_data',
  TunnelLog: 'tunnel_log',
};

export const enum DebuggerProtocolType {
  Unkonwn,
  CDP,
  DAP,
}

export const enum ClientType {
  App = 'app',
  Devtools = 'devtools',
  Unknown = 'unknown',
}

export enum ClientRole {
  Android = 'android_client',
  Devtools = 'devtools',
  IOS = 'ios_client',
}

export const enum ClientEvent {
  Message = 'message',
  Close = 'close',
}

export const enum AppClientType {
  Tunnel = 'TunnelAppClient',
  WS = 'WsAppClient',
  IWDP = 'IwdpAppClient',
  Custom = 'custom',
}

export enum PH {
  Begin = 'B',
  End = 'E',
  MetaData = 'M',
  Complete = 'X',
}

export enum DeviceManagerEvent {
  addDevice = 'addDevice',
  removeDevice = 'removeDevice',
  appDidDisConnect = 'appDidDisConnect',
  appDidConnect = 'appDidConnect',
  getDeviceList = 'getDeviceList',
}

export enum ChromePageType {
  Page = 'page',
  Node = 'node',
}

export const enum ERROR_CODE {
  DOMAIN_FILTERED = 1,
  NO_APP_CLIENT = 2,
  EMPTY_COMMAND = 3,
}

export const enum PROTOCOL_ERROR_CODE {
  ProtocolNotFound = -32601,
}

export enum MiddlewareType {
  Upward = 'upward',
  Downward = 'downward',
}

export enum DBType {
  Redis = 'redis',
  Memory = 'memory',
}

export enum WinstonColor {
  Magenta = 'magenta',
  Red = 'red',
  Green = 'green',
  Yellow = 'yellow',
}
