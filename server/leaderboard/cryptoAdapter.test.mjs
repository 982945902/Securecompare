import { describe, expect, it } from 'vitest';
import { createDemoLeaderboardCrypto } from './cryptoAdapter.mjs';
import { EncryptedOrderIndex } from './orderIndex.mjs';

describe('leaderboard crypto WASM adapter', () => {
  it('creates encrypted entries and orders them through the Rust m-H-ORE WASM comparison', async () => {
    const crypto = await createDemoLeaderboardCrypto({
      valueBits: 8,
      maxClients: 8,
      seed: 11,
    });
    const index = new EncryptedOrderIndex({
      compareEncryptedEntries: crypto.compareEncryptedEntries,
    });

    const high = crypto.encryptEntry({
      schemaId: 'score-v1',
      entryId: 'high',
      label: 'High',
      value: 200,
      submittedAt: '2026-06-09T00:00:00.000Z',
    });
    const low = crypto.encryptEntry({
      schemaId: 'score-v1',
      entryId: 'low',
      label: 'Low',
      value: 9,
      submittedAt: '2026-06-09T00:00:00.000Z',
    });
    const midA = crypto.encryptEntry({
      schemaId: 'score-v1',
      entryId: 'mid-a',
      label: 'Mid A',
      value: 169,
      submittedAt: '2026-06-09T00:00:00.000Z',
    });
    const midB = crypto.encryptEntry({
      schemaId: 'score-v1',
      entryId: 'mid-b',
      label: 'Mid B',
      value: 169,
      submittedAt: '2026-06-09T00:00:00.000Z',
    });

    expect(high).not.toHaveProperty('value');

    await index.insert(high);
    await index.insert(low);
    await index.insert(midA);
    await index.insert(midB);

    expect(index.listBuckets().map((bucket) => bucket.entryIds)).toEqual([
      ['low'],
      ['mid-a', 'mid-b'],
      ['high'],
    ]);
    expect(index.rankRangeForEntry('mid-b')).toEqual({ start: 2, end: 3 });
  });
});
