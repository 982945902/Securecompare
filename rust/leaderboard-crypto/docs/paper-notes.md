# Paper Notes: Multi-Client Order-Revealing Encryption

## Source

- Paper: "Towards Practical Multi-Client Order-Revealing Encryption: Improvement and Application"
- Venue: IEEE Transactions on Dependable and Secure Computing, Vol. 21, No. 3, May/June 2024
- Authors: Chunyang Lv, Jianfeng Wang, Xiaofeng Chen, Shifeng Sun, Yali Wang, Saiyu Qi
- Local analysis source: `/tmp/securecompare-ore/multi-client-ore.pdf`
- Extracted text source: `/tmp/securecompare-ore/multi-client-ore.txt`

## Construction Inventory

| Construction | Purpose | Implementation Status |
|--------------|---------|-----------------------|
| DPPH | Deterministic property-preserving hash with predicate `P(x, y) = 1 iff x = y +/- 1` | Mapped from text; formulas in the paper figure still need visual confirmation |
| m-ORE | Base multi-client order-revealing encryption built from DPPH | Mapped from text; Fig. 2 formulas need visual confirmation |
| m-H-ORE | Hybrid/enhanced m-ORE that compares bit length first with small-domain ORE | Mapped from text; Fig. 3 formulas need visual confirmation |
| SD-ORE | Small-domain ORE from Lewi-Wu used by m-H-ORE for bit-length comparison | Mapped from text |

## Preliminaries

The paper uses Type-3 bilinear pairings. It defines multiplicative cyclic groups `G1`, `G2`, and `GT` of prime order `p`, generators `g1 in G1` and `g2 in G2`, and a pairing `e: G1 x G2 -> GT`. The security assumption referenced for the DPPH construction is SXDH.

The extracted text states that the paper uses:

- Type-3 bilinear pairings.
- A PRF `H: {0,1}^lambda x {0,1}^lambda -> Zp` for DPPH.
- A PRF `F: [n] x {0,1}^n -> {0,1}^lambda` for m-ORE encoding.
- For m-H-ORE, additional `F2: {0,1}^lambda x {0,1}^lambda -> {0,1}^lambda` and `H2: {0,1}^lambda x {0,1}^lambda -> Z3` are used by the small-domain ORE component.

Pure Rust implementation will need a Type-3 pairing stack. The first candidate family is `arkworks`, likely using a pairing-friendly curve from `ark-bls12-381` or another curve only after the exact group requirements are confirmed.

## Definition 4: m-ORE Interface

Paper section/page:

- Section II-F, pages 4-5 in the PDF text extraction.

Exact paper algorithms:

- `m-ORE.Setup(1^lambda) -> (msk, qk)`
- `m-ORE.Enc(msk, m) -> c`
- `m-ORE.TGen(qk, m) -> t`
- `m-ORE.Cmp(c, t) -> b in {0,1}`

Meaning:

- `msk` is the master secret key used by the data owner to generate ciphertexts.
- `qk` is the query key sent to authorized users for token generation.
- `c` is a ciphertext generated from `msk`.
- `t` is a token generated from `qk`.
- `Cmp(c, t)` returns `1(m1 > m2)` for ciphertext message `m1` and token message `m2`.

Rust API mapping:

| Algorithm Role | Planned Rust Function |
|----------------|-----------------------|
| Setup | `setup(params: SecurityParams, rng: &mut R) -> Result<(PublicParams, MasterSecret), OreError>` plus query-key output once paper types are finalized |
| Data-owner encryption | `encrypt(public: &PublicParams, key: &ClientSecretKey, value: u64, rng: &mut R) -> Result<OreCiphertext, OreError>` |
| Authorized-user token generation | likely `token(public: &PublicParams, key: &QueryKey, value: u64, rng: &mut R) -> Result<OreToken, OreError>` |
| Comparison | `compare(public: &PublicParams, material: &CompareMaterial, left: &OreCiphertext, right: &OreToken) -> Result<Ordering, OreError>` |

Important mapping correction:

The original design spec used `compare(left: &OreCiphertext, right: &OreCiphertext)`. The paper's m-ORE interface is asymmetric: comparison is between a ciphertext and a token. The implementation API must represent this asymmetry explicitly instead of pretending both sides are the same ciphertext type.

Paper ambiguity:

