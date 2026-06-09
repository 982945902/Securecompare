use rand_core::{CryptoRng, RngCore};

use crate::{
    error::OreError,
    params::SecurityParams,
    types::{CompareMaterial, MasterSecret, PublicParams, QueryKey},
};

pub fn setup<R: CryptoRng + RngCore>(
    params: SecurityParams,
    _rng: &mut R,
) -> Result<(PublicParams, MasterSecret, QueryKey), OreError> {
    params.validate()?;
    Err(OreError::AlgorithmNotImplemented("m-ORE setup"))
}

pub fn comparison_material(
    _public: &PublicParams,
    _master: &MasterSecret,
) -> Result<CompareMaterial, OreError> {
    Err(OreError::AlgorithmNotImplemented("m-ORE comparison material"))
}
