use core::cmp::Ordering;

use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{sd_ore, OreError};

fn rng(seed: u8) -> ChaCha20Rng {
    ChaCha20Rng::from_seed([seed; 32])
}

#[test]
fn setup_rejects_empty_domain() {
    let mut rng = rng(1);
    let err = sd_ore::SdOreSecretKey::setup(0, &mut rng).unwrap_err();
    assert_eq!(
        err,
        OreError::InvalidParams("SD-ORE domain_size must be greater than 0")
    );
}

#[test]
fn rejects_values_outside_one_based_domain() {
    let mut rng = rng(2);
    let key = sd_ore::SdOreSecretKey::setup(4, &mut rng).unwrap();

    assert_eq!(
        key.enc_left(0).unwrap_err(),
        OreError::ValueOutOfDomain { value: 0, max: 4 }
    );
    assert_eq!(
        key.enc_right(5, &mut rng).unwrap_err(),
        OreError::ValueOutOfDomain { value: 5, max: 4 }
    );
}

#[test]
fn compares_left_and_right_ciphertexts_for_full_domain() {
    let mut rng = rng(3);
    let key = sd_ore::SdOreSecretKey::setup(16, &mut rng).unwrap();

    for left_value in 1..=16 {
        let left = key.enc_left(left_value).unwrap();
        for right_value in 1..=16 {
            let right = key.enc_right(right_value, &mut rng).unwrap();
            assert_eq!(
                sd_ore::cmp(&left, &right).unwrap(),
                left_value.cmp(&right_value),
                "left={left_value}, right={right_value}"
            );
        }
    }
}

#[test]
fn equal_values_compare_equal() {
    let mut rng = rng(4);
    let key = sd_ore::SdOreSecretKey::setup(8, &mut rng).unwrap();
    let left = key.enc_left(6).unwrap();
    let right = key.enc_right(6, &mut rng).unwrap();
    assert_eq!(sd_ore::cmp(&left, &right).unwrap(), Ordering::Equal);
}
