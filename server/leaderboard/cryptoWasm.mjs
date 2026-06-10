import { readFile } from 'node:fs/promises';

let wasmModulePromise = null;

export async function loadLeaderboardWasm() {
  if (!wasmModulePromise) {
    wasmModulePromise = import('./crypto-wasm/securecompare_leaderboard_wasm.js').then(
      async (module) => {
        const wasmBytes = await readFile(
          new URL('./crypto-wasm/securecompare_leaderboard_wasm_bg.wasm', import.meta.url),
        );
        await module.default({ module_or_path: wasmBytes });
        return module;
      },
    );
  }
  return wasmModulePromise;
}

export function validateEncryptedEntry(entry) {
  for (const field of ['schemaId', 'entryId', 'ciphertext', 'token']) {
    if (typeof entry?.[field] !== 'string' || entry[field].length === 0) {
      throw new Error(`missing-${field}`);
    }
  }
}

export function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

export function fromBase64(text) {
  return Uint8Array.from(Buffer.from(text, 'base64'));
}

export function deriveSeed(...parts) {
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