- The Securecompare leaderboard product wants many users to upload sortable encrypted submissions. The paper's formal m-ORE interface compares a data-owner ciphertext to an authorized-user token. A later application section describes multi-client encrypted database use, but the product API needs a clear submission model: either each leaderboard entry stores both ciphertext and token, or entries are role-specific. This must be resolved before implementing product integration.

## DPPH Mapping

Paper section/page:

- Section III-A, pages 5-6 in the PDF text extraction.

Exact paper algorithms:

- `DPPH.KGen(1^lambda) -> (pp, hk, tk)`
- `DPPH.Hash(hk, x) -> h = (h1, h2, h3)`
- `DPPH.Test(tk, h, h') -> b in {0,1}`

Paper inputs and outputs:

- `pp = (G1, G2, GT, e)`
- `hk = (k1, (k2,1, k2,2))`
- `tk = (g1^(k2,1), g2^(k2,2))`
- `Hash(hk, x)` produces three group elements derived from `H(k1, x)`, `H(k1, x + 1)`, and `H(k1, x - 1)`.
- `Test` evaluates pairing equations and returns `1` if a neighbor predicate is detected.

Implementation notes:

- DPPH preserves the predicate `x = y +/- 1`.
- The paper text extraction contains the high-level formulas, but exact exponent placement must be visually confirmed from the PDF before coding.
- DPPH hash values are deterministic, which is central to reducing m-ORE comparison from `O(n^2)` to `O(n)` pairings.

Rust type mapping:

| Paper Symbol | Planned Rust Type |
|--------------|-------------------|
| `pp` | `PublicParams` or internal `DpphPublicParams` |
| `hk` | internal `DpphHashKey` |
| `tk` | internal `DpphTestKey` |
| `h = (h1, h2, h3)` | internal `DpphHash` |

## m-ORE Construction Mapping

Paper section/page:

- Section IV-B, pages 7-8 in the PDF text extraction.

Exact paper algorithms:

- `m-ORE.Setup`
- `m-ORE.Enc`
- `m-ORE.TGen`
- `m-ORE.Cmp`

Setup mapping:

- Paper input: security parameter `lambda`.
- Paper output: master secret key `msk` and query key `qk`.
- Extracted details:
  - Data owner runs `DPPH.KGen(1^lambda)`.
  - `msk = (k1, (k2,1, k2,2))`, matching the DPPH hash key.
  - Test key contains `(g1^(k2,1), g2^(k2,2))`.
  - Query key is described as `qk = (k1, g2^(k2,2))`.

Encryption mapping:

- Paper input: `msk`, message `m in {0,1}^n`.
- Paper output: ciphertext `c`.
- Extracted details:
  - Encode message `m` bit-by-bit using PRF `F` and `msk`.
  - For each encoded value `u_i`, run `DPPH.Hash(hk, u_i)`.
  - Use only the first DPPH hash component `h1` as ciphertext element `v_i`.
  - Choose a random permutation `pi` and permute ciphertext elements.

Token generation mapping:

- Paper input: `qk`, message `m`.
- Paper output: token `t`.
- Extracted details:
  - Encode the message in the same way as encryption.
  - The authorized user cannot compute the full DPPH hash because it lacks `msk`.
  - It can compute the last two DPPH hash components `h2` and `h3` directly using `qk`.
  - Choose a fresh random permutation and permute token elements.

Comparison mapping:

- Paper input: ciphertext `c`, token `t`.
- Paper output: bit `1(m_ciphertext > m_token)`.
- Extracted details:
  - Server uses elements from `c` and `t`.
  - It repeatedly runs `DPPH.Test` to identify a pair of indexes that match the neighbor predicate.
  - It outputs ordering based on the matching indexes.
  - Remark 2 states comparison can be reduced to at most `3n` pairings by reusing pairing results.

Paper ambiguity:

- Fig. 2 contains exact ciphertext/token tuple structure, random factors, and compare equations. Text extraction references `c=(c0,c1,...,cn)` and `t=(t0,(t1,1,t1,2),...,(tn,1,tn,2))`, but not every exponent/randomizer is reliably extracted. Implementation must visually verify Fig. 2 before writing crypto internals.

## m-H-ORE Construction Mapping

Paper section/page:

- Section V-B, pages 10-11 in the PDF text extraction.

Exact paper algorithms:

- `m-H-ORE.Setup`
- `m-H-ORE.Enc`
- `m-H-ORE.TGen`
- `m-H-ORE.Cmp`

Setup mapping:

