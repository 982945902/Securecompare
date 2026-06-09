use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{
    codec::ByteCodec, dpph, m_h_ore, m_ore, sd_ore, SecurityParams,
};

fn rng(seed: u8) -> ChaCha20Rng {
    ChaCha20Rng::from_seed([seed; 32])
}

#[test]
fn dpph_hash_roundtrip_preserves_test_result() {
    let mut rng = rng(40);
    let (_, hash_key, test_key) = dpph::kgen(&mut rng);
    let left = dpph::hash(&hash_key, 10);
    let right = dpph::hash(&hash_key, 11);

    let hash_key = dpph::DpphHashKey::from_bytes(&hash_key.to_bytes().unwrap()).unwrap();
    let test_key = dpph::DpphTestKey::from_bytes(&test_key.to_bytes().unwrap()).unwrap();
    let left = dpph::DpphHash::from_bytes(&left.to_bytes().unwrap()).unwrap();
    let right = dpph::DpphHash::from_bytes(&right.to_bytes().unwrap()).unwrap();

    assert!(dpph::test(&test_key, &left, &right));
    assert_eq!(dpph::hash(&hash_key, 10), left);
}

#[test]
fn sd_ore_roundtrip_preserves_comparison() {
    let mut rng = rng(41);
    let key = sd_ore::SdOreSecretKey::setup(8, &mut rng).unwrap();
    let left = key.enc_left(3).unwrap();
    let right = key.enc_right(6, &mut rng).unwrap();

    let key = sd_ore::SdOreSecretKey::from_bytes(&key.to_bytes().unwrap()).unwrap();
    let left = sd_ore::SdOreLeftCiphertext::from_bytes(&left.to_bytes().unwrap()).unwrap();
    let right = sd_ore::SdOreRightCiphertext::from_bytes(&right.to_bytes().unwrap()).unwrap();

    assert_eq!(sd_ore::cmp(&left, &right).unwrap(), 3u32.cmp(&6));
    assert_eq!(key.enc_left(3).unwrap(), left);
}

#[test]
fn more_roundtrip_preserves_comparison() {
    let params = SecurityParams::new(4, 8).unwrap();
    let mut rng = rng(42);
    let (master, query) = m_ore::setup(&mut rng);
    let ciphertext = m_ore::encrypt(params, &master, 12, &mut rng).unwrap();
    let token = m_ore::token(params, &query, 9, &mut rng).unwrap();

    let master = m_ore::MoreMasterSecret::from_bytes(&master.to_bytes().unwrap()).unwrap();
    let query = m_ore::MoreQueryKey::from_bytes(&query.to_bytes().unwrap()).unwrap();
    let ciphertext = m_ore::MoreCiphertext::from_bytes(&ciphertext.to_bytes().unwrap()).unwrap();
    let token = m_ore::MoreToken::from_bytes(&token.to_bytes().unwrap()).unwrap();

    assert_eq!(m_ore::compare(&ciphertext, &token).unwrap(), 12u64.cmp(&9));

    let fresh_ciphertext = m_ore::encrypt(params, &master, 12, &mut rng).unwrap();
    let fresh_token = m_ore::token(params, &query, 9, &mut rng).unwrap();
    assert_eq!(
        m_ore::compare(&fresh_ciphertext, &fresh_token).unwrap(),
        12u64.cmp(&9)
    );
}

#[test]
fn mhore_roundtrip_preserves_comparison() {
    let params = SecurityParams::new(8, 8).unwrap();
    let mut rng = rng(43);
    let (master, query) = m_h_ore::setup(params, &mut rng).unwrap();
    let ciphertext = m_h_ore::encrypt(params, &master, 33, &mut rng).unwrap();
    let token = m_h_ore::token(params, &query, 64, &mut rng).unwrap();

    let master = m_h_ore::MhOreMasterSecret::from_bytes(&master.to_bytes().unwrap()).unwrap();
    let query = m_h_ore::MhOreQueryKey::from_bytes(&query.to_bytes().unwrap()).unwrap();
    let ciphertext = m_h_ore::MhOreCiphertext::from_bytes(&ciphertext.to_bytes().unwrap()).unwrap();
    let token = m_h_ore::MhOreToken::from_bytes(&token.to_bytes().unwrap()).unwrap();

    assert_eq!(
        m_h_ore::compare(&ciphertext, &token).unwrap(),
        33u64.cmp(&64)
    );

    let fresh_ciphertext = m_h_ore::encrypt(params, &master, 33, &mut rng).unwrap();
    let fresh_token = m_h_ore::token(params, &query, 64, &mut rng).unwrap();
    assert_eq!(
        m_h_ore::compare(&fresh_ciphertext, &fresh_token).unwrap(),
        33u64.cmp(&64)
    );
}

#[test]
fn rejects_truncated_bytes() {
    let err = m_ore::MoreCiphertext::from_bytes(&[0, 1, 2, 3]).unwrap_err();
    assert!(format!("{err}").contains("serialization failed"));
}
