# Encrypted Leaderboard Index Design

## Goal

Build the first product integration layer for encrypted asynchronous leaderboards: browser-side encryption will produce encrypted sortable entries, while the server maintains an ordered index using only encrypted comparison.

## Scope

This design covers the server-side MVP kernel only:

- An encrypted order index that inserts entries using a compare adapter.
- Equal-value aggregation through bucket counts.
- Append-only JSONL persistence for encrypted entry events.
- Rebuild-on-start by replaying persisted events into memory.

This design does not cover:

- UI integration.
- Real browser/server WASM packaging.
- Production key management.
- Database-backed B+Tree pages.
- Anti-cheat or proof that a submitted value is truthful.

## Security Boundary

The leaderboard server does not receive a decryption API and does not store raw submitted values. It stores encrypted sortable material and can evaluate order relations.

The server learns:

- Relative order between encrypted entries.
- Equality / same-bucket membership.
- Counts per encrypted bucket.
- Submission metadata such as category id, entry id, label, and timestamp.

The server does not learn raw values through a direct decryption operation. Small-domain enumeration, frequency analysis, and auxiliary metadata inference are explicitly outside the MVP guarantee and must remain documented as leakage risks.

## Architecture

```text
Browser
  raw value
  -> schema normalization
  -> browser WASM encryption
  -> EncryptedLeaderboardEntry

Server
  receives EncryptedLeaderboardEntry
  -> appends entry_submitted event to JSONL
  -> inserts entry into EncryptedOrderIndex
  -> compares through injected compare adapter

Disk
  append-only JSONL event log
  -> replayed on server start
```

## Data Model

`EncryptedLeaderboardEntry`:

- `schemaId`: leaderboard schema/version.
- `entryId`: unique submission id.
- `label`: display label for MVP output.
- `ciphertext`: base64 encoded encrypted ciphertext bytes.
- `token`: base64 encoded comparison token bytes.
- `submittedAt`: ISO timestamp.

`EncryptedOrderBucket`:

- `bucketId`: stable internal id derived from first entry id in the bucket.
- `representative`: first encrypted entry for this bucket.
- `count`: number of equal encrypted entries.
- `entryIds`: insertion-ordered entry ids in this bucket.

`LeaderboardEvent`:

- `type`: currently `entry_submitted`.
- `entry`: encrypted leaderboard entry.

## Compare Adapter

The index depends on a single injected function:

```ts
compareEncryptedEntries(left, right) -> "less" | "equal" | "greater"
```

For the MVP server kernel, tests may use a deterministic adapter that compares hidden fixture ranks. Production integration will replace it with the server WASM adapter calling `m_h_ore::compare(left.ciphertext, right.token)`.

## Index Behavior

The first implementation uses an in-memory sorted bucket array, not a B+Tree. This keeps behavior easy to verify before adding page splits.

Insertion:

1. Reject entries whose `schemaId`, `entryId`, `ciphertext`, or `token` is missing.
2. Reject duplicate `entryId`.
3. Binary-search buckets with the compare adapter.
4. If comparison returns `equal`, append `entryId` to that bucket and increment `count`.
5. If comparison returns `less` or `greater`, insert a new bucket in order.

The external API should not expose that the first implementation is an array. A later B+Tree can replace the internals without changing callers.

## Persistence Behavior

Persistence is append-only JSONL:

```json
{"type":"entry_submitted","entry":{"schemaId":"score-v1","entryId":"e1","label":"Alice","ciphertext":"...","token":"...","submittedAt":"2026-06-09T00:00:00.000Z"}}
```

On startup:

1. Load all events from the JSONL file if it exists.
2. Replay `entry_submitted` events through `EncryptedOrderIndex.insert`.
3. Fail closed if an event is malformed or replay comparison fails.

This is intentionally simpler than a database. If data size grows, add snapshots first, then consider DuckDB/Postgres for analytics or production storage.

## Testing Strategy

- Unit-test sorted insertion, equal aggregation, duplicate rejection, and rank ranges.
- Unit-test JSONL append/load behavior.
- Unit-test replay rebuilds the same ordered buckets.
- Do not require real WASM for the first index tests; real WASM integration gets its own tests once the wrapper exists.

## First Implementation Slice

Build:

1. `server/leaderboard/orderIndex.mjs`
2. `server/leaderboard/eventLog.mjs`
3. `server/leaderboard/replay.mjs`
4. Vitest coverage for all three modules.

The slice should produce a testable encrypted leaderboard kernel without adding UI routes.

## First WASM Adapter Slice

The next integration slice adds `wasm/leaderboard-crypto` as a thin `wasm-bindgen` wrapper over `rust/leaderboard-crypto`.

The MVP wrapper exposes a `DemoLeaderboardAuthority` for local integration tests. This object can generate ciphertext and token material from a raw value, so it is not the final production authority boundary. It exists to prove the server index can consume real Rust/WASM m-H-ORE artifacts.

The JavaScript adapter layer already separates roles:

- `demoBrowserCrypto.mjs`: simulates the browser-side encryption package and creates encrypted submissions.
- `cryptoAdapter.mjs`: exposes only server-side encrypted comparison and does not expose a raw-value encryption API.

Production integration should move the browser-side encryption adapter into the frontend package and replace the demo authority seed with real key material distribution.
