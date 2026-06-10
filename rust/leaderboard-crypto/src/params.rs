use serde::{Deserialize, Serialize};

use crate::error::OreError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct SecurityParams {
    pub value_bits: u16,
    pub max_clients: u32,
}

impl SecurityParams {
    pub const MIN_VALUE_BITS: u16 = 1;
    pub const MAX_VALUE_BITS: u16 = 63;

    pub fn new(value_bits: u16, max_clients: u32) -> Result<Self, OreError> {
        let params = Self {
            value_bits,
            max_clients,
        };
        params.validate()?;
        Ok(params)
    }

    pub fn validate(self) -> Result<(), OreError> {
        if self.value_bits < Self::MIN_VALUE_BITS {
            return Err(OreError::InvalidParams("value_bits must be at least 1"));
        }
        if self.value_bits > Self::MAX_VALUE_BITS {
            return Err(OreError::InvalidParams("value_bits must be at most 63"));
        }
        if self.max_clients == 0 {
            return Err(OreError::InvalidParams(
                "max_clients must be greater than 0",
            ));
        }
        Ok(())
    }

    pub fn max_value(self) -> u64 {
        (1u64 << self.value_bits) - 1
    }
}
