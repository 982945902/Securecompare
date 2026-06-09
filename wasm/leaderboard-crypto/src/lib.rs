use core::cmp::Ordering;

use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use securecompare_leaderboard_crypto::{
    codec::ByteCodec,
    m_h_ore::{self, MhOreCiphertext, MhOreMasterSecret, MhOreQueryKey, MhOreToken},
    SecurityParams,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct DemoLeaderboardAuthority {
    params: SecurityParams,
    master: MhOreMasterSecret,
    query: MhOreQueryKey,
}

#[wasm_bindgen]
impl DemoLeaderboardAuthority {
    #[wasm_bindgen(constructor)]
    pub fn new(
        value_bits: u16,
        max_clients: u32,
        seed: u32,
    ) -> Result<DemoLeaderboardAuthority, JsValue> {
        let params = SecurityParams::new(value_bits, max_clients).map_err(to_js_error)?;
        let mut rng = seeded_rng(seed);
        let (master, query) = m_h_ore::setup(params, &mut rng).map_err(to_js_error)?;
        Ok(Self {
            params,
            master,
            query,
        })
    }

    #[wasm_bindgen(js_name = encryptCiphertext)]
    pub fn encrypt_ciphertext(&self, value: u32, seed: u32) -> Result<Vec<u8>, JsValue> {
        let mut rng = seeded_rng(seed);
        m_h_ore::encrypt(self.params, &self.master, u64::from(value), &mut rng)
            .and_then(|ciphertext| ciphertext.to_bytes())
            .map_err(to_js_error)
    }

    #[wasm_bindgen(js_name = makeToken)]
    pub fn make_token(&self, value: u32, seed: u32) -> Result<Vec<u8>, JsValue> {
        let mut rng = seeded_rng(seed);
        m_h_ore::token(self.params, &self.query, u64::from(value), &mut rng)
            .and_then(|token| token.to_bytes())
            .map_err(to_js_error)
    }
}

#[wasm_bindgen(js_name = compareMhOre)]
pub fn compare_mh_ore(ciphertext: &[u8], token: &[u8]) -> Result<String, JsValue> {
    let ciphertext = MhOreCiphertext::from_bytes(ciphertext).map_err(to_js_error)?;
    let token = MhOreToken::from_bytes(token).map_err(to_js_error)?;
    let ordering = m_h_ore::compare(&ciphertext, &token).map_err(to_js_error)?;
    Ok(match ordering {
        Ordering::Less => "less",
        Ordering::Equal => "equal",
        Ordering::Greater => "greater",
    }
    .to_string())
}

fn seeded_rng(seed: u32) -> ChaCha20Rng {
    let mut bytes = [0u8; 32];
    bytes[..4].copy_from_slice(&seed.to_le_bytes());
    bytes[4..8].copy_from_slice(&seed.rotate_left(13).to_le_bytes());
    ChaCha20Rng::from_seed(bytes)
}

fn to_js_error(error: impl core::fmt::Display) -> JsValue {
    JsValue::from_str(&error.to_string())
}
