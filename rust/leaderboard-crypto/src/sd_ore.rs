use core::cmp::Ordering;

use rand_core::{CryptoRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::OreError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SdOreSecretKey {
    pub(crate) key: [u8; 32],
    pub(crate) permutation: Vec<u32>,
    pub(crate) inverse_permutation: Vec<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SdOreLeftCiphertext {
    pub(crate) prf_at_permuted_value: [u8; 32],
    pub(crate) permuted_value: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SdOreRightCiphertext {
    pub(crate) nonce: [u8; 32],
    pub(crate) masked_cmp: Vec<u8>,
}

impl SdOreSecretKey {
    pub fn setup<R: CryptoRng + RngCore>(domain_size: u32, rng: &mut R) -> Result<Self, OreError> {
        if domain_size == 0 {
            return Err(OreError::InvalidParams(
                "SD-ORE domain_size must be greater than 0",
            ));
        }

        let mut key = [0u8; 32];
        rng.fill_bytes(&mut key);

        let mut permutation: Vec<u32> = (1..=domain_size).collect();
        shuffle(&mut permutation, rng);

        let mut inverse_permutation = vec![0; domain_size as usize];
        for (index, value) in permutation.iter().copied().enumerate() {
            inverse_permutation[(value - 1) as usize] = index as u32 + 1;
        }

        Ok(Self {
            key,
            permutation,
            inverse_permutation,
        })
    }

    pub fn domain_size(&self) -> u32 {
        self.permutation.len() as u32
    }

    pub fn enc_left(&self, value: u32) -> Result<SdOreLeftCiphertext, OreError> {
        self.validate_value(value)?;
        let permuted_value = self.permutation[(value - 1) as usize];
        Ok(SdOreLeftCiphertext {
            prf_at_permuted_value: prf(&self.key, permuted_value),
            permuted_value,
        })
    }

    pub fn enc_right<R: CryptoRng + RngCore>(
        &self,
        value: u32,
        rng: &mut R,
    ) -> Result<SdOreRightCiphertext, OreError> {
        self.validate_value(value)?;
        let mut nonce = [0u8; 32];
        rng.fill_bytes(&mut nonce);

        let mut masked_cmp = Vec::with_capacity(self.domain_size() as usize);
        for permuted in 1..=self.domain_size() {
            let original = self.inverse_permutation[(permuted - 1) as usize];
            let cmp = cmp_mod3(original.cmp(&value));
            let mask = hash_mod3(&prf(&self.key, permuted), &nonce);
            masked_cmp.push((cmp + mask) % 3);
        }

        Ok(SdOreRightCiphertext { nonce, masked_cmp })
    }

    fn validate_value(&self, value: u32) -> Result<(), OreError> {
        if value == 0 || value > self.domain_size() {
            return Err(OreError::ValueOutOfDomain {
                value: value as u64,
                max: self.domain_size() as u64,
            });
        }
        Ok(())
    }
}

pub fn cmp(left: &SdOreLeftCiphertext, right: &SdOreRightCiphertext) -> Result<Ordering, OreError> {
    if left.permuted_value == 0 || left.permuted_value as usize > right.masked_cmp.len() {
        return Err(OreError::ValueOutOfDomain {
            value: left.permuted_value as u64,
            max: right.masked_cmp.len() as u64,
        });
    }

    let index = (left.permuted_value - 1) as usize;
    let masked = right.masked_cmp[index];
    let mask = hash_mod3(&left.prf_at_permuted_value, &right.nonce);
    let unmasked = (masked + 3 - mask) % 3;
    Ok(ordering_from_mod3(unmasked))
}

fn shuffle<R: CryptoRng + RngCore>(values: &mut [u32], rng: &mut R) {
    for i in (1..values.len()).rev() {
        let j = uniform_index(i + 1, rng);
        values.swap(i, j);
    }
}

fn uniform_index<R: CryptoRng + RngCore>(upper_exclusive: usize, rng: &mut R) -> usize {
    debug_assert!(upper_exclusive > 0);
    let zone = u64::MAX - (u64::MAX % upper_exclusive as u64);
    loop {
        let candidate = rng.next_u64();
        if candidate < zone {
            return (candidate % upper_exclusive as u64) as usize;
        }
    }
}

fn prf(key: &[u8; 32], value: u32) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"securecompare.sd_ore.prf.v1");
    hasher.update(key);
    hasher.update(value.to_be_bytes());
    hasher.finalize().into()
}

fn hash_mod3(prf_value: &[u8; 32], nonce: &[u8; 32]) -> u8 {
    let mut hasher = Sha256::new();
    hasher.update(b"securecompare.sd_ore.hash_mod3.v1");
    hasher.update(prf_value);
    hasher.update(nonce);
    hasher.finalize()[0] % 3
}

fn cmp_mod3(ordering: Ordering) -> u8 {
    match ordering {
        Ordering::Less => 2,
        Ordering::Equal => 0,
        Ordering::Greater => 1,
    }
}

fn ordering_from_mod3(value: u8) -> Ordering {
    match value % 3 {
        1 => Ordering::Greater,
        2 => Ordering::Less,
        _ => Ordering::Equal,
    }
}
