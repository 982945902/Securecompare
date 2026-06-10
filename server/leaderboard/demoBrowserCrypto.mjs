import { deriveSeed, loadLeaderboardWasm, toBase64 } from './cryptoWasm.mjs';

export async function createDemoBrowserLeaderboardCrypto({
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
  };
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
