#[cfg(test)]
pub fn test_rng() -> rand_chacha::ChaCha20Rng {
    use rand_chacha::rand_core::SeedableRng;
    rand_chacha::ChaCha20Rng::from_seed([7u8; 32])
}
