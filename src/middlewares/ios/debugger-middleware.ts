import { ChromeCommand, ChromeEvent, Ios90Command, Ios90Event } from 'tdf-devtools-protocol/types';
import { sendEmptyResultToDevtools } from '../default-middleware';
import { requestId } from '../global-id';
import { MiddleWare, MiddleWareManager } from '../middleware-context';

export let lastScriptEval;

export const debuggerMiddleWareManager: MiddleWareManager = {
  upwardMiddleWareListMap: {
    [ChromeEvent.DebuggerScriptParsed]: ({ msg, sendToDevtools }) => {
      const eventRes = msg as Adapter.CDP.EventRes;
      eventRes.params = {
        ...eventRes.params,
        hasSourceURL: !!eventRes.params.sourceURL,
        // executionContextId: contextId.id,
        // isLiveEdit: false,
        isModule: eventRes.params.module,
        // sourceMapURL: '',
        scriptLanguage: 'JavaScript',
        url: eventRes.params.url || eventRes.params.sourceURL,
      };
      delete eventRes.params.module;
      lastScriptEval = eventRes.params.scriptId;
      return sendToDevtools(eventRes);
    },
    [Ios90Command.DebuggerEnable]: sendEmptyResultToDevtools as MiddleWare,
    'Debugger.setBlackboxPatterns': sendEmptyResultToDevtools as MiddleWare,
    [Ios90Command.DebuggerSetPauseOnExceptions]: sendEmptyResultToDevtools as MiddleWare,
  },
  downwardMiddleWareListMap: {
    [ChromeCommand.DebuggerEnable]: ({ sendToApp, msg }) => {
      sendToApp({
        id: requestId.create(),
        method: ChromeCommand.DebuggerSetBreakpointsActive,
        params: { active: true },
      });
      return sendToApp(msg);
    },
    [ChromeCommand.DebuggerSetBlackboxPatterns]: ({ msg, sendToDevtools }) => {
      const res = {
        id: (msg as Adapter.CDP.Req).id,
        method: msg.method,
        result: {},
      };
      sendToDevtools(res);
      return Promise.resolve(res);
    },
    [ChromeCommand.RuntimeSetAsyncCallStackDepth]: ({ msg, sendToDevtools }) => {
      const res = {
        id: (msg as Adapter.CDP.Req).id,
        method: msg.method,
        result: true,
      };
      sendToDevtools(res);
      return Promise.resolve(res);
    },
  },
};
