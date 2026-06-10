import { resolve } from 'node:path';
import { appendLeaderboardEvent, loadLeaderboardEvents } from './eventLog.mjs';
import { createLeaderboardCompareAdapter } from './cryptoAdapter.mjs';
import { EncryptedOrderIndex } from './orderIndex.mjs';

const defaultEventLogPath = resolve('server/data/leaderboard-events.jsonl');

export async function createLeaderboardService({
  eventLogPath = defaultEventLogPath,
  compareAdapter,
} = {}) {
  const adapter = compareAdapter ?? (await createLeaderboardCompareAdapter());
  const events = await loadLeaderboardEvents(eventLogPath);
  const indexes = new Map();
  const fingerprintEntries = new Map();
  for (const event of events) {
    if (!event || event.type !== 'entry_submitted') {
      throw new Error(`unknown-leaderboard-event:${event?.type ?? 'missing'}`);
    }
    await applyEntry(indexes, fingerprintEntries, event.entry, adapter);
  }

  return {
    async submitEntry(entry) {
      const index = await applyEntry(indexes, fingerprintEntries, entry, adapter);
      await appendLeaderboardEvent(eventLogPath, {
        type: 'entry_submitted',
        entry,
      });
      return {
        rankRange: index.rankRangeForEntry(entry.entryId),
        buckets: publicBuckets(index),
      };
    },

    listEntries({ schemaId } = {}) {
      if (!schemaId) {
        return {
          buckets: [],
        };
      }
      const index = indexes.get(schemaId);
      return {
        buckets: index ? publicBuckets(index) : [],
      };
    },
  };
}

async function applyEntry(indexes, fingerprintEntries, entry, adapter) {
  const index = indexFor(indexes, entry.schemaId, adapter);
  const fingerprintKey = fingerprintMapKey(entry);
  const previousEntryId = fingerprintKey ? fingerprintEntries.get(fingerprintKey) : null;
  if (previousEntryId) {
    index.remove(previousEntryId);
  }

  await index.insert(entry);
  if (fingerprintKey) {
    fingerprintEntries.set(fingerprintKey, entry.entryId);
  }
  return index;
}

function fingerprintMapKey(entry) {
  if (typeof entry?.fingerprint !== 'string' || entry.fingerprint.length === 0) {
    return null;
  }
  return `${entry.schemaId}:${entry.fingerprint}`;
}

function indexFor(indexes, schemaId, adapter) {
  if (!schemaId) {
    throw new Error('missing-schemaId');
  }
  const existing = indexes.get(schemaId);
  if (existing) {
    return existing;
  }
  const index = new EncryptedOrderIndex({
    compareEncryptedEntries: adapter.compareEncryptedEntries,
  });
  indexes.set(schemaId, index);
  return index;
}

function publicBuckets(index) {
  return index.listBuckets().map((bucket, bucketIndex) => ({
    bucketId: bucket.bucketId,
    rankStart: rankStartFor(index, bucketIndex),
    rankEnd: rankEndFor(index, bucketIndex),
    count: bucket.count,
    entries: bucket.entries.map((entry) => ({
      entryId: entry.entryId,
      label: entry.label ?? entry.entryId,
      submittedAt: entry.submittedAt ?? null,
    })),
  }));
}

function rankStartFor(index, bucketIndex) {
  const buckets = index.listBuckets();
  let rank = 1;
  for (let i = 0; i < bucketIndex; i += 1) {
    rank += buckets[i].count;
  }
  return rank;
}

function rankEndFor(index, bucketIndex) {
  const buckets = index.listBuckets();
  return rankStartFor(index, bucketIndex) + buckets[bucketIndex].count - 1;
}
