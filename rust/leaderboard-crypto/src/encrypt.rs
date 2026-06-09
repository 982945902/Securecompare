use rand_core::{CryptoRng, RngCore};

use crate::{
    encoding::validate_value,
    error::OreError,
    types::{ClientSecretKey, OreCiphertext, PublicParams},
};

pub fn encrypt<R: CryptoRng + RngCore>(
    public: &PublicParams,
    key: &ClientSecretKey,
    value: u64,
    _rng: &mut R,
) -> Result<OreCiphertext, OreError> {
    validate_value(public.security, value)?;
    key.client_id.validate(public.security)?;
    Err(OreError::AlgorithmNotImplemented("m-ORE encrypt"))
}
