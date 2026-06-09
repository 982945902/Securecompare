use rand_core::{CryptoRng, RngCore};

use crate::{
    encoding::validate_value,
    error::OreError,
    types::{ClientId, OreToken, PublicParams, QueryKey},
};

pub fn token<R: CryptoRng + RngCore>(
    public: &PublicParams,
    _query: &QueryKey,
    client_id: ClientId,
    value: u64,
    _rng: &mut R,
) -> Result<OreToken, OreError> {
    validate_value(public.security, value)?;
    client_id.validate(public.security)?;
    Err(OreError::AlgorithmNotImplemented("m-ORE token generation"))
}
