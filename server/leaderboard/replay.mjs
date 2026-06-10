import { EncryptedOrderIndex } from './orderIndex.mjs';

export async function rebuildLeaderboardIndex({ events, compareEncryptedEntries }) {
  const index = new EncryptedOrderIndex({ compareEncryptedEntries });
  const fingerprintEntries = new Map();

  for (const event of events) {
    if (!event || event.type !== 'entry_submitted') {
      throw new Error(`unknown-leaderboard-event:${event?.type ?? 'missing'}`);
    }
    const fingerprintKey = fingerprintMapKey(event.entry);
    const previousEntryId = fingerprintKey ? fingerprintEntries.get(fingerprintKey) : null;
    if (previousEntryId) {
      index.remove(previousEntryId);
    }
    await index.insert(event.entry);
    if (fingerprintKey) {
      fingerprintEntries.set(fingerprintKey, event.entry.entryId);
    }
  }

  return index;
}

function fingerprintMapKey(entry) {
  if (typeof entry?.fingerprint !== 'string' || entry.fingerprint.length === 0) {
    return null;
  }
  return `${entry.schemaId}:${entry.fingerprint}`;
}
