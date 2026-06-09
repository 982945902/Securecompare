use ark_bls12_381::{Bls12_381, Fr, G1Projective, G2Projective};
use ark_ec::{pairing::Pairing, CurveGroup, PrimeGroup};
use ark_ff::PrimeField;
use rand_core::{CryptoRng, RngCore};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone)]
pub struct DpphPublicParams;

#[derive(Debug, Clone)]
pub struct DpphHashKey {
    k1: [u8; 32],
    k2_1: Fr,
    k2_2: Fr,
}

#[derive(Debug, Clone)]
pub struct DpphTestKey {
    g1_k2_1: G1Projective,
    g2_k2_2: G2Projective,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DpphHash {
    h1: G1Projective,
    h2: G2Projective,
    h3: G2Projective,
}

pub fn kgen<R: CryptoRng + RngCore>(rng: &mut R) -> (DpphPublicParams, DpphHashKey, DpphTestKey) {
    let mut k1 = [0u8; 32];
    rng.fill_bytes(&mut k1);

    let k2_1 = scalar_from_rng(rng);
    let k2_2 = scalar_from_rng(rng);

    let hash_key = DpphHashKey { k1, k2_1, k2_2 };
    let test_key = DpphTestKey {
        g1_k2_1: G1Projective::generator() * k2_1,
        g2_k2_2: G2Projective::generator() * k2_2,
    };

    (DpphPublicParams, hash_key, test_key)
}

pub fn hash(hash_key: &DpphHashKey, value: i128) -> DpphHash {
    let hx = prf_to_scalar(&hash_key.k1, value);
    let hx_plus_one = prf_to_scalar(&hash_key.k1, value + 1);
    let hx_minus_one = prf_to_scalar(&hash_key.k1, value - 1);

    DpphHash {
        h1: G1Projective::generator() * (hash_key.k2_1 * hx),
        h2: G2Projective::generator() * (hash_key.k2_2 * hx_plus_one),
        h3: G2Projective::generator() * (hash_key.k2_2 * hx_minus_one),
    }
}

pub fn test(test_key: &DpphTestKey, left: &DpphHash, right: &DpphHash) -> bool {
    let left_pairing = Bls12_381::pairing(left.h1.into_affine(), test_key.g2_k2_2.into_affine());
    let right_plus = Bls12_381::pairing(test_key.g1_k2_1.into_affine(), right.h2.into_affine());
    let right_minus = Bls12_381::pairing(test_key.g1_k2_1.into_affine(), right.h3.into_affine());

    left_pairing == right_plus || left_pairing == right_minus
}

fn scalar_from_rng<R: CryptoRng + RngCore>(rng: &mut R) -> Fr {
    let mut bytes = [0u8; 64];
    rng.fill_bytes(&mut bytes);
    Fr::from_be_bytes_mod_order(&bytes)
}

fn prf_to_scalar(k1: &[u8; 32], value: i128) -> Fr {
    let mut hasher = Sha256::new();
    hasher.update(b"securecompare.dpph.H.v1");
    hasher.update(k1);
    hasher.update(value.to_be_bytes());
    Fr::from_be_bytes_mod_order(&hasher.finalize())
}
