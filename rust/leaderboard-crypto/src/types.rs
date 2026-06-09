use serde::{Deserialize, Serialize};

use crate::{error::OreError, params::SecurityParams};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ClientId(pub u32);

impl ClientId {
    pub fn validate(self, params: SecurityParams) -> Result<(), OreError> {
        if self.0 >= params.max_clients {
            return Err(OreError::InvalidClientId(self.0));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PublicParams {
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MasterSecret {
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QueryKey {
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ClientSecretKey {
    pub client_id: ClientId,
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompareMaterial {
    pub security: SecurityParams,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OreCiphertext {
    pub client_id: ClientId,
    pub security: SecurityParams,
    pub components: Vec<Vec<u8>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OreToken {
    pub client_id: ClientId,
    pub security: SecurityParams,
    pub components: Vec<Vec<u8>>,
}
