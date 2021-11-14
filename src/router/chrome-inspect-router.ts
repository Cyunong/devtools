import Router from 'koa-router';
import request from 'request-promise';
import { v4 as uuidv4 } from 'uuid';
import { AppClientType, DevicePlatform, DevtoolsEnv, ChromePageType, ClientRole } from '@/@types/enum';
import { StartServerArgv } from '@/@types/app';
import { DebugTarget } from '@/@types/tunnel';
import { getDebugTargetManager } from '@/target-manager';
import { appClientManager } from '@/client';
import { config } from '@/config';
import { Logger } from '@/utils/log';
import { makeUrl } from '@/utils/url';

const log = new Logger('chrome-inspect-router');

type RouterArgv = Pick<StartServerArgv, 'host' | 'port' | 'iwdpPort' | 'wsPath' | 'env'>;
let cachedRouterArgv = {} as unknown as RouterArgv;

export const getChromeInspectRouter = (routerArgv: RouterArgv) => {
  cachedRouterArgv = routerArgv;
  const chromeInspectRouter = new Router();

  chromeInspectRouter.get('/json/version', (ctx) => {
    ctx.body = { Browser: 'Hippy/v1.0.0', 'Protocol-Version': '1.1' };
  });

  chromeInspectRouter.get('/json', async (ctx) => {
    const rst = await DebugTargetManager.getDebugTargets();
    ctx.body = rst;
  });

  chromeInspectRouter.get('/json/list', async (ctx) => {
    const rst = await DebugTargetManager.getDebugTargets();
    ctx.body = rst;
  });

  return chromeInspectRouter;
};

export class DebugTargetManager {
  public static debugTargets: DebugTarget[] = [];

  public static getDebugTargets = async (): Promise<DebugTarget[]> => {
    // clientId 可以随意赋值，每个 ws 连过来时 clientId 不同即可
    const { iwdpPort, host, port, wsPath } = cachedRouterArgv;
    const clientId = uuidv4();
    const rst: DebugTarget[] = [];
    let iosTargets;
    if ([DevtoolsEnv.TDFCore].indexOf(cachedRouterArgv.env) !== -1) {
      iosTargets = getIosTargetsByManager({ host, port, wsPath, clientId });
    } else {
      iosTargets = await getIosTargetsByIWDP({ iwdpPort, host, port, wsPath, clientId });
    }

    const androidTargets = getAndroidTargets({ host, port, wsPath, clientId });
    rst.push(...iosTargets);
    rst.push(...androidTargets);
    DebugTargetManager.debugTargets = rst;
    return rst;
  };

  public static async findTarget(id: string) {
    const debugTargets = await DebugTargetManager.getDebugTargets();
    return debugTargets.find((target) => target.id === id);
  }
}

/**
 * ios: 通过 IWDP 获取调试页面列表
 */
const getIosTargetsByIWDP = async ({ iwdpPort, host, port, wsPath, clientId }): Promise<DebugTarget[]> => {
  try {
    const deviceList = await request({
      url: '/json',
      baseUrl: `http://127.0.0.1:${iwdpPort}`,
      json: true,
    });
    const appClientTypeList = appClientManager.getIosAppClientOptions().map(({ Ctor }) => Ctor.name) as AppClientType[];
    const debugTargets: DebugTarget[] =
      (await Promise.all(
        deviceList.map(async (device) => {
          const port = device.url.match(/:(\d+)/)[1];
          try {
            const targets = await request({
              url: '/json',
              baseUrl: `http://127.0.0.1:${port}`,
              json: true,
            });
            targets.map((target) => (target.device = device));
            return targets;
          } catch (e) {
            log.error(e);
            return [];
          }
        }),
      )) || [];
    return debugTargets.flat().map((debugTarget) => {
      const targetId = debugTarget.webSocketDebuggerUrl;
      const wsUrl = makeUrl(`${host}:${port}${wsPath}`, {
        platform: DevicePlatform.IOS,
        clientId,
        targetId,
        role: ClientRole.Devtools,
      });
      const devtoolsFrontendUrl = makeUrl(`http://localhost:${port}/front_end/inspector.html`, {
        remoteFrontend: true,
        experiments: true,
        ws: wsUrl,
        env: config.env,
      });
      const matchRst = debugTarget.title.match(/^HippyContext:\s(.*)$/);
      const bundleName = matchRst ? matchRst[1] : '';
      return {
        ...debugTarget,
        id: targetId,
        clientId,
        thumbnailUrl: '',
        appClientTypeList,
        description: debugTarget.title,
        devtoolsFrontendUrl,
        devtoolsFrontendUrlCompat: devtoolsFrontendUrl,
        faviconUrl: bundleName ? 'http://res.imtt.qq.com/hippydoc/img/hippy-logo.ico' : '',
        title: debugTarget.title,
        bundleName,
        type: ChromePageType.Page,
        platform: DevicePlatform.IOS,
        url: '',
        webSocketDebuggerUrl: `ws://${wsUrl}`,
      };
    });
  } catch (e) {
    log.error(e);
    return [];
  }
};

const getIosTargetsByManager = (params: GetTargetsParams): DebugTarget[] => getTargets(params, DevicePlatform.IOS);

/**
 * android: 通过 androidDebugTargetManager 获取调试页面列表
 */

const getAndroidTargets = (params: GetTargetsParams): DebugTarget[] => getTargets(params, DevicePlatform.Android);

type GetTargetsParams = {
  host: string;
  port: number;
  wsPath: string;
  clientId: string;
};

const getTargets = ({ host, port, wsPath, clientId }: GetTargetsParams, platform: DevicePlatform): DebugTarget[] => {
  const appClientOptionsFunction = {
    [DevicePlatform.Android]: appClientManager.getAndroidAppClientOptions,
    [DevicePlatform.IOS]: appClientManager.getIosAppClientOptions,
  }[platform];
  const appClientTypeList = appClientOptionsFunction
    .call(appClientManager)
    .map(({ Ctor }) => Ctor.name) as AppClientType[];
  return getDebugTargetManager(platform)
    .getTargetIdList()
    .map((targetId) => {
      const wsUrl = makeUrl(`${host}:${port}${wsPath}`, {
        platform,
        clientId,
        targetId,
        role: ClientRole.Devtools,
      });
      const devtoolsFrontendUrl = makeUrl(`http://localhost:${port}/front_end/inspector.html`, {
        remoteFrontend: true,
        experiments: true,
        ws: wsUrl,
        env: config.env,
      });
      return {
        id: targetId || clientId,
        clientId,
        thumbnailUrl: '',
        description: 'Hippy instance',
        appClientTypeList,
        devtoolsFrontendUrl,
        devtoolsFrontendUrlCompat: devtoolsFrontendUrl,
        faviconUrl: 'http://res.imtt.qq.com/hippydoc/img/hippy-logo.ico',
        title: 'Hippy debug tools for V8',
        type: ChromePageType.Page,
        platform,
        url: '',
        webSocketDebuggerUrl: `ws://${wsUrl}`,
      };
    });
};
