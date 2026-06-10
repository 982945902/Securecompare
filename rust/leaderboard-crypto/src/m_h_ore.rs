use core::cmp::Ordering;

use rand_core::{CryptoRng, RngCore};

use crate::{
    encoding::validate_value,
    error::OreError,
    m_ore::{self, MoreCiphertext, MoreMasterSecret, MoreQueryKey, MoreToken},
    params::SecurityParams,
    sd_ore::{self, SdOreLeftCiphertext, SdOreRightCiphertext, SdOreSecretKey},
};

#[derive(Debug, Clone)]
pub struct MhOreMasterSecret {
    pub(crate) more_master: MoreMasterSecret,
    pub(crate) sd_ore_key: SdOreSecretKey,
}

#[derive(Debug, Clone)]
pub struct MhOreQueryKey {
    pub(crate) more_query: MoreQueryKey,
    pub(crate) sd_ore_key: SdOreSecretKey,
}

#[derive(Debug, Clone)]
pub struct MhOreCiphertext {
    pub(crate) bit_length_right: SdOreRightCiphertext,
    pub(crate) more_ciphertext: MoreCiphertext,
}

#[derive(Debug, Clone)]
pub struct MhOreToken {
    pub(crate) bit_length_left: SdOreLeftCiphertext,
    pub(crate) more_token: MoreToken,
}

pub fn setup<R: CryptoRng + RngCore>(
    params: SecurityParams,
    rng: &mut R,
) -> Result<(MhOreMasterSecret, MhOreQueryKey), OreError> {
    params.validate()?;
    let (more_master, more_query) = m_ore::setup(rng);
    let sd_ore_key = SdOreSecretKey::setup(params.value_bits as u32, rng)?;

    Ok((
        MhOreMasterSecret {
            more_master,
            sd_ore_key: sd_ore_key.clone(),
        },
        MhOreQueryKey {
            more_query,
            sd_ore_key,
        },
    ))
}

pub fn encrypt<R: CryptoRng + RngCore>(
    params: SecurityParams,
    master: &MhOreMasterSecret,
    value: u64,
    rng: &mut R,
) -> Result<MhOreCiphertext, OreError> {
    validate_value(params, value)?;
    let bit_length = bit_length(value);
    let bit_length_right = master.sd_ore_key.enc_right(bit_length, rng)?;
    let more_ciphertext = m_ore::encrypt(params, &master.more_master, value, rng)?;

    Ok(MhOreCiphertext {
        bit_length_right,
        more_ciphertext,
    })
}

pub fn token<R: CryptoRng + RngCore>(
    params: SecurityParams,
    query: &MhOreQueryKey,
    value: u64,
    rng: &mut R,
) -> Result<MhOreToken, OreError> {
    validate_value(params, value)?;
    let bit_length = bit_length(value);
    let bit_length_left = query.sd_ore_key.enc_left(bit_length)?;
    let more_token = m_ore::token(params, &query.more_query, value, rng)?;

    Ok(MhOreToken {
        bit_length_left,
        more_token,
    })
}

pub fn compare(ciphertext: &MhOreCiphertext, token: &MhOreToken) -> Result<Ordering, OreError> {
    let token_vs_cipher = sd_ore::cmp(&token.bit_length_left, &ciphertext.bit_length_right)?;
    if token_vs_cipher != Ordering::Equal {
        return Ok(token_vs_cipher.reverse());
    }

    m_ore::compare(&ciphertext.more_ciphertext, &token.more_token)
}

fn bit_length(value: u64) -> u32 {
    if value == 0 {
        1
    } else {
        u64::BITS - value.leading_zeros()
    }
}
