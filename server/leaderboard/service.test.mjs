import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createLeaderboardService } from './service.mjs';

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function entry(entryId, rank, fingerprint = `fp-${entryId}`) {
  return {
    schemaId: 'score-v1',
    entryId,
    label: entryId,
    ciphertext: `cipher-${entryId}`,
    token: `token-${entryId}`,
    submittedAt: '2026-06-10T00:00:00.000Z',
    fingerprint,
    fixtureRank: rank,
  };
}

function fixtureCompare(left, right) {
  if (left.fixtureRank < right.fixtureRank) return 'less';
  if (left.fixtureRank > right.fixtureRank) return 'greater';
  return 'equal';
}

async function createFixtureService() {
  const dir = await mkdtemp(join(tmpdir(), 'securecompare-leaderboard-service-'));
  tempDirs.push(dir);
  return createLeaderboardService({
    eventLogPath: join(dir, 'events.jsonl'),
    compareAdapter: {
      compareEncryptedEntries: fixtureCompare,
    },
  });
}

describe('leaderboard service', () => {
  it('updates a previous fingerprint submission instead of increasing count', async () => {
    const service = await createFixtureService();

    await service.submitEntry(entry('alice-first', 30, 'fp-alice'));
    await service.submitEntry(entry('bob', 20, 'fp-bob'));
    const response = await service.submitEntry(entry('alice-second', 10, 'fp-alice'));

    expect(response.rankRange).toEqual({ start: 1, end: 1 });
    expect(response.buckets.map((bucket) => bucket.entries.map((item) => item.entryId))).toEqual([
      ['alice-second'],
      ['bob'],
    ]);
    expect(response.buckets.map((bucket) => bucket.count)).toEqual([1, 1]);
  });
});
