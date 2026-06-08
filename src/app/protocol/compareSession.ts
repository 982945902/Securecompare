export type CompareOutcome = 'win' | 'lose' | 'draw';

export type CompareInput = {
  mine: number;
  peer: number;
};

export type CompareEngineInfo = {
  id: string;
  label: string;
  mpcReady: boolean;
  peerInputTransport: 'plaintext-datachannel' | 'mpc-messages';
  notice: string;
};

type MpzWasmModule = {
  default: () => Promise<unknown>;
  compare_u32_in_memory_wasm: (a: number, b: number) => Promise<number>;
};

let mpzModulePromise: Promise<MpzWasmModule | null> | null = null;

const compareEngineInfo: CompareEngineInfo = {
  id: 'mpz-in-memory-dev-adapter',
  label: 'WebRTC 原型通道',
  mpcReady: false,
  peerInputTransport: 'plaintext-datachannel',
  notice: '当前版本已接入 WebRTC DataChannel，但比较输入仍用于开发验证；真正双端 MPC 引擎接入前，不应视为生产级隐私比较。',
};

export function getCompareEngineInfo(): CompareEngineInfo {
  return compareEngineInfo;
}

export async function comparePrivateValues(input: CompareInput): Promise<CompareOutcome> {
  const mine = encodeDecimalForCircuit(input.mine);
  const peer = encodeDecimalForCircuit(input.peer);
  const mpz = await loadMpzWasm();
  const direction = mpz
    ? await mpz.compare_u32_in_memory_wasm(mine, peer)
    : compareLocally(mine, peer);

  if (direction > 0) return 'win';
  if (direction < 0) return 'lose';
  return 'draw';
}

function encodeDecimalForCircuit(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Only non-negative finite values can be compared');
  }
  return Math.round(value * 10);
}

function compareLocally(a: number, b: number): number {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

async function loadMpzWasm(): Promise<MpzWasmModule | null> {
  if (typeof self === 'undefined' || typeof WebAssembly === 'undefined') {
    return null;
  }

  if (!mpzModulePromise) {
    mpzModulePromise = import('./mpz-wasm/mpz_wasm_bench.js')
      .then(async (module) => {
        const mpz = module as MpzWasmModule;
        await mpz.default();
        return mpz;
      })
      .catch((error) => {
        console.warn('mpz wasm unavailable, using local compare fallback', error);
        return null;
      });
  }
  return mpzModulePromise;
}
