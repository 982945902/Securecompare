use rand_core::{CryptoRng, RngCore};

use crate::{
    error::OreError,
    types::{ClientId, ClientSecretKey, MasterSecret, PublicParams},
};

pub fn keygen<R: CryptoRng + RngCore>(
    public: &PublicParams,
    _master: &MasterSecret,
    client_id: ClientId,
    _rng: &mut R,
) -> Result<ClientSecretKey, OreError> {
    client_id.validate(public.security)?;
    Err(OreError::AlgorithmNotImplemented("m-ORE keygen"))
}
