use core::cmp::Ordering;

use crate::{
    error::OreError,
    types::{CompareMaterial, OreCiphertext, OreToken, PublicParams},
};

pub fn compare(
    public: &PublicParams,
    material: &CompareMaterial,
    left: &OreCiphertext,
    right: &OreToken,
) -> Result<Ordering, OreError> {
    if public.security != material.security
        || public.security != left.security
        || public.security != right.security
    {
        return Err(OreError::ParameterMismatch);
    }
    Err(OreError::AlgorithmNotImplemented("m-ORE compare"))
}
