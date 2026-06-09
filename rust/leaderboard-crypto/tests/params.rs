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
    assert_eq!(
        err,
        OreError::InvalidParams("max_clients must be greater than 0")
    );
}
