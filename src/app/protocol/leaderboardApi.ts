import { encryptLeaderboardEntry, type EncryptedLeaderboardEntry } from './leaderboardCrypto';
import type { Category } from '../App';

export type LeaderboardBucket = {
  bucketId: string;
  rankStart: number;
  rankEnd: number;
  count: number;
  entries: Array<{
    entryId: string;
    label: string;
    submittedAt: string | null;
  }>;
};

export type LeaderboardResponse = {
  buckets: LeaderboardBucket[];
};

export async function submitLeaderboardValue({
  category,
  value,
  label,
}: {
  category: Category;
  value: number;
  label: string;
}): Promise<LeaderboardResponse & { rankRange: { start: number; end: number } | null }> {
  const entry = await encryptLeaderboardEntry({
    schemaId: category.id,
    entryId: crypto.randomUUID(),
    label,
    value,
    valueBits: valueBitsForCategory(category),
    submittedAt: new Date().toISOString(),
  });

  return postEncryptedEntry(entry);
}

export async function loadLeaderboard(category: Category): Promise<LeaderboardResponse> {
  const response = await fetch(
    `${leaderboardBaseUrl()}/leaderboard/entries?schemaId=${encodeURIComponent(category.id)}`,
  );
  if (!response.ok) {
    throw new Error(`排行榜加载失败：${response.status}`);
  }
  return response.json();
}

async function postEncryptedEntry(
  entry: EncryptedLeaderboardEntry,
): Promise<LeaderboardResponse & { rankRange: { start: number; end: number } | null }> {
  const response = await fetch(`${leaderboardBaseUrl()}/leaderboard/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `排行榜提交失败：${response.status}`);
  }
  return response.json();
}

function leaderboardBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  const configured = env?.VITE_LEADERBOARD_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return `${window.location.protocol}//${window.location.hostname}:8787`;
}

function valueBitsForCategory(category: Category): number {
  return Math.ceil(Math.log2(Math.max(1, Math.ceil(category.max)) + 1));
}
