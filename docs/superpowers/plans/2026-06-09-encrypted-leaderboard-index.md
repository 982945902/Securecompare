# Encrypted Leaderboard Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a testable encrypted leaderboard server kernel with in-memory ordered buckets and append-only JSONL persistence.

**Architecture:** Keep the first index in memory as a sorted bucket array behind a small API, and inject encrypted comparison through a compare adapter. Persist only encrypted entry events in JSONL, then replay them on startup to rebuild the in-memory index.

**Tech Stack:** Node/Bun-compatible ESM, Vitest, append-only JSONL files, future Rust/WASM compare adapter.

---

## File Structure

- Create `server/leaderboard/orderIndex.mjs`: validates encrypted entries, inserts by encrypted comparison, aggregates equal buckets, returns rank ranges and bucket snapshots.
- Create `server/leaderboard/eventLog.mjs`: appends and loads JSONL leaderboard events using `node:fs/promises`.
- Create `server/leaderboard/replay.mjs`: rebuilds an `EncryptedOrderIndex` from loaded events.
- Create `server/leaderboard/orderIndex.test.mjs`: TDD tests for sorted insertion, equality aggregation, duplicates, and rank ranges.
- Create `server/leaderboard/eventLog.test.mjs`: TDD tests for append/load and malformed lines.
- Create `server/leaderboard/replay.test.mjs`: TDD tests for rebuilding index state from events.
- Modify no frontend files in this slice.

## Task 1: In-Memory Encrypted Order Index

**Files:**

- Create: `server/leaderboard/orderIndex.test.mjs`
- Create: `server/leaderboard/orderIndex.mjs`

- [ ] **Step 1: Write failing sorted insertion test**

Create `server/leaderboard/orderIndex.test.mjs` with tests that construct an index using a deterministic fixture compare adapter:

```js
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
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run server/leaderboard/orderIndex.test.mjs
```

Expected: FAIL because `server/leaderboard/orderIndex.mjs` does not exist.

- [ ] **Step 3: Implement minimal ordered insertion**

Create `server/leaderboard/orderIndex.mjs` with `EncryptedOrderIndex`, `insert`, `listBuckets`, entry validation, and binary search insertion.

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
npx vitest run server/leaderboard/orderIndex.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Add failing equality, duplicate, and rank-range tests**

Extend `server/leaderboard/orderIndex.test.mjs` with:

- Equal ranks aggregate into one bucket with `count`.
- Duplicate `entryId` throws `duplicate-entry`.
- `rankRangeForEntry(entryId)` returns `{ start, end }` with one-based ranks.

- [ ] **Step 6: Implement aggregation, duplicate rejection, and rank ranges**

Update `server/leaderboard/orderIndex.mjs` to maintain `entryIdsById`, aggregate equal buckets, and compute rank ranges by bucket counts.

- [ ] **Step 7: Run index tests**

Run:

```bash
npx vitest run server/leaderboard/orderIndex.test.mjs
```

Expected: PASS.

## Task 2: Append-Only Event Log

**Files:**

- Create: `server/leaderboard/eventLog.test.mjs`
- Create: `server/leaderboard/eventLog.mjs`

- [ ] **Step 1: Write failing event log tests**

Create tests for:

- `appendLeaderboardEvent(filePath, event)` writes one JSON line.
- `loadLeaderboardEvents(filePath)` returns events in order.
- missing file returns `[]`.
- malformed JSONL line throws `malformed-event-log`.

- [ ] **Step 2: Run event log tests and verify failure**

Run:

```bash
npx vitest run server/leaderboard/eventLog.test.mjs
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement JSONL append/load**

Create `server/leaderboard/eventLog.mjs` using `mkdir`, `appendFile`, and `readFile` from `node:fs/promises`.

- [ ] **Step 4: Run event log tests**

Run:

```bash
npx vitest run server/leaderboard/eventLog.test.mjs
```

Expected: PASS.

## Task 3: Replay Rebuild

**Files:**

- Create: `server/leaderboard/replay.test.mjs`
- Create: `server/leaderboard/replay.mjs`

- [ ] **Step 1: Write failing replay tests**

Create tests proving `rebuildLeaderboardIndex({ events, compareEncryptedEntries })` replays `entry_submitted` events into the same bucket order and rejects unknown event types with `unknown-leaderboard-event`.

- [ ] **Step 2: Run replay tests and verify failure**

Run:

```bash
npx vitest run server/leaderboard/replay.test.mjs
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement replay**

Create `server/leaderboard/replay.mjs` importing `EncryptedOrderIndex` and replaying events with fail-closed validation.

- [ ] **Step 4: Run replay tests**

Run:

```bash
npx vitest run server/leaderboard/replay.test.mjs
```

Expected: PASS.

## Task 4: Verification and Commit

- [ ] **Step 1: Run focused leaderboard tests**

Run:

```bash
npx vitest run server/leaderboard/*.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-06-09-encrypted-leaderboard-index-design.md docs/superpowers/plans/2026-06-09-encrypted-leaderboard-index.md server/leaderboard
git commit -m "Add encrypted leaderboard order index"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: the plan covers index insertion, equal aggregation, duplicate rejection, rank ranges, append-only JSONL persistence, and replay rebuild.
- Placeholder scan: no implementation step contains TBD/TODO/fill-in placeholders.
- Type consistency: the plan consistently uses `EncryptedOrderIndex`, `compareEncryptedEntries`, `entry_submitted`, `appendLeaderboardEvent`, `loadLeaderboardEvents`, and `rebuildLeaderboardIndex`.