- Paper input: security parameter `lambda`.
- Paper output: master key `msk` and query key `qk`.
- Extracted details:
  - Run `DPPH.KGen` as in base `m-ORE`.
  - Compute small-domain ORE secret key `sk = (k1, pi)` for bit-length comparison.
  - Master key is `msk = (hk, sk)`.
  - Query key is `qk = (sk, g2^(k2,2))`.
  - `qk` is sent to authorized users.

Encryption mapping:

- Paper input: `msk`, message `m`.
- Paper output: hybrid ciphertext.
- Extracted details:
  - Compute the base m-ORE ciphertext components `(c0, c1, ..., cn)`.
  - Set `x = BitLen(m)`.
  - Run `SD-ORE.EncR(sk, x)` to obtain right ciphertext `ctR`.
  - Output `c = (ctR, c0, c1, ..., cn)`.

Token generation mapping:

- Paper input: `qk`, message `m`.
- Paper output: hybrid token.
- Extracted details:
  - Compute base m-ORE token components `(t0, (t1,1,t1,2), ..., (tn,1,tn,2))`.
  - Run `SD-ORE.EncL(sk, BitLen(m))` to obtain left ciphertext `ctL`.
  - Output `t = (ctL, t0, (t1,1,t1,2), ..., (tn,1,tn,2))`.

Comparison mapping:

- Paper input: hybrid ciphertext `c`, hybrid token `t`.
- Paper output: order bit.
- Extracted details:
  - First run `SD-ORE.Cmp(ctL, ctR)`.
  - If bit lengths differ, return that ordering.
  - If bit lengths are equal, run the base `m-ORE.Cmp`.

Leakage:

- m-H-ORE leaks the order of bit lengths in addition to base m-ORE leakage.
- The paper calls this a trade-off between efficiency and security.

Paper ambiguity:

- Fig. 3 contains exact tuple syntax and should be visually confirmed before implementation.

## Leakage Mapping

Base m-ORE leakage, as extracted from Section IV-C:

- Message ordering.
- For any three messages `m_i`, `m_j`, `m_k`, whether two messages' most significant differing bit positions are the same.

The extracted leakage function is:

```text
Lf(m1, ..., mq) = {
  1(msdb(mi, mj) = msdb(mi, mk)),
  1(mi < mj) | for all 1 <= i,j,k <= q
}
```

m-H-ORE leakage adds bit-length order leakage:

```text
1(BitLen(mi) < BitLen(mj))
```

Implementation docs must describe both leakages plainly.

## Parameter Mapping

| Paper Symbol | Meaning | Planned Rust Type |
|--------------|---------|-------------------|
| `lambda` | Security parameter | likely enum/struct field after curve/hash selection |
| `n` | Message bit length | `u16` in `SecurityParams::value_bits` |
| `N` | Small-domain ORE domain for bit length in m-H-ORE | derived from `value_bits` |
| `m` | Message | `u64` for the first implementation domain |
| `msk` | Master secret key | `MasterSecret` plus internal DPPH and SD-ORE keys |
| `qk` | Query key | new `QueryKey` type, not yet in the original design spec |
| `c` | Ciphertext | `OreCiphertext` |
| `t` | Token | new `OreToken` type |

## Pure Rust Dependency Decision

| Requirement | Candidate Crate | Decision |
|-------------|-----------------|----------|
| RNG traits | `rand_core` | Use |
| Deterministic test RNG | `rand_chacha` | Use |
| Serialization | `serde` | Use |
| Errors | `thiserror` | Use |
| Pairing/group operations | `arkworks` family | Investigate after Fig. 2/Fig. 3 confirmation |
| PRF/hash to field | `sha2`, `blake3`, or `ark-ff` field hash adapter | Decide after exact curve/field selection |
| SD-ORE | Pure Rust internal implementation | Required for m-H-ORE |

## Blocking Questions Before Crypto Internals

1. Verify exact Fig. 2 ciphertext and token tuple structure.
2. Verify exact Fig. 2 randomization factors `r`, `r'`, `r1`, `r2`, and exponent placement.
3. Verify whether the practical leaderboard API should store both `OreCiphertext` and `OreToken` per submission or use role-specific records.
4. Select a pure Rust Type-3 pairing curve compatible with the construction.
5. Define a secure PRF-to-field mapping for `H`.
6. Decide whether to implement base m-ORE first, then m-H-ORE, or scaffold both but only complete base m-ORE first.
