import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { appendLeaderboardEvent, loadLeaderboardEvents } from './eventLog.mjs';

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function entry(entryId) {
  return {
    schemaId: 'score-v1',
    entryId,
    label: entryId,
    ciphertext: `cipher-${entryId}`,
    token: `token-${entryId}`,
    submittedAt: '2026-06-09T00:00:00.000Z',
  };
}

function event(entryId) {
  return {
    type: 'entry_submitted',
    entry: entry(entryId),
  };
}

describe('leaderboard event log', () => {
  it('appends and loads JSONL events in order', async () => {
    const filePath = await tempLogPath();

    await appendLeaderboardEvent(filePath, event('alice'));
    await appendLeaderboardEvent(filePath, event('bob'));

    expect(await loadLeaderboardEvents(filePath)).toEqual([event('alice'), event('bob')]);
    expect(await readFile(filePath, 'utf8')).toBe(`${JSON.stringify(event('alice'))}\n${JSON.stringify(event('bob'))}\n`);
  });

  it('returns an empty event list when the log file does not exist', async () => {
    const filePath = await tempLogPath();

    expect(await loadLeaderboardEvents(filePath)).toEqual([]);
  });

  it('fails closed on malformed JSONL lines', async () => {
    const filePath = await tempLogPath();
    await writeFile(filePath, `${JSON.stringify(event('alice'))}\nnot-json\n`, 'utf8');

    await expect(loadLeaderboardEvents(filePath)).rejects.toThrow('malformed-event-log');
  });
});

async function tempLogPath() {
  const dir = await mkdtemp(join(tmpdir(), 'securecompare-leaderboard-'));
  tempDirs.push(dir);
  return join(dir, 'events.jsonl');
}
