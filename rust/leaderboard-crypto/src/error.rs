use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum OreError {
    #[error("algorithm not implemented: {0}")]
    AlgorithmNotImplemented(&'static str),

    #[error("invalid security parameters: {0}")]
    InvalidParams(&'static str),

    #[error("client id {0} is outside the configured client domain")]
    InvalidClientId(u32),

    #[error("value {value} exceeds the configured domain max {max}")]
    ValueOutOfDomain { value: u64, max: u64 },

    #[error("ciphertext and token parameters do not match")]
    ParameterMismatch,
}
