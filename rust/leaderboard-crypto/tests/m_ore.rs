use core::cmp::Ordering;

use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{m_ore, SecurityParams};

fn rng(seed: u8) -> ChaCha20Rng {
    ChaCha20Rng::from_seed([seed; 32])
}

#[test]
fn compares_ciphertexts_and_tokens_for_representative_values() {
    let mut setup_rng = rng(20);
    let (master, query) = m_ore::setup(&mut setup_rng);
    let params = SecurityParams::new(4, 8).unwrap();
    let cases = [
        (0, 0),
        (0, 1),
        (1, 0),
        (7, 8),
        (8, 7),
        (0, 15),
        (15, 0),
        (15, 15),
    ];

    for (left_value, right_value) in cases {
        let mut enc_rng = rng((left_value + 1) as u8);
        let mut token_rng = rng((right_value + 33) as u8);
        let ciphertext = m_ore::encrypt(params, &master, left_value, &mut enc_rng).unwrap();
        let token = m_ore::token(params, &query, right_value, &mut token_rng).unwrap();

        assert_eq!(
            m_ore::compare(&ciphertext, &token).unwrap(),
            left_value.cmp(&right_value),
            "left={left_value}, right={right_value}"
        );
    }
}

#[test]
fn equal_values_compare_equal() {
    let mut setup_rng = rng(21);
    let (master, query) = m_ore::setup(&mut setup_rng);
    let params = SecurityParams::new(8, 8).unwrap();

    let ciphertext = m_ore::encrypt(params, &master, 42, &mut rng(22)).unwrap();
    let token = m_ore::token(params, &query, 42, &mut rng(23)).unwrap();

    assert_eq!(
        m_ore::compare(&ciphertext, &token).unwrap(),
        Ordering::Equal
    );
}

#[test]
fn rejects_out_of_domain_values() {
    let mut setup_rng = rng(24);
    let (master, query) = m_ore::setup(&mut setup_rng);
    let params = SecurityParams::new(4, 8).unwrap();

    assert!(m_ore::encrypt(params, &master, 16, &mut rng(25)).is_err());
    assert!(m_ore::token(params, &query, 16, &mut rng(26)).is_err());
}
