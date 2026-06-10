import { EncryptedOrderIndex } from './orderIndex.mjs';

export async function rebuildLeaderboardIndex({ events, compareEncryptedEntries }) {
  const index = new EncryptedOrderIndex({ compareEncryptedEntries });

  for (const event of events) {
    if (!event || event.type !== 'entry_submitted') {
      throw new Error(`unknown-leaderboard-event:${event?.type ?? 'missing'}`);
    }
    await index.insert(event.entry);
  }

  return index;
}
