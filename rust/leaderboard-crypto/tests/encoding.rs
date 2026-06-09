use securecompare_leaderboard_crypto::{
    encoding::{bits_msb, validate_value},
    OreError, SecurityParams,
};

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
    assert_eq!(
        bits_msb(params, 0b1010).unwrap(),
        vec![true, false, true, false]
    );
}
