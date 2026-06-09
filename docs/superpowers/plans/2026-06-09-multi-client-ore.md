# Multi-Client ORE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone pure Rust research crate for strict multi-client ORE / m-H-ORE paper reproduction.

**Architecture:** Add `rust/leaderboard-crypto` as an independent Rust crate beside the existing `wasm/mpz-compare` crate. The first milestone produces paper mapping docs, crate skeleton, typed public API, deterministic tests, serialization tests, and benchmark scaffolding before any product integration.

**Tech Stack:** Rust stable, `rand_core`, `rand_chacha`, `serde`, `thiserror`, pure Rust crypto dependencies selected after paper mapping.

---

## File Structure

Create:

- `rust/leaderboard-crypto/Cargo.toml` - crate metadata and dependencies.
- `rust/leaderboard-crypto/README.md` - research status, warning, and usage boundaries.
- `rust/leaderboard-crypto/docs/paper-notes.md` - algorithm mapping from the paper.
- `rust/leaderboard-crypto/docs/security-model.md` - leakage and trust model.
- `rust/leaderboard-crypto/docs/implementation-notes.md` - dependency decisions and unresolved paper details.
- `rust/leaderboard-crypto/src/lib.rs` - public module exports.
- `rust/leaderboard-crypto/src/error.rs` - `OreError`.
- `rust/leaderboard-crypto/src/params.rs` - `SecurityParams` and validation.
- `rust/leaderboard-crypto/src/types.rs` - public params, secrets, keys, ciphertexts, comparison material.
- `rust/leaderboard-crypto/src/encoding.rs` - value-domain checks and bit decomposition.
- `rust/leaderboard-crypto/src/rng.rs` - deterministic test RNG helper.
- `rust/leaderboard-crypto/src/hash.rs` - domain-separated hash adapters tied to paper notes.
- `rust/leaderboard-crypto/src/setup.rs` - setup API boundary.
- `rust/leaderboard-crypto/src/keygen.rs` - keygen API boundary.
- `rust/leaderboard-crypto/src/encrypt.rs` - encrypt API boundary.
- `rust/leaderboard-crypto/src/compare.rs` - compare API boundary.
- `rust/leaderboard-crypto/tests/params.rs` - validation tests.
- `rust/leaderboard-crypto/tests/encoding.rs` - encoding tests.
- `rust/leaderboard-crypto/tests/api_boundaries.rs` - explicit tests proving crypto APIs fail closed until paper mapping is implemented.
- `rust/leaderboard-crypto/benches/ore_bench.rs` - benchmark harness scaffold.
- Modify `.gitignore` - add `rust/leaderboard-crypto/target/`.

Do not modify:

- `wasm/mpz-compare/**`
- `src/app/**`
- `server/**`
- existing Invite PK protocol files

## Task 1: Paper Mapping Document

**Files:**

- Create: `rust/leaderboard-crypto/docs/paper-notes.md`
- Create: `rust/leaderboard-crypto/docs/security-model.md`
- Create: `rust/leaderboard-crypto/docs/implementation-notes.md`

- [ ] **Step 1: Fetch the paper PDF for local analysis**

Run:

```bash
mkdir -p /tmp/securecompare-ore
curl -L "https://web.xidian.edu.cn/jfwang/files/69046c614f53f.pdf" -o /tmp/securecompare-ore/multi-client-ore.pdf
ls -lh /tmp/securecompare-ore/multi-client-ore.pdf
```

Expected: the PDF exists and is larger than 100 KB.

- [ ] **Step 2: Extract text from the PDF**

Run:

```bash
pdftotext /tmp/securecompare-ore/multi-client-ore.pdf /tmp/securecompare-ore/multi-client-ore.txt
rg -n "Setup|KeyGen|Encrypt|Compare|m-ORE|m-H-ORE|DPPH|algorithm" /tmp/securecompare-ore/multi-client-ore.txt
```

Expected: text extraction succeeds and search results show algorithm sections.

- [ ] **Step 3: Write paper notes**

Create `rust/leaderboard-crypto/docs/paper-notes.md` with this structure:

