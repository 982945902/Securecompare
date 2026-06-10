# Implementation Notes

## Policy

This crate is a pure Rust reproduction target. Do not add C FFI, PBC, GMP, or OpenSSL bindings without documenting why pure Rust cannot represent the paper construction.

## First Milestone

The first milestone is allowed to define API boundaries and fail-closed stubs. It must not include a toy OPE implementation that could be mistaken for the target construction.

## Fail-Closed Rule

Until the paper construction is implemented, public crypto entry points must return `OreError::AlgorithmNotImplemented`.

## API Correction From Paper Mapping

The original design sketch used `compare(ciphertext, ciphertext)`. Paper mapping shows the core m-ORE interface is asymmetric:

```text
m-ORE.Enc(msk, m1)  -> ciphertext c
m-ORE.TGen(qk, m2)  -> token t
m-ORE.Cmp(c, t)     -> 1(m1 > m2)
```

The crate must therefore introduce an `OreToken` or `QueryToken` type before crypto internals are implemented.

## Integration Boundary

Do not import this crate from the frontend or server until correctness tests pass for cross-client encrypted comparison.

## Visual Verification Needed

PDF text extraction captured the surrounding prose for Fig. 2 and Fig. 3, but the exact tuple formulas and exponent placement are not reliable enough for implementation. Before writing DPPH or m-ORE internals, visually inspect:

- Fig. 2: base `m-ORE` construction.
- Fig. 3: `m-H-ORE` construction.
- DPPH formulas in Section III-A.

## Implementation Order

1. Define paper-faithful asymmetric API: setup, encrypt, token generation, compare.
2. Add parameter and encoding validation.
3. Add fail-closed stubs.
4. Implement DPPH after curve and field selection.
5. Implement base m-ORE.
6. Implement m-H-ORE after base m-ORE is correct and benchmarked.
