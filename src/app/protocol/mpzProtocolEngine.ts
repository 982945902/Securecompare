import type { CompareProtocolEngine, CompareEngineRunInput } from './compareEngine';
import { encodeDecimalForCircuit, type CompareOutcome } from './compareSession';
import wasmUrl from './mpz-wasm/securecompare_mpz_wasm_bg.wasm?url';
import type { WasmComparePumpSession } from './mpz-wasm/securecompare_mpz_wasm';

type MpzWasmModule = {
  default: (
    moduleOrPath?: string | URL | Response | Promise<Response> | { module_or_path: string | URL },
  ) => Promise<unknown>;
  WasmComparePumpSession: new (role: string, value: number) => WasmComparePumpSession;
};

let mpzModulePromise: Promise<MpzWasmModule> | null = null;

export function __setMpzWasmModuleForTest(module: MpzWasmModule | null): void {
  mpzModulePromise = module ? Promise.resolve(module) : null;
}

export const mpzProtocolEngine: CompareProtocolEngine = {
  info: {
    id: 'mpz-message-engine',
    label: 'mpz 双端消息引擎',
    mpcReady: true,
    peerInputTransport: 'mpc-messages',
    notice:
      '邀请 PK 已接入 mpz wasm 双端消息泵：房间通道只交换协议字节，不直接发送双方输入值；OT 栈使用 Chou-Orlandi base OT + KOS RCOT extension + DerandCOT。',
  },
  run: async (input) => runMpzCompare(input),
};

async function runMpzCompare({
  myValue,
  role,
  transport,
}: CompareEngineRunInput): Promise<CompareOutcome> {
  const mpz = await loadMpzWasm();
  const wasmRole = role === 'challenger' ? 'garbler' : 'evaluator';
  const session = new mpz.WasmComparePumpSession(wasmRole, encodeDecimalForCircuit(myValue));
  let readerClosed = false;
  let readerError: unknown = null;
  const readLoop = (async () => {
    while (!readerClosed && !session.isDone()) {
      const incoming = await transport.receive();
      if (readerClosed) {
        return;
      }
      session.pushInbound(incoming);
    }
  })().catch((error) => {
    readerError = error;
  });

  try {
    while (!session.isDone()) {
      drainOutbound(session, transport.send.bind(transport));
      throwIfReaderFailed(readerError);
      throwIfSessionFailed(session);
      await pumpEventLoop();
    }

    drainOutbound(session, transport.send.bind(transport));
    throwIfReaderFailed(readerError);
    throwIfSessionFailed(session);
    return toLocalOutcome(session.resultCode(), role);
  } finally {
    readerClosed = true;
    readLoop.catch(() => undefined);
    session.closeRemote();
    session.free();
  }
}

function drainOutbound(
  session: Pick<WasmComparePumpSession, 'takeOutbound'>,
  send: (bytes: Uint8Array) => void,
): void {
  while (true) {
    const outbound = session.takeOutbound();
    if (outbound.byteLength === 0) return;
    send(outbound);
  }
}

function throwIfSessionFailed(session: Pick<WasmComparePumpSession, 'error'>): void {
  const error = session.error();
  if (error) {
    throw new Error(error);
  }
}

function throwIfReaderFailed(error: unknown): void {
  if (error) {
    throw error;
  }
}

function toLocalOutcome(
  garblerPerspectiveCode: number,
  role: CompareEngineRunInput['role'],
): CompareOutcome {
  if (garblerPerspectiveCode === 0) return 'draw';
  if (garblerPerspectiveCode === 1) return role === 'challenger' ? 'win' : 'lose';
  if (garblerPerspectiveCode === -1) return role === 'challenger' ? 'lose' : 'win';
  throw new Error(`mpz compare session finished without a result: ${garblerPerspectiveCode}`);
}

function pumpEventLoop(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

async function loadMpzWasm(): Promise<MpzWasmModule> {
  if (
    typeof globalThis === 'undefined' ||
    typeof globalThis.WebAssembly === 'undefined'
  ) {
    throw new Error('当前环境不支持 WebAssembly，无法运行 mpz 双端协议');
  }

  if (!mpzModulePromise) {
    const global = globalThis as typeof globalThis & {
      self?: typeof globalThis;
      addEventListener?: typeof globalThis.addEventListener;
      removeEventListener?: typeof globalThis.removeEventListener;
    };
    global.self ??= globalThis;
    global.addEventListener ??= (() => undefined) as typeof globalThis.addEventListener;
    global.removeEventListener ??= (() => undefined) as typeof globalThis.removeEventListener;

    mpzModulePromise = import('./mpz-wasm/securecompare_mpz_wasm.js').then(async (module) => {
      const mpz = module as MpzWasmModule;
      await mpz.default({ module_or_path: new URL(wasmUrl, import.meta.url) });
      return mpz;
    });
  }
  return mpzModulePromise;
}