```markdown
# Paper Notes: Multi-Client Order-Revealing Encryption

## Source

- Paper: "Towards Practical Multi-Client Order-Revealing Encryption: Improvement and Application"
- Venue: IEEE Transactions on Dependable and Secure Computing
- Local analysis source: `/tmp/securecompare-ore/multi-client-ore.pdf`

## Construction Inventory

| Construction | Purpose | Implementation Status |
|--------------|---------|-----------------------|
| m-ORE | Base multi-client order-revealing encryption | Not implemented |
| m-H-ORE | Improved / hardened multi-client ORE variant | Not implemented |
| DPPH | Dependency to resolve from paper | Not implemented |

## Algorithm Mapping

Create one subsection for each paper algorithm discovered in the extracted text. Each subsection must include the paper section/page, exact paper input names, exact paper output names, planned Rust function, and implementation notes. Do not leave any mapping item empty. If the paper omits a detail, write `Paper ambiguity:` followed by the exact missing detail and page/section reference.

Required planned Rust functions to map:

| Algorithm Role | Planned Rust Function |
|----------------|-----------------------|
| Setup | `setup(params: SecurityParams, rng: &mut R) -> Result<(PublicParams, MasterSecret), OreError>` |
| Client key generation | `keygen(public: &PublicParams, master: &MasterSecret, client_id: ClientId, rng: &mut R) -> Result<ClientSecretKey, OreError>` |
| Global comparison material | `comparison_material(public: &PublicParams, master: &MasterSecret) -> Result<CompareMaterial, OreError>` |
| Per-pair comparison material, if required | `pair_compare_key(public: &PublicParams, master: &MasterSecret, left_client: ClientId, right_client: ClientId) -> Result<PairCompareKey, OreError>` |
| Encryption | `encrypt(public: &PublicParams, key: &ClientSecretKey, value: u64, rng: &mut R) -> Result<OreCiphertext, OreError>` |
| Comparison | `compare(public: &PublicParams, material: &CompareMaterial, left: &OreCiphertext, right: &OreCiphertext) -> Result<Ordering, OreError>` |

## Parameter Mapping

| Paper Symbol | Meaning | Rust Type |
|--------------|---------|-----------|
| n | Value bit length | `u16` in `SecurityParams::value_bits` |
| N | Maximum clients | `u32` in `SecurityParams::max_clients` |

## Pure Rust Dependency Decision

| Requirement | Candidate Crate | Decision |
|-------------|-----------------|----------|
| RNG traits | `rand_core` | Use |
| Deterministic test RNG | `rand_chacha` | Use |
| Serialization | `serde` | Use |
| Pairing/group operations | `arkworks` family | Decide after mapping exact groups |
| Hashing | `sha2` or `blake3` | Decide after mapping random oracle requirements |

## Leakage Notes

- Server learns relative order.
- Server may learn equality if comparison returns equality.
- Additional leakage must match the paper's formal leakage discussion.
- Small value domains such as age and height remain vulnerable to inference from order.

## Blocking Questions

1. Does the paper require global comparison material or per-pair comparison keys?
2. Which exact group and pairing parameters are required?
3. Is DPPH required for base m-ORE, m-H-ORE, or both?
4. Which construction should be implemented first based on algorithm completeness?
```

- [ ] **Step 4: Write security model doc**

Create `rust/leaderboard-crypto/docs/security-model.md`:

```markdown
# Security Model

This crate targets encrypted sortable leaderboard values. It is not an MPC protocol and does not provide MPC-equivalent privacy.

## Trusted Parties

The scheme assumes a setup authority that generates master material and issues per-client keys. Clients do not generate unrelated private keys.

## Server Visibility

The leaderboard service receives ciphertexts and comparison material. It can compare encrypted values and therefore learns the ranking relation.

## Expected Leakage

- Relative order between ciphertexts.
- Equality if the comparison API returns `Ordering::Equal`.
- Submission metadata such as account id, category, timestamp, and IP-level transport metadata.
- Any construction-specific leakage identified in `paper-notes.md`.

## Non-Goals

- Preventing users from lying about submitted values.
- Hiding the final leaderboard order from the leaderboard service.
- Protecting tiny domains from distributional inference once order is known.
```

- [ ] **Step 5: Write implementation notes**

Create `rust/leaderboard-crypto/docs/implementation-notes.md`:

```markdown
# Implementation Notes

## Policy

This crate is a pure Rust reproduction target. Do not add C FFI, PBC, GMP, or OpenSSL bindings without documenting why pure Rust cannot represent the paper construction.

## First Milestone

The first milestone is allowed to define API boundaries and fail-closed stubs. It must not include a toy OPE implementation that could be mistaken for the target construction.

## Fail-Closed Rule

Until the paper construction is implemented, public crypto entry points must return `OreError::AlgorithmNotImplemented`.

## Integration Boundary

Do not import this crate from the frontend or server until correctness tests pass for cross-client encrypted comparison.
```

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add rust/leaderboard-crypto/docs/paper-notes.md rust/leaderboard-crypto/docs/security-model.md rust/leaderboard-crypto/docs/implementation-notes.md
git commit -m "Add multi-client ORE paper mapping notes"
```

Expected: commit succeeds.

## Task 2: Crate Skeleton and Fail-Closed API

**Files:**

- Create: `rust/leaderboard-crypto/Cargo.toml`
- Create: `rust/leaderboard-crypto/README.md`
- Create: `rust/leaderboard-crypto/src/lib.rs`
- Create: `rust/leaderboard-crypto/src/error.rs`
- Create: `rust/leaderboard-crypto/src/params.rs`
- Create: `rust/leaderboard-crypto/src/types.rs`
- Create: `rust/leaderboard-crypto/src/setup.rs`
- Create: `rust/leaderboard-crypto/src/keygen.rs`
- Create: `rust/leaderboard-crypto/src/encrypt.rs`
- Create: `rust/leaderboard-crypto/src/compare.rs`
- Modify: `.gitignore`

- [ ] **Step 1: Create crate manifest**

Create `rust/leaderboard-crypto/Cargo.toml`:

```toml
[package]
name = "securecompare-leaderboard-crypto"
version = "0.1.0"
edition = "2021"
publish = false
license = "UNLICENSED"

[lib]
name = "securecompare_leaderboard_crypto"
path = "src/lib.rs"

[dependencies]
rand_core = "0.6"
serde = { version = "1", features = ["derive"] }
thiserror = "2"

[dev-dependencies]
rand_chacha = "0.3"

[features]
default = []
```

- [ ] **Step 2: Create README**

Create `rust/leaderboard-crypto/README.md`:

```markdown
# Securecompare Leaderboard Crypto

Pure Rust research crate for reproducing the multi-client ORE / m-H-ORE construction from the IEEE TDSC paper "Towards Practical Multi-Client Order-Revealing Encryption: Improvement and Application."

## Status

This crate is not production-ready, not audited, and not yet integrated with Securecompare's frontend or server.

## Scope

- Multi-client encrypted sortable leaderboard values.
- Asynchronous encrypted submissions.
- Server-side encrypted comparison.

## Non-Scope

