import { describe, expect, it } from 'vitest';
import { EncryptedOrderIndex } from './orderIndex.mjs';

function entry(entryId, rank) {
  return {
    schemaId: 'score-v1',
    entryId,
    label: entryId,
    ciphertext: `cipher-${entryId}`,
    token: `token-${entryId}`,
    submittedAt: '2026-06-09T00:00:00.000Z',
    fixtureRank: rank,
  };
}

function fixtureCompare(left, right) {
  if (left.fixtureRank < right.fixtureRank) return 'less';
  if (left.fixtureRank > right.fixtureRank) return 'greater';
  return 'equal';
}

describe('EncryptedOrderIndex', () => {
  it('inserts encrypted entries into ascending order through the compare adapter', async () => {
    const index = new EncryptedOrderIndex({ compareEncryptedEntries: fixtureCompare });

    await index.insert(entry('high', 30));
    await index.insert(entry('low', 10));
    await index.insert(entry('mid', 20));

    expect(index.listBuckets().map((bucket) => bucket.entryIds)).toEqual([
      ['low'],
      ['mid'],
      ['high'],
    ]);
  });

  it('aggregates equal encrypted entries into a counted bucket', async () => {
    const index = new EncryptedOrderIndex({ compareEncryptedEntries: fixtureCompare });

    await index.insert(entry('alice', 20));
    await index.insert(entry('bob', 20));

    expect(index.listBuckets()).toMatchObject([
      {
        bucketId: 'alice',
        count: 2,
        entryIds: ['alice', 'bob'],
      },
    ]);
  });

  it('rejects duplicate entry ids before changing the index', async () => {
    const index = new EncryptedOrderIndex({ compareEncryptedEntries: fixtureCompare });

    await index.insert(entry('alice', 20));
    await expect(index.insert(entry('alice', 30))).rejects.toThrow('duplicate-entry');

    expect(index.listBuckets().map((bucket) => bucket.entryIds)).toEqual([['alice']]);
  });

  it('returns one-based rank ranges for entries inside counted buckets', async () => {
    const index = new EncryptedOrderIndex({ compareEncryptedEntries: fixtureCompare });

    await index.insert(entry('low-a', 10));
    await index.insert(entry('mid-a', 20));
    await index.insert(entry('mid-b', 20));
    await index.insert(entry('high-a', 30));

    expect(index.rankRangeForEntry('low-a')).toEqual({ start: 1, end: 1 });
    expect(index.rankRangeForEntry('mid-a')).toEqual({ start: 2, end: 3 });
    expect(index.rankRangeForEntry('mid-b')).toEqual({ start: 2, end: 3 });
    expect(index.rankRangeForEntry('high-a')).toEqual({ start: 4, end: 4 });
    expect(index.rankRangeForEntry('missing')).toBeNull();
  });
});
