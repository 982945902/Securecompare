use crate::{error::OreError, params::SecurityParams};

pub fn validate_value(params: SecurityParams, value: u64) -> Result<(), OreError> {
    let max = params.max_value();
    if value > max {
        return Err(OreError::ValueOutOfDomain { value, max });
    }
    Ok(())
}

pub fn bits_msb(params: SecurityParams, value: u64) -> Result<Vec<bool>, OreError> {
    validate_value(params, value)?;
    let mut bits = Vec::with_capacity(params.value_bits as usize);
    for shift in (0..params.value_bits).rev() {
        bits.push(((value >> shift) & 1) == 1);
    }
    Ok(bits)
}
