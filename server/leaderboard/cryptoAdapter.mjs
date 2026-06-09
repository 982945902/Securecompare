import { readFile } from 'node:fs/promises';

let wasmModulePromise = null;

export async function createDemoLeaderboardCrypto({
  valueBits,
  maxClients,
  seed,
}) {
  const wasm = await loadLeaderboardWasm();
  const authority = new wasm.DemoLeaderboardAuthority(valueBits, maxClients, seed);
  let nonce = 1;

  return {
    encryptEntry(input) {
      validatePlainEntry(input);
      const ciphertextSeed = deriveSeed('ciphertext', input.schemaId, input.entryId, input.value, nonce);
      const tokenSeed = deriveSeed('token', input.schemaId, input.entryId, input.value, nonce);
      nonce += 1;

      return {
        schemaId: input.schemaId,
        entryId: input.entryId,
        label: input.label,
        ciphertext: toBase64(authority.encryptCiphertext(input.value, ciphertextSeed)),
        token: toBase64(authority.makeToken(input.value, tokenSeed)),
        submittedAt: input.submittedAt,
      };
    },

    compareEncryptedEntries(left, right) {
      validateEncryptedEntry(left);
      validateEncryptedEntry(right);
      if (left.schemaId !== right.schemaId) {
        throw new Error('schema-mismatch');
      }
      return wasm.compareMhOre(fromBase64(left.ciphertext), fromBase64(right.token));
    },
  };
}

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

function validatePlainEntry(input) {
  for (const field of ['schemaId', 'entryId', 'label', 'submittedAt']) {
    if (typeof input?.[field] !== 'string' || input[field].length === 0) {
      throw new Error(`missing-${field}`);
    }
  }
  if (!Number.isInteger(input.value) || input.value < 0 || input.value > 0xffffffff) {
    throw new Error('invalid-value');
  }
}

function validateEncryptedEntry(entry) {
  for (const field of ['schemaId', 'entryId', 'ciphertext', 'token']) {
    if (typeof entry?.[field] !== 'string' || entry[field].length === 0) {
      throw new Error(`missing-${field}`);
    }
  }
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(text) {
  return Uint8Array.from(Buffer.from(text, 'base64'));
}

function deriveSeed(...parts) {
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
