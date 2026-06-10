use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{
    compare, encrypt, keygen, setup, token, ClientId, ClientSecretKey, CompareMaterial,
    MasterSecret, OreCiphertext, OreError, OreToken, PublicParams, QueryKey, SecurityParams,
};

fn rng() -> ChaCha20Rng {
    ChaCha20Rng::from_seed([9u8; 32])
}

#[test]
fn setup_validates_params_then_fails_closed() {
    let mut rng = rng();
    let params = SecurityParams::new(8, 4).unwrap();
    let err = setup(params, &mut rng).unwrap_err();
    assert_eq!(err, OreError::AlgorithmNotImplemented("m-ORE setup"));
}

#[test]
fn keygen_validates_client_id_then_fails_closed() {
    let mut rng = rng();
    let params = SecurityParams::new(8, 4).unwrap();
    let public = PublicParams { security: params };
    let master = MasterSecret { security: params };

    let invalid = keygen(&public, &master, ClientId(4), &mut rng).unwrap_err();
    assert_eq!(invalid, OreError::InvalidClientId(4));

    let not_implemented = keygen(&public, &master, ClientId(3), &mut rng).unwrap_err();
    assert_eq!(
        not_implemented,
        OreError::AlgorithmNotImplemented("m-ORE keygen")
    );
}

#[test]
fn encrypt_validates_value_and_client_then_fails_closed() {
    let mut rng = rng();
    let params = SecurityParams::new(4, 2).unwrap();
    let public = PublicParams { security: params };
    let key = ClientSecretKey {
        client_id: ClientId(1),
        security: params,
    };

    let out_of_domain = encrypt(&public, &key, 16, &mut rng).unwrap_err();
    assert_eq!(
        out_of_domain,
        OreError::ValueOutOfDomain { value: 16, max: 15 }
    );

    let not_implemented = encrypt(&public, &key, 15, &mut rng).unwrap_err();
    assert_eq!(
        not_implemented,
        OreError::AlgorithmNotImplemented("m-ORE encrypt")
    );
}

#[test]
fn token_validates_value_and_client_then_fails_closed() {
    let mut rng = rng();
    let params = SecurityParams::new(4, 2).unwrap();
    let public = PublicParams { security: params };
    let query = QueryKey { security: params };

    let invalid_client = token(&public, &query, ClientId(2), 7, &mut rng).unwrap_err();
    assert_eq!(invalid_client, OreError::InvalidClientId(2));

    let out_of_domain = token(&public, &query, ClientId(1), 16, &mut rng).unwrap_err();
    assert_eq!(
        out_of_domain,
        OreError::ValueOutOfDomain { value: 16, max: 15 }
    );

    let not_implemented = token(&public, &query, ClientId(1), 15, &mut rng).unwrap_err();
    assert_eq!(
        not_implemented,
        OreError::AlgorithmNotImplemented("m-ORE token generation")
    );
}

#[test]
fn compare_rejects_parameter_mismatch_then_fails_closed() {
    let params = SecurityParams::new(4, 2).unwrap();
    let other_params = SecurityParams::new(5, 2).unwrap();
    let public = PublicParams { security: params };
    let material = CompareMaterial {
        security: other_params,
    };
    let left = OreCiphertext {
        client_id: ClientId(0),
        security: params,
        components: vec![],
    };
    let right = OreToken {
        client_id: ClientId(1),
        security: params,
        components: vec![],
    };

    let mismatch = compare(&public, &material, &left, &right).unwrap_err();
    assert_eq!(mismatch, OreError::ParameterMismatch);

    let material = CompareMaterial { security: params };
    let not_implemented = compare(&public, &material, &left, &right).unwrap_err();
    assert_eq!(
        not_implemented,
        OreError::AlgorithmNotImplemented("m-ORE compare")
    );
}
