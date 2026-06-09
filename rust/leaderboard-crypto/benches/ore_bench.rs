use criterion::{criterion_group, criterion_main, Criterion};
use securecompare_leaderboard_crypto::SecurityParams;

fn parameter_validation(c: &mut Criterion) {
    c.bench_function("security_params_new", |b| {
        b.iter(|| SecurityParams::new(32, 10_000).unwrap())
    });
}

criterion_group!(benches, parameter_validation);
criterion_main!(benches);
