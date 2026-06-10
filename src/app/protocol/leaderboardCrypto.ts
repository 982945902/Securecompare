import wasmUrl from './leaderboard-wasm/securecompare_leaderboard_wasm_bg.wasm?url';
import type { DemoLeaderboardAuthority } from './leaderboard-wasm/securecompare_leaderboard_wasm';

type LeaderboardWasmModule = {
  default: (
    moduleOrPath?: string | URL | Response | Promise<Response> | { module_or_path: string | URL },
  ) => Promise<unknown>;
  DemoLeaderboardAuthority: new (
    valueBits: number,
    maxClients: number,
    seed: number,
  ) => DemoLeaderboardAuthority;
};

export type PlainLeaderboardEntry = {
  schemaId: string;
  entryId: string;
  label: string;
  value: number;
  valueBits: number;
  submittedAt: string;
};

export type EncryptedLeaderboardEntry = {
  schemaId: string;
  entryId: string;
  label: string;
  ciphertext: string;
  token: string;
  submittedAt: string;
};

let leaderboardModulePromise: Promise<LeaderboardWasmModule> | null = null;
const authorities = new Map<string, DemoLeaderboardAuthority>();

export async function encryptLeaderboardEntry(
  input: PlainLeaderboardEntry,
): Promise<EncryptedLeaderboardEntry> {
  const wasm = await loadLeaderboardWasm();
  const authorityKey = `${input.valueBits}:8:11`;
  let authority = authorities.get(authorityKey);
  if (!authority) {
    authority = new wasm.DemoLeaderboardAuthority(input.valueBits, 8, 11);
    authorities.set(authorityKey, authority);
  }

  const normalizedValue = normalizeIntegerValue(input.value);
  const nonce = deriveSeed('entry', input.schemaId, input.entryId, normalizedValue);
  return {
    schemaId: input.schemaId,
    entryId: input.entryId,
    label: input.label,
    ciphertext: toBase64(
      authority.encryptCiphertext(
        normalizedValue,
        deriveSeed('ciphertext', input.schemaId, input.entryId, normalizedValue, nonce),
      ),
    ),
    token: toBase64(
      authority.makeToken(
        normalizedValue,
        deriveSeed('token', input.schemaId, input.entryId, normalizedValue, nonce),
      ),
    ),
    submittedAt: input.submittedAt,
  };
}

async function loadLeaderboardWasm(): Promise<LeaderboardWasmModule> {
  if (!leaderboardModulePromise) {
    leaderboardModulePromise = import('./leaderboard-wasm/securecompare_leaderboard_wasm.js').then(
      async (module) => {
        const leaderboard = module as LeaderboardWasmModule;
        await leaderboard.default({ module_or_path: new URL(wasmUrl, import.meta.url) });
        return leaderboard;
      },
    );
  }
  return leaderboardModulePromise;
}

function normalizeIntegerValue(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('排行榜只接受有限数值');
  }
  return Math.round(value);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function deriveSeed(...parts: Array<string | number>): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}
