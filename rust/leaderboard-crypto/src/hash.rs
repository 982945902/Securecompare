//! Domain-separated hash adapters for the paper construction.
//!
//! The exact PRF-to-field mapping depends on the pairing curve selected after
//! visual verification of the paper algorithms.

use crate::error::OreError;

pub fn prf_to_field_not_ready() -> OreError {
    OreError::AlgorithmNotImplemented("PRF-to-field mapping")
}
