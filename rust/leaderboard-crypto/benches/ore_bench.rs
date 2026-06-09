use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{dpph, m_h_ore, m_ore, sd_ore, SecurityParams};

fn rng(seed: u8) -> ChaCha20Rng {
    ChaCha20Rng::from_seed([seed; 32])
}

fn parameter_validation(c: &mut Criterion) {
    c.bench_function("security_params_new", |b| {
        b.iter(|| black_box(SecurityParams::new(black_box(32), black_box(10_000)).unwrap()))
    });
}

fn sd_ore_compare(c: &mut Criterion) {
    let mut rng = rng(1);
    let key = sd_ore::SdOreSecretKey::setup(64, &mut rng).unwrap();
    let left = key.enc_left(17).unwrap();
    let right = key.enc_right(51, &mut rng).unwrap();

    c.bench_function("sd_ore_compare_domain_64", |b| {
        b.iter(|| sd_ore::cmp(black_box(&left), black_box(&right)).unwrap())
    });
}

fn dpph_test(c: &mut Criterion) {
    let mut rng = rng(2);
    let (_, hash_key, test_key) = dpph::kgen(&mut rng);
    let left = dpph::hash(&hash_key, 42);
    let right = dpph::hash(&hash_key, 43);

    c.bench_function("dpph_test_neighbor", |b| {
        b.iter(|| dpph::test(black_box(&test_key), black_box(&left), black_box(&right)))
    });
}

fn more_compare(c: &mut Criterion) {
    let params = SecurityParams::new(8, 8).unwrap();
    let mut rng = rng(3);
    let (master, query) = m_ore::setup(&mut rng);
    let ciphertext = m_ore::encrypt(params, &master, 170, &mut rng).unwrap();
    let token = m_ore::token(params, &query, 169, &mut rng).unwrap();

    c.bench_function("m_ore_compare_8_bits", |b| {
        b.iter(|| m_ore::compare(black_box(&ciphertext), black_box(&token)).unwrap())
    });
}

fn mhore_compare(c: &mut Criterion) {
    let params = SecurityParams::new(8, 8).unwrap();
    let mut rng = rng(4);
    let (master, query) = m_h_ore::setup(params, &mut rng).unwrap();
    let different_length_ciphertext = m_h_ore::encrypt(params, &master, 200, &mut rng).unwrap();
    let different_length_token = m_h_ore::token(params, &query, 9, &mut rng).unwrap();
    let same_length_ciphertext = m_h_ore::encrypt(params, &master, 170, &mut rng).unwrap();
    let same_length_token = m_h_ore::token(params, &query, 169, &mut rng).unwrap();

    c.bench_function("m_h_ore_compare_different_bit_length", |b| {
        b.iter(|| {
            m_h_ore::compare(
                black_box(&different_length_ciphertext),
                black_box(&different_length_token),
            )
            .unwrap()
        })
    });
    c.bench_function("m_h_ore_compare_same_bit_length", |b| {
        b.iter(|| {
            m_h_ore::compare(
                black_box(&same_length_ciphertext),
                black_box(&same_length_token),
            )
            .unwrap()
        })
    });
}

criterion_group!(
    benches,
    parameter_validation,
    sd_ore_compare,
    dpph_test,
    more_compare,
    mhore_compare
);
criterion_main!(benches);
