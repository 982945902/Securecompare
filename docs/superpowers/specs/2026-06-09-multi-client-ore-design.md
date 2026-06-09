# Multi-Client ORE Rust Crate Design

## Status

Approved design direction:

- Build a standalone pure Rust implementation.
- Strictly target the multi-client ORE / m-H-ORE construction from the 2024 IEEE TDSC paper, "Towards Practical Multi-Client Order-Revealing Encryption: Improvement and Application."
- Keep it separate from the existing Invite PK `wasm/mpz-compare` crate.
- Do not start with a toy OPE implementation.
- Do not bind the original C evaluation stack (`OpenSSL`, `PBC`, `GMP`) in the first version.

This crate is a research-grade crypto module. It is not production-ready until it has complete tests, benchmarks, parameter review, and external review.

## Problem

Securecompare needs a future leaderboard mode where users can submit encrypted sortable scores asynchronously. Unlike Invite PK, leaderboard users are not online at the same time, and the server must be able to rank submitted encrypted values later.

Plain MPC sorting is too heavy for this product surface. Traditional single-client OPE / ORE does not fit the desired key model because all clients would need to share one encryption key. The target construction is multi-client ORE: each client receives its own secret key from a common setup authority, encrypts locally, and the leaderboard service can compare ciphertexts using comparison material without seeing raw values.

## Goals

1. Create a standalone Rust crate at `rust/leaderboard-crypto`.
2. Implement the paper algorithms as directly and readably as possible:
   - setup
   - client key generation
   - encryption
   - comparison key / comparison material generation
   - ciphertext comparison
   - m-H-ORE variant if it is sufficiently specified and feasible after the base construction
3. Expose a stable Rust API suitable for later browser wasm and server-native integration.
4. Add correctness tests for multi-client ordering.
5. Add serialization round-trip tests for public parameters, client keys, comparison material, and ciphertexts.
6. Add benchmarks for setup, key generation, encryption, pairwise comparison, and sorting batches.
7. Document leakage and trust assumptions in crate-local docs.

## Non-Goals

1. No frontend leaderboard UI in this phase.
2. No production leaderboard server in this phase.
3. No wasm package generation in the first implementation phase.
4. No C FFI binding to `PBC`, `GMP`, or the authors' evaluation code unless pure Rust proves blocked.
5. No anti-cheat guarantees. This crate hides submitted values from the leaderboard service under the scheme's assumptions; it does not prove users submitted honest real-world values.
6. No claim of MPC-equivalent privacy. The leaderboard service necessarily learns comparison order.

## Security Model

The design assumes a common setup authority that generates master material and per-client keys. Clients do not choose unrelated random private keys. Their keys are derived from the same setup, which is what makes cross-client comparison possible.

Expected visibility:

| Actor | Learns |
|------|--------|
| Client | Its own raw value and secret key |
| Setup authority | Master secret and issued client keys |
| Leaderboard service | Ciphertexts, identifiers, timestamps, and ordering relation |
| Other clients | Public leaderboard output only |

Expected leakage:

- Relative order between submitted ciphertexts.
- Equality if the comparison algorithm exposes equality.
- Metadata such as submission time, category, and account identifier.
- Any additional leakage specified by the paper construction, such as first-differing-position style leakage if present.

The crate documentation must state that small domains, such as age and height, are vulnerable to distributional inference when global order is visible.

## Architecture

The crate should be a pure Rust library with no dependency on the app's React or signaling code.

Proposed path:

```text
rust/leaderboard-crypto/
├── Cargo.toml
├── README.md
├── docs/
│   ├── paper-notes.md
│   ├── security-model.md
│   └── implementation-notes.md
├── src/
│   ├── lib.rs
│   ├── error.rs
│   ├── params.rs
│   ├── types.rs
│   ├── setup.rs
│   ├── keygen.rs
│   ├── encrypt.rs
│   ├── compare.rs
│   ├── encoding.rs
│   ├── hash.rs
│   └── rng.rs
├── tests/
│   ├── correctness.rs
│   ├── multi_client.rs
│   ├── serialization.rs
│   └── edge_cases.rs
└── benches/
    └── ore_bench.rs
```

### Module Responsibilities

`params.rs`
: Security parameters, supported domains, bit length, client count limits, and validation.

`types.rs`
: Public parameter, master secret, client id, client secret key, comparison material, ciphertext, and encoded value types.

`setup.rs`
: Setup algorithm and deterministic test setup helpers.

`keygen.rs`
: Per-client key generation from master material.

`encrypt.rs`
: Value encoding and encryption.

`compare.rs`
: Ciphertext comparison API and ordering result conversion.

`encoding.rs`
: Bit decomposition, domain checks, and value normalization.

`hash.rs`
: Domain-separated hashing and random oracle style helpers required by the construction.

`rng.rs`
: RNG traits/helpers so tests can use deterministic RNGs while production callers use OS randomness.

`error.rs`
: A typed error enum for invalid parameters, invalid values, serialization failures, and comparison failures.

## Public API Shape

The concrete internal types should follow the paper, but the high-level API should be close to this:

