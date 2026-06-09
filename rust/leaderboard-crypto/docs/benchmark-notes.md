# Benchmark Notes

Benchmarks were collected on the local development machine with:

```bash
cargo +stable bench --bench ore_bench -- --sample-size 10
```

These numbers are early engineering measurements, not final performance claims.

## 2026-06-09 Initial Results

| Benchmark | Observed Time |
|-----------|---------------|
| `security_params_new` | about 0.4 ns |
| `sd_ore_compare_domain_64` | about 376-420 ns |
| `dpph_test_neighbor` | about 3.1-4.0 ms |
| `m_ore_compare_8_bits` | about 88-97 ms |
| `m_h_ore_compare_different_bit_length` | about 351-361 ns |
| `m_h_ore_compare_same_bit_length` | about 121 ms |

## Interpretation

`m-H-ORE` has a very fast path when bit lengths differ, because comparison is handled by the small-domain ORE bit-length layer. When bit lengths are equal, it falls back to base `m-ORE`, which uses pairing-heavy comparison and is currently expensive.

For Securecompare leaderboard design, this means:

- `m-H-ORE` is promising when values naturally span many bit lengths.
- For small bounded domains where many users share the same bit length, the fallback path may dominate.
- Server-side ranking should benchmark realistic category distributions before product integration.
- Pairing comparison should be optimized before any large leaderboard deployment.
