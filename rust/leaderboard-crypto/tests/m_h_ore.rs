use core::cmp::Ordering;

use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{m_h_ore, SecurityParams};

fn rng(seed: u8) -> ChaCha20Rng {
    ChaCha20Rng::from_seed([seed; 32])
}

#[test]
fn compares_by_bit_length_when_bit_lengths_differ() {
    let params = SecurityParams::new(8, 8).unwrap();
    let mut setup_rng = rng(30);
    let (master, query) = m_h_ore::setup(params, &mut setup_rng).unwrap();

    let cases = [(1, 2), (3, 8), (128, 7), (255, 1), (0, 16)];
    for (left_value, right_value) in cases {
        let ciphertext = m_h_ore::encrypt(params, &master, left_value, &mut rng(31)).unwrap();
        let token = m_h_ore::token(params, &query, right_value, &mut rng(32)).unwrap();

        assert_eq!(
            m_h_ore::compare(&ciphertext, &token).unwrap(),
            left_value.cmp(&right_value),
            "left={left_value}, right={right_value}"
        );
    }
}

#[test]
fn falls_back_to_base_more_when_bit_lengths_are_equal() {
    let params = SecurityParams::new(8, 8).unwrap();
    let mut setup_rng = rng(33);
    let (master, query) = m_h_ore::setup(params, &mut setup_rng).unwrap();

    let cases = [(8, 9), (9, 8), (12, 12), (200, 255), (255, 200)];
    for (left_value, right_value) in cases {
        let ciphertext = m_h_ore::encrypt(params, &master, left_value, &mut rng(34)).unwrap();
        let token = m_h_ore::token(params, &query, right_value, &mut rng(35)).unwrap();

        assert_eq!(
            m_h_ore::compare(&ciphertext, &token).unwrap(),
            left_value.cmp(&right_value),
            "left={left_value}, right={right_value}"
        );
    }
}

#[test]
fn equal_values_compare_equal() {
    let params = SecurityParams::new(8, 8).unwrap();
    let mut setup_rng = rng(36);
    let (master, query) = m_h_ore::setup(params, &mut setup_rng).unwrap();

    let ciphertext = m_h_ore::encrypt(params, &master, 77, &mut rng(37)).unwrap();
    let token = m_h_ore::token(params, &query, 77, &mut rng(38)).unwrap();

    assert_eq!(
        m_h_ore::compare(&ciphertext, &token).unwrap(),
        Ordering::Equal
    );
}
