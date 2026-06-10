import { describe, expect, it } from 'vitest';
import { createLeaderboardCompareAdapter } from './cryptoAdapter.mjs';
import { createDemoBrowserLeaderboardCrypto } from './demoBrowserCrypto.mjs';
import { EncryptedOrderIndex } from './orderIndex.mjs';

describe('leaderboard crypto WASM adapter', () => {
  it('keeps raw-value encryption on the browser side and comparison on the server side', async () => {
    const browserCrypto = await createDemoBrowserLeaderboardCrypto({
      valueBits: 8,
      maxClients: 8,
      seed: 11,
    });
    const serverCrypto = await createLeaderboardCompareAdapter();
    const index = new EncryptedOrderIndex({
      compareEncryptedEntries: serverCrypto.compareEncryptedEntries,
    });

    expect(serverCrypto).not.toHaveProperty('encryptEntry');

    const high = browserCrypto.encryptEntry({
      schemaId: 'score-v1',
      entryId: 'high',
      label: 'High',
      value: 200,
      submittedAt: '2026-06-09T00:00:00.000Z',
    });
    const low = browserCrypto.encryptEntry({
      schemaId: 'score-v1',
      entryId: 'low',
      label: 'Low',
      value: 9,
      submittedAt: '2026-06-09T00:00:00.000Z',
    });
    const midA = browserCrypto.encryptEntry({
      schemaId: 'score-v1',
      entryId: 'mid-a',
      label: 'Mid A',
      value: 169,
      submittedAt: '2026-06-09T00:00:00.000Z',
    });
    const midB = browserCrypto.encryptEntry({
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
