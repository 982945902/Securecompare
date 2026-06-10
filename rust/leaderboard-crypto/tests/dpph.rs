use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::dpph;

fn rng(seed: u8) -> ChaCha20Rng {
    ChaCha20Rng::from_seed([seed; 32])
}

#[test]
fn hash_is_deterministic_for_same_key_and_value() {
    let mut rng = rng(10);
    let (_, hash_key, _) = dpph::kgen(&mut rng);

    assert_eq!(dpph::hash(&hash_key, 42), dpph::hash(&hash_key, 42));
}

#[test]
fn test_accepts_neighboring_values() {
    let mut rng = rng(11);
    let (_, hash_key, test_key) = dpph::kgen(&mut rng);

    for value in -8..=8 {
        let left = dpph::hash(&hash_key, value);
        let right_plus = dpph::hash(&hash_key, value + 1);
        let right_minus = dpph::hash(&hash_key, value - 1);

        assert!(dpph::test(&test_key, &left, &right_plus));
        assert!(dpph::test(&test_key, &left, &right_minus));
    }
}

#[test]
fn test_rejects_equal_and_non_neighboring_values() {
    let mut rng = rng(12);
    let (_, hash_key, test_key) = dpph::kgen(&mut rng);

    let left = dpph::hash(&hash_key, 7);
    assert!(!dpph::test(&test_key, &left, &dpph::hash(&hash_key, 7)));
    assert!(!dpph::test(&test_key, &left, &dpph::hash(&hash_key, 9)));
    assert!(!dpph::test(&test_key, &left, &dpph::hash(&hash_key, -3)));
}
