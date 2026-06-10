import { fromBase64, loadLeaderboardWasm, validateEncryptedEntry } from './cryptoWasm.mjs';

export async function createLeaderboardCompareAdapter() {
  const wasm = await loadLeaderboardWasm();

  return {
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