```rust
use core::cmp::Ordering;

pub struct SecurityParams {
    pub value_bits: u16,
    pub max_clients: u32,
}

pub struct PublicParams;
pub struct MasterSecret;
pub struct ClientId;
pub struct ClientSecretKey;
pub struct CompareMaterial;
pub struct OreCiphertext;

pub fn setup<R: rand_core::CryptoRng + rand_core::RngCore>(
    params: SecurityParams,
    rng: &mut R,
) -> Result<(PublicParams, MasterSecret), OreError>;

pub fn keygen<R: rand_core::CryptoRng + rand_core::RngCore>(
    public: &PublicParams,
    master: &MasterSecret,
    client_id: ClientId,
    rng: &mut R,
) -> Result<ClientSecretKey, OreError>;

pub fn comparison_material(
    public: &PublicParams,
    master: &MasterSecret,
) -> Result<CompareMaterial, OreError>;

pub fn encrypt<R: rand_core::CryptoRng + rand_core::RngCore>(
    public: &PublicParams,
    key: &ClientSecretKey,
    value: u64,
    rng: &mut R,
) -> Result<OreCiphertext, OreError>;

pub fn compare(
    public: &PublicParams,
    material: &CompareMaterial,
    left: &OreCiphertext,
    right: &OreCiphertext,
) -> Result<Ordering, OreError>;
```

If the paper requires per-pair comparison keys rather than one global comparison material, the API should make that explicit:

```rust
pub fn pair_compare_key(
    public: &PublicParams,
    master: &MasterSecret,
    left_client: ClientId,
    right_client: ClientId,
) -> Result<PairCompareKey, OreError>;
```

The implementation plan must resolve this detail from the paper before writing crypto code.

## Dependency Strategy

Start with pure Rust dependencies only:

- `rand_core` for RNG traits.
- `rand_chacha` for deterministic tests.
- `sha2` or `blake3` for domain-separated hashing, depending on the paper's requirements.
- `serde` plus `bincode` or `postcard` for serialization tests.
- `thiserror` for errors.
- Pairing/group crates only after the paper mapping is resolved, likely from the `arkworks` ecosystem if pairings are required.

Avoid C FFI in the first version. If pure Rust pairing dependencies cannot support the construction, document the blocker before changing direction.

## Testing Strategy

Correctness tests should compare encrypted ordering against plaintext ordering:

```rust
for client_a in clients {
    for client_b in clients {
        for x in domain_values {
            for y in domain_values {
                assert_eq!(
                    compare(enc(client_a, x), enc(client_b, y)),
                    x.cmp(&y)
                );
            }
        }
    }
}
```

Required tests:

1. `setup_rejects_invalid_params`
2. `keygen_rejects_unknown_client_id`
3. `encrypt_rejects_value_outside_domain`
4. `same_client_ciphertexts_compare_correctly`
5. `different_client_ciphertexts_compare_correctly`
6. `equal_values_compare_equal_across_clients`
7. `adjacent_values_compare_correctly`
8. `max_value_compares_correctly`
9. `serialization_roundtrip_preserves_comparison`
10. `randomized_encryption_still_compares_correctly`

Property tests can be added after the deterministic unit tests pass.

## Benchmark Strategy

Benchmarks should measure:

- setup time
- client key generation time
- encryption time per value
- comparison time per pair
- sorting time for batches of 100, 1,000, and 10,000 ciphertexts
- serialized ciphertext size
- comparison material size

Benchmark output should be documented before any frontend/server integration decision.

## Implementation Phases

### Phase 1: Paper Mapping

Read the paper carefully and produce `rust/leaderboard-crypto/docs/paper-notes.md` with:

- exact algorithms to implement
- input/output types for each algorithm
- security assumptions
- leakage profile
- parameter choices
- unresolved ambiguities

No crypto code should be written before this mapping is complete.

### Phase 2: Crate Skeleton and Types

Create the crate, define parameter validation, domain encoding, typed errors, serialization, and deterministic test RNG setup.

### Phase 3: Base m-ORE Implementation

Implement the base multi-client ORE construction. Add deterministic known-answer style tests derived from small domains.

### Phase 4: m-H-ORE Implementation

Implement the hardened or improved variant only after base m-ORE correctness and serialization are stable.

### Phase 5: Benchmarks and Integration Notes

Add benchmarks and write guidance for how the app should later consume the crate from:

- browser wasm for client-side encryption
- native Rust service for server-side comparison and leaderboard indexing

## Risks

1. The paper implementation is not open source, so symbol-to-code translation may take longer than expected.
2. Pure Rust pairing dependencies may not match the exact construction as easily as the original C/PBC implementation.
3. Browser wasm may be slow if the construction uses heavy pairing or large integer operations.
4. Order leakage is inherent to the leaderboard feature.
5. Client-side keys do not prevent cheating.
6. Small data domains are vulnerable to inference from global order.

## Open Questions for Implementation

The implementation plan must resolve these before coding algorithms:

1. Does the paper require one global comparison material or per-pair comparison keys?
2. Which exact construction should be implemented first: m-ORE or m-H-ORE?
3. Which algebraic groups and pairing parameters does the paper require?
4. Can those groups be represented with pure Rust crates?
5. What is the smallest domain and client-count parameter set that can exercise the full algorithm in tests?

## Definition of Done for the First Implementation Milestone

The first milestone is complete when:

1. `rust/leaderboard-crypto` exists as a standalone crate.
2. The paper mapping document is written.
3. The crate compiles with stable Rust.
4. Deterministic tests prove cross-client encrypted comparison correctness on a small domain.
5. Serialization round trips do not change comparison behavior.
6. Benchmarks report encryption, comparison, and ciphertext size.
7. README clearly marks the crate as research-grade and unaudited.
