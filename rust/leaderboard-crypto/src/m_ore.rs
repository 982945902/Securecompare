use core::cmp::Ordering;

use ark_bls12_381::{Bls12_381, G1Projective, G2Projective};
use ark_ec::{pairing::Pairing, CurveGroup, PrimeGroup};
use rand_core::{CryptoRng, RngCore};
use sha2::{Digest, Sha256};

use crate::{
    dpph::{self, DpphHashKey},
    encoding::{bits_msb, validate_value},
    error::OreError,
    params::SecurityParams,
};

#[derive(Debug, Clone)]
pub struct MoreMasterSecret {
    hash_key: DpphHashKey,
}

#[derive(Debug, Clone)]
pub struct MoreQueryKey {
    k1: [u8; 32],
    g2_k2_2: G2Projective,
}

#[derive(Debug, Clone)]
pub struct MoreCiphertext {
    c0: G1Projective,
    components: Vec<G1Projective>,
    params: SecurityParams,
}

#[derive(Debug, Clone)]
pub struct MoreToken {
    t0: G2Projective,
    components: Vec<(G2Projective, G2Projective)>,
    params: SecurityParams,
}

pub fn setup<R: CryptoRng + RngCore>(rng: &mut R) -> (MoreMasterSecret, MoreQueryKey) {
    let (_, hash_key, test_key) = dpph::kgen(rng);
    let query_key = MoreQueryKey {
        k1: hash_key.k1,
        g2_k2_2: test_key.g2_k2_2,
    };
    (MoreMasterSecret { hash_key }, query_key)
}

pub fn encrypt<R: CryptoRng + RngCore>(
    params: SecurityParams,
    master: &MoreMasterSecret,
    value: u64,
    rng: &mut R,
) -> Result<MoreCiphertext, OreError> {
    validate_value(params, value)?;
    let r = dpph::scalar_from_rng(rng);
    let c0 = G1Projective::generator() * (master.hash_key.k2_1 * r);
    let randomized_hash_key = DpphHashKey {
        k1: master.hash_key.k1,
        k2_1: master.hash_key.k2_1 * r,
        k2_2: master.hash_key.k2_2,
    };

    let encoded = encoded_values(params, value)?;
    let mut components: Vec<G1Projective> = encoded
        .into_iter()
        .map(|ui| dpph::hash(&randomized_hash_key, ui).h1)
        .collect();
    shuffle(&mut components, rng);

    Ok(MoreCiphertext {
        c0,
        components,
        params,
    })
}

pub fn token<R: CryptoRng + RngCore>(
    params: SecurityParams,
    query: &MoreQueryKey,
    value: u64,
    rng: &mut R,
) -> Result<MoreToken, OreError> {
    validate_value(params, value)?;
    let r_prime = dpph::scalar_from_rng(rng);
    let t0 = query.g2_k2_2 * r_prime;

    let encoded = encoded_values(params, value)?;
    let mut components: Vec<(G2Projective, G2Projective)> = encoded
        .into_iter()
        .map(|ui| {
            let plus = dpph::prf_to_scalar(&query.k1, ui + 1);
            let minus = dpph::prf_to_scalar(&query.k1, ui - 1);
            (
                query.g2_k2_2 * (r_prime * plus),
                query.g2_k2_2 * (r_prime * minus),
            )
        })
        .collect();
    shuffle(&mut components, rng);

    Ok(MoreToken {
        t0,
        components,
        params,
    })
}

pub fn compare(ciphertext: &MoreCiphertext, token: &MoreToken) -> Result<Ordering, OreError> {
    if ciphertext.params != token.params {
        return Err(OreError::ParameterMismatch);
    }

    for c_i in &ciphertext.components {
        let left_pairing = Bls12_381::pairing(c_i.into_affine(), token.t0.into_affine());
        for (t_j_1, t_j_2) in &token.components {
            let right_greater =
                Bls12_381::pairing(ciphertext.c0.into_affine(), t_j_1.into_affine());
            if left_pairing == right_greater {
                return Ok(Ordering::Greater);
            }

            let right_less = Bls12_381::pairing(ciphertext.c0.into_affine(), t_j_2.into_affine());
            if left_pairing == right_less {
                return Ok(Ordering::Less);
            }
        }
    }

    Ok(Ordering::Equal)
}

fn encoded_values(params: SecurityParams, value: u64) -> Result<Vec<i128>, OreError> {
    let bits = bits_msb(params, value)?;
    let mut values = Vec::with_capacity(bits.len());
    for index in 0..bits.len() {
        let base = encoding_prf(index as u16 + 1, params.value_bits, &bits[..index]);
        values.push(base + i128::from(bits[index]));
    }
    Ok(values)
}

fn encoding_prf(index_one_based: u16, value_bits: u16, prefix_bits: &[bool]) -> i128 {
    let mut hasher = Sha256::new();
    hasher.update(b"securecompare.m_ore.F.v1");
    hasher.update(index_one_based.to_be_bytes());
    hasher.update(value_bits.to_be_bytes());
    for bit in prefix_bits {
        hasher.update([u8::from(*bit)]);
    }
    let digest = hasher.finalize();

    let mut bytes = [0u8; 12];
    bytes.copy_from_slice(&digest[..12]);
    let base = u128::from_be_bytes([
        0, 0, 0, 0, bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
        bytes[8], bytes[9], bytes[10], bytes[11],
    ]);
    (base as i128) << 2
}

fn shuffle<T, R: CryptoRng + RngCore>(values: &mut [T], rng: &mut R) {
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
