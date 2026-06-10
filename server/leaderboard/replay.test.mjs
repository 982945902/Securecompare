import { describe, expect, it } from 'vitest';
import { rebuildLeaderboardIndex } from './replay.mjs';

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

function event(entryId, rank) {
  return {
    type: 'entry_submitted',
    entry: entry(entryId, rank),
  };
}

function fixtureCompare(left, right) {
  if (left.fixtureRank < right.fixtureRank) return 'less';
  if (left.fixtureRank > right.fixtureRank) return 'greater';
  return 'equal';
}

describe('leaderboard replay', () => {
  it('rebuilds an encrypted order index from submitted entry events', async () => {
    const index = await rebuildLeaderboardIndex({
      events: [event('high', 30), event('low', 10), event('mid-a', 20), event('mid-b', 20)],
      compareEncryptedEntries: fixtureCompare,
    });

    expect(index.listBuckets().map((bucket) => bucket.entryIds)).toEqual([
      ['low'],
      ['mid-a', 'mid-b'],
      ['high'],
    ]);
    expect(index.rankRangeForEntry('mid-b')).toEqual({ start: 2, end: 3 });
  });

  it('keeps only the latest event for each fingerprint when replaying', async () => {
    const firstAlice = event('alice-first', 30);
    firstAlice.entry.fingerprint = 'fp-alice';
    const bob = event('bob', 20);
    bob.entry.fingerprint = 'fp-bob';
    const secondAlice = event('alice-second', 10);
    secondAlice.entry.fingerprint = 'fp-alice';

    const index = await rebuildLeaderboardIndex({
      events: [firstAlice, bob, secondAlice],
      compareEncryptedEntries: fixtureCompare,
    });

    expect(index.listBuckets().map((bucket) => bucket.entryIds)).toEqual([
      ['alice-second'],
      ['bob'],
    ]);
  });

  it('fails closed on unknown event types', async () => {
    await expect(
      rebuildLeaderboardIndex({
        events: [{ type: 'snapshot_created', entry: entry('alice', 10) }],
        compareEncryptedEntries: fixtureCompare,
      }),
    ).rejects.toThrow('unknown-leaderboard-event');
  });
});