- Invite PK MPC.
- Anti-cheat.
- Frontend UI.
- Production key management.
```

- [ ] **Step 3: Create typed error**

Create `rust/leaderboard-crypto/src/error.rs`:

```rust
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum OreError {
    #[error("algorithm not implemented: {0}")]
    AlgorithmNotImplemented(&'static str),

    #[error("invalid security parameters: {0}")]
    InvalidParams(&'static str),

    #[error("client id {0} is outside the configured client domain")]
    InvalidClientId(u32),

    #[error("value {value} exceeds the configured domain max {max}")]
    ValueOutOfDomain { value: u64, max: u64 },
}
```

- [ ] **Step 4: Create parameters**

Create `rust/leaderboard-crypto/src/params.rs`:

```rust
use serde::{Deserialize, Serialize};

use crate::error::OreError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct SecurityParams {
    pub value_bits: u16,
    pub max_clients: u32,
}

impl SecurityParams {
    pub const MIN_VALUE_BITS: u16 = 1;
    pub const MAX_VALUE_BITS: u16 = 63;

    pub fn new(value_bits: u16, max_clients: u32) -> Result<Self, OreError> {
        let params = Self {
            value_bits,
            max_clients,
        };
        params.validate()?;
        Ok(params)
    }

    pub fn validate(self) -> Result<(), OreError> {
        if self.value_bits < Self::MIN_VALUE_BITS {
            return Err(OreError::InvalidParams("value_bits must be at least 1"));
        }
        if self.value_bits > Self::MAX_VALUE_BITS {
            return Err(OreError::InvalidParams("value_bits must be at most 63"));
        }
        if self.max_clients == 0 {
            return Err(OreError::InvalidParams("max_clients must be greater than 0"));
        }
        Ok(())
    }

    pub fn max_value(self) -> u64 {
        (1u64 << self.value_bits) - 1
    }
}
```

- [ ] **Step 5: Create core types**

Create `rust/leaderboard-crypto/src/types.rs`:

```rust
use serde::{Deserialize, Serialize};

use crate::{error::OreError, params::SecurityParams};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ClientId(pub u32);

impl ClientId {
    pub fn validate(self, params: SecurityParams) -> Result<(), OreError> {
        if self.0 >= params.max_clients {
            return Err(OreError::InvalidClientId(self.0));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PublicParams {
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MasterSecret {
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClientSecretKey {
    pub client_id: ClientId,
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompareMaterial {
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OreCiphertext {
    pub client_id: ClientId,
    pub security: SecurityParams,
    pub components: Vec<Vec<u8>>,
}
```

- [ ] **Step 6: Create fail-closed API modules**

Create `rust/leaderboard-crypto/src/setup.rs`:

```rust
use rand_core::{CryptoRng, RngCore};

use crate::{error::OreError, params::SecurityParams, types::{CompareMaterial, MasterSecret, PublicParams}};

pub fn setup<R: CryptoRng + RngCore>(
    params: SecurityParams,
    _rng: &mut R,
) -> Result<(PublicParams, MasterSecret), OreError> {
    params.validate()?;
    Err(OreError::AlgorithmNotImplemented("m-ORE setup"))
}

pub fn comparison_material(
    _public: &PublicParams,
    _master: &MasterSecret,
) -> Result<CompareMaterial, OreError> {
    Err(OreError::AlgorithmNotImplemented("m-ORE comparison material"))
}
```

Create `rust/leaderboard-crypto/src/keygen.rs`:

```rust
use rand_core::{CryptoRng, RngCore};

use crate::{error::OreError, types::{ClientId, ClientSecretKey, MasterSecret, PublicParams}};

pub fn keygen<R: CryptoRng + RngCore>(
    public: &PublicParams,
    _master: &MasterSecret,
    client_id: ClientId,
    _rng: &mut R,
) -> Result<ClientSecretKey, OreError> {
    client_id.validate(public.security)?;
    Err(OreError::AlgorithmNotImplemented("m-ORE keygen"))
}
```

Create `rust/leaderboard-crypto/src/encrypt.rs`:

```rust
use rand_core::{CryptoRng, RngCore};

use crate::{encoding::validate_value, error::OreError, types::{ClientSecretKey, OreCiphertext, PublicParams}};

pub fn encrypt<R: CryptoRng + RngCore>(
    public: &PublicParams,
    key: &ClientSecretKey,
    value: u64,
    _rng: &mut R,
) -> Result<OreCiphertext, OreError> {
    validate_value(public.security, value)?;
    key.client_id.validate(public.security)?;
    Err(OreError::AlgorithmNotImplemented("m-ORE encrypt"))
}
```

Create `rust/leaderboard-crypto/src/compare.rs`:

```rust
use core::cmp::Ordering;

use crate::{error::OreError, types::{CompareMaterial, OreCiphertext, PublicParams}};

pub fn compare(
    _public: &PublicParams,
    _material: &CompareMaterial,
    _left: &OreCiphertext,
    _right: &OreCiphertext,
) -> Result<Ordering, OreError> {
    Err(OreError::AlgorithmNotImplemented("m-ORE compare"))
}
```

- [ ] **Step 7: Create lib exports**

Create `rust/leaderboard-crypto/src/lib.rs`:

```rust
pub mod compare;
pub mod encoding;
pub mod encrypt;
pub mod error;
pub mod keygen;
pub mod params;
pub mod setup;
pub mod types;

pub use compare::compare;
pub use encrypt::encrypt;
pub use error::OreError;
pub use keygen::keygen;
pub use params::SecurityParams;
pub use setup::{comparison_material, setup};
pub use types::{
    ClientId, ClientSecretKey, CompareMaterial, MasterSecret, OreCiphertext, PublicParams,
};
```

- [ ] **Step 8: Update gitignore**

Append to `.gitignore`:

```gitignore
rust/leaderboard-crypto/target/
```

- [ ] **Step 9: Run cargo check**

Run:

```bash
cargo +stable check
```

from `rust/leaderboard-crypto`.

Expected: crate compiles.

- [ ] **Step 10: Commit Task 2**

Run:

```bash
git add .gitignore rust/leaderboard-crypto
git commit -m "Create leaderboard crypto Rust crate skeleton"
```

Expected: commit succeeds.

## Task 3: Encoding and Validation Tests

**Files:**

- Create: `rust/leaderboard-crypto/src/encoding.rs`
- Create: `rust/leaderboard-crypto/tests/params.rs`
- Create: `rust/leaderboard-crypto/tests/encoding.rs`

- [ ] **Step 1: Create encoding helpers**

Create `rust/leaderboard-crypto/src/encoding.rs`:

```rust
use crate::{error::OreError, params::SecurityParams};

pub fn validate_value(params: SecurityParams, value: u64) -> Result<(), OreError> {
    let max = params.max_value();
    if value > max {
        return Err(OreError::ValueOutOfDomain { value, max });
    }
    Ok(())
}

pub fn bits_msb(params: SecurityParams, value: u64) -> Result<Vec<bool>, OreError> {
    validate_value(params, value)?;
    let mut bits = Vec::with_capacity(params.value_bits as usize);
    for shift in (0..params.value_bits).rev() {
        bits.push(((value >> shift) & 1) == 1);
    }
    Ok(bits)
}
```

- [ ] **Step 2: Create parameter tests**

Create `rust/leaderboard-crypto/tests/params.rs`:

```rust
use securecompare_leaderboard_crypto::{OreError, SecurityParams};

#[test]
fn accepts_valid_params() {
    let params = SecurityParams::new(16, 100).expect("valid params");
    assert_eq!(params.value_bits, 16);
    assert_eq!(params.max_clients, 100);
    assert_eq!(params.max_value(), 65_535);
}

#[test]
fn rejects_zero_value_bits() {
    let err = SecurityParams::new(0, 100).unwrap_err();
    assert_eq!(err, OreError::InvalidParams("value_bits must be at least 1"));
}

#[test]
fn rejects_too_many_value_bits_for_u64_domain() {
    let err = SecurityParams::new(64, 100).unwrap_err();
    assert_eq!(err, OreError::InvalidParams("value_bits must be at most 63"));
}

#[test]
fn rejects_zero_clients() {
    let err = SecurityParams::new(16, 0).unwrap_err();
    assert_eq!(err, OreError::InvalidParams("max_clients must be greater than 0"));
}
```

- [ ] **Step 3: Create encoding tests**

Create `rust/leaderboard-crypto/tests/encoding.rs`:

```rust
use securecompare_leaderboard_crypto::{encoding::{bits_msb, validate_value}, OreError, SecurityParams};

#[test]
fn validates_values_inside_domain() {
    let params = SecurityParams::new(4, 2).unwrap();
    assert_eq!(validate_value(params, 0), Ok(()));
    assert_eq!(validate_value(params, 15), Ok(()));
}

#[test]
fn rejects_values_outside_domain() {
    let params = SecurityParams::new(4, 2).unwrap();
    assert_eq!(
        validate_value(params, 16),
        Err(OreError::ValueOutOfDomain { value: 16, max: 15 })
    );
}

#[test]
fn decomposes_bits_most_significant_bit_first() {
    let params = SecurityParams::new(4, 2).unwrap();
    assert_eq!(bits_msb(params, 0b1010).unwrap(), vec![true, false, true, false]);
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
cargo +stable test
```

from `rust/leaderboard-crypto`.

Expected: all parameter and encoding tests pass.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add rust/leaderboard-crypto/src/encoding.rs rust/leaderboard-crypto/tests/params.rs rust/leaderboard-crypto/tests/encoding.rs
git commit -m "Add leaderboard crypto validation tests"
```

Expected: commit succeeds.

## Task 4: Fail-Closed API Tests

**Files:**

- Create: `rust/leaderboard-crypto/src/rng.rs`
- Modify: `rust/leaderboard-crypto/src/lib.rs`
- Create: `rust/leaderboard-crypto/tests/api_boundaries.rs`

- [ ] **Step 1: Add deterministic RNG helper**

Create `rust/leaderboard-crypto/src/rng.rs`:

```rust
#[cfg(test)]
pub fn test_rng() -> rand_chacha::ChaCha20Rng {
    use rand_chacha::rand_core::SeedableRng;
    rand_chacha::ChaCha20Rng::from_seed([7u8; 32])
}
```

Modify `rust/leaderboard-crypto/src/lib.rs` to include:

```rust
pub mod rng;
```

- [ ] **Step 2: Add fail-closed API tests**

Create `rust/leaderboard-crypto/tests/api_boundaries.rs`:

```rust
use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{
    encrypt, keygen, setup, ClientId, ClientSecretKey, OreError, PublicParams, SecurityParams,
};

fn rng() -> ChaCha20Rng {
    ChaCha20Rng::from_seed([9u8; 32])
}

#[test]
fn setup_validates_params_then_fails_closed() {
    let mut rng = rng();
    let params = SecurityParams::new(8, 4).unwrap();
    let err = setup(params, &mut rng).unwrap_err();
    assert_eq!(err, OreError::AlgorithmNotImplemented("m-ORE setup"));
}

#[test]
fn keygen_validates_client_id_then_fails_closed() {
    let mut rng = rng();
    let params = SecurityParams::new(8, 4).unwrap();
    let public = PublicParams { security: params };
    let master = securecompare_leaderboard_crypto::MasterSecret { security: params };

    let invalid = keygen(&public, &master, ClientId(4), &mut rng).unwrap_err();
    assert_eq!(invalid, OreError::InvalidClientId(4));

    let not_implemented = keygen(&public, &master, ClientId(3), &mut rng).unwrap_err();
    assert_eq!(not_implemented, OreError::AlgorithmNotImplemented("m-ORE keygen"));
}

#[test]
fn encrypt_validates_value_and_client_then_fails_closed() {
    let mut rng = rng();
    let params = SecurityParams::new(4, 2).unwrap();
    let public = PublicParams { security: params };
    let key = ClientSecretKey {
        client_id: ClientId(1),
        security: params,
    };

    let out_of_domain = encrypt(&public, &key, 16, &mut rng).unwrap_err();
    assert_eq!(
        out_of_domain,
        OreError::ValueOutOfDomain { value: 16, max: 15 }
    );

    let not_implemented = encrypt(&public, &key, 15, &mut rng).unwrap_err();
    assert_eq!(not_implemented, OreError::AlgorithmNotImplemented("m-ORE encrypt"));
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
cargo +stable test
```

from `rust/leaderboard-crypto`.

Expected: all tests pass.

- [ ] **Step 4: Commit Task 4**

Run:

```bash
git add rust/leaderboard-crypto/src/rng.rs rust/leaderboard-crypto/src/lib.rs rust/leaderboard-crypto/tests/api_boundaries.rs
git commit -m "Add fail-closed leaderboard crypto API tests"
```

Expected: commit succeeds.

## Task 5: Benchmark Scaffold and Final Verification

**Files:**

- Create: `rust/leaderboard-crypto/benches/ore_bench.rs`
- Modify: `rust/leaderboard-crypto/Cargo.toml`

- [ ] **Step 1: Add benchmark dependency and bench target**

Modify `rust/leaderboard-crypto/Cargo.toml`:

```toml
[dev-dependencies]
criterion = "0.5"
rand_chacha = "0.3"

[[bench]]
name = "ore_bench"
harness = false
```

- [ ] **Step 2: Add benchmark scaffold**

Create `rust/leaderboard-crypto/benches/ore_bench.rs`:

```rust
use criterion::{criterion_group, criterion_main, Criterion};
use securecompare_leaderboard_crypto::SecurityParams;

fn parameter_validation(c: &mut Criterion) {
    c.bench_function("security_params_new", |b| {
        b.iter(|| SecurityParams::new(32, 10_000).unwrap())
    });
}

criterion_group!(benches, parameter_validation);
criterion_main!(benches);
```

- [ ] **Step 3: Run final verification**

Run:

```bash
cargo +stable fmt --check
cargo +stable test
cargo +stable bench --no-run
```

from `rust/leaderboard-crypto`.

Expected: formatting passes, tests pass, benchmark target compiles.

- [ ] **Step 4: Commit Task 5**

Run:

```bash
git add rust/leaderboard-crypto/Cargo.toml rust/leaderboard-crypto/benches/ore_bench.rs
git commit -m "Add leaderboard crypto benchmark scaffold"
```

Expected: commit succeeds.

## Plan Self-Review

- Spec coverage: This plan covers the first implementation milestone from `docs/superpowers/specs/2026-06-09-multi-client-ore-design.md`: standalone crate path, paper mapping docs, fail-closed API, parameter validation, test scaffolding, and benchmark scaffolding.
- Deliberate deferral: It does not implement m-ORE cryptographic internals yet because the approved design requires paper mapping before crypto code.
- Type consistency: The same names are used across planned files: `SecurityParams`, `OreError`, `ClientId`, `PublicParams`, `MasterSecret`, `ClientSecretKey`, `CompareMaterial`, and `OreCiphertext`.
