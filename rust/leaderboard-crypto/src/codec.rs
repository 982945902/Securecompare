use ark_bls12_381::{Fr, G1Projective, G2Projective};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};

use crate::{
    dpph::{DpphHash, DpphHashKey, DpphTestKey},
    error::OreError,
    m_h_ore::{MhOreCiphertext, MhOreMasterSecret, MhOreQueryKey, MhOreToken},
    m_ore::{MoreCiphertext, MoreMasterSecret, MoreQueryKey, MoreToken},
    params::SecurityParams,
    sd_ore::{SdOreLeftCiphertext, SdOreRightCiphertext, SdOreSecretKey},
};

pub trait ByteCodec: Sized {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError>;
    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError>;
}

impl ByteCodec for DpphHashKey {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_bytes(&mut out, &self.k1);
        write_canonical(&mut out, &self.k2_1)?;
        write_canonical(&mut out, &self.k2_2)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let k1 = reader.read_array_32()?;
        let k2_1 = reader.read_canonical::<Fr>()?;
        let k2_2 = reader.read_canonical::<Fr>()?;
        reader.finish()?;
        Ok(Self { k1, k2_1, k2_2 })
    }
}

impl ByteCodec for DpphTestKey {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_canonical(&mut out, &self.g1_k2_1)?;
        write_canonical(&mut out, &self.g2_k2_2)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let g1_k2_1 = reader.read_canonical::<G1Projective>()?;
        let g2_k2_2 = reader.read_canonical::<G2Projective>()?;
        reader.finish()?;
        Ok(Self { g1_k2_1, g2_k2_2 })
    }
}

impl ByteCodec for DpphHash {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_canonical(&mut out, &self.h1)?;
        write_canonical(&mut out, &self.h2)?;
        write_canonical(&mut out, &self.h3)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let h1 = reader.read_canonical::<G1Projective>()?;
        let h2 = reader.read_canonical::<G2Projective>()?;
        let h3 = reader.read_canonical::<G2Projective>()?;
        reader.finish()?;
        Ok(Self { h1, h2, h3 })
    }
}

impl ByteCodec for MoreMasterSecret {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        self.hash_key.to_bytes()
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        Ok(Self {
            hash_key: DpphHashKey::from_bytes(bytes)?,
        })
    }
}

impl ByteCodec for MoreQueryKey {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_bytes(&mut out, &self.k1);
        write_canonical(&mut out, &self.g2_k2_2)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let k1 = reader.read_array_32()?;
        let g2_k2_2 = reader.read_canonical::<G2Projective>()?;
        reader.finish()?;
        Ok(Self { k1, g2_k2_2 })
    }
}

impl ByteCodec for MoreCiphertext {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_params(&mut out, self.params);
        write_canonical(&mut out, &self.c0)?;
        write_len(&mut out, self.components.len())?;
        for component in &self.components {
            write_canonical(&mut out, component)?;
        }
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let params = reader.read_params()?;
        let c0 = reader.read_canonical::<G1Projective>()?;
        let len = reader.read_len()?;
        let mut components = Vec::with_capacity(len);
        for _ in 0..len {
            components.push(reader.read_canonical::<G1Projective>()?);
        }
        reader.finish()?;
        Ok(Self {
            c0,
            components,
            params,
        })
    }
}

impl ByteCodec for MoreToken {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_params(&mut out, self.params);
        write_canonical(&mut out, &self.t0)?;
        write_len(&mut out, self.components.len())?;
        for (left, right) in &self.components {
            write_canonical(&mut out, left)?;
            write_canonical(&mut out, right)?;
        }
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let params = reader.read_params()?;
        let t0 = reader.read_canonical::<G2Projective>()?;
        let len = reader.read_len()?;
        let mut components = Vec::with_capacity(len);
        for _ in 0..len {
            components.push((
                reader.read_canonical::<G2Projective>()?,
                reader.read_canonical::<G2Projective>()?,
            ));
        }
        reader.finish()?;
        Ok(Self {
            t0,
            components,
            params,
        })
    }
}

impl ByteCodec for SdOreSecretKey {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_bytes(&mut out, &self.key);
        write_u32_vec(&mut out, &self.permutation)?;
        write_u32_vec(&mut out, &self.inverse_permutation)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let key = reader.read_array_32()?;
        let permutation = reader.read_u32_vec()?;
        let inverse_permutation = reader.read_u32_vec()?;
        reader.finish()?;
        Ok(Self {
            key,
            permutation,
            inverse_permutation,
        })
    }
}

impl ByteCodec for SdOreLeftCiphertext {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_bytes(&mut out, &self.prf_at_permuted_value);
        write_u32(&mut out, self.permuted_value);
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let prf_at_permuted_value = reader.read_array_32()?;
        let permuted_value = reader.read_u32()?;
        reader.finish()?;
        Ok(Self {
            prf_at_permuted_value,
            permuted_value,
        })
    }
}

impl ByteCodec for SdOreRightCiphertext {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_bytes(&mut out, &self.nonce);
        write_len(&mut out, self.masked_cmp.len())?;
        write_bytes(&mut out, &self.masked_cmp);
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let nonce = reader.read_array_32()?;
        let len = reader.read_len()?;
        let masked_cmp = reader.read_bytes(len)?.to_vec();
        reader.finish()?;
        Ok(Self { nonce, masked_cmp })
    }
}

impl ByteCodec for MhOreMasterSecret {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_nested(&mut out, &self.more_master)?;
        write_nested(&mut out, &self.sd_ore_key)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let more_master = reader.read_nested::<MoreMasterSecret>()?;
        let sd_ore_key = reader.read_nested::<SdOreSecretKey>()?;
        reader.finish()?;
        Ok(Self {
            more_master,
            sd_ore_key,
        })
    }
}

impl ByteCodec for MhOreQueryKey {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_nested(&mut out, &self.more_query)?;
        write_nested(&mut out, &self.sd_ore_key)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let more_query = reader.read_nested::<MoreQueryKey>()?;
        let sd_ore_key = reader.read_nested::<SdOreSecretKey>()?;
        reader.finish()?;
        Ok(Self {
            more_query,
            sd_ore_key,
        })
    }
}

impl ByteCodec for MhOreCiphertext {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_nested(&mut out, &self.bit_length_right)?;
        write_nested(&mut out, &self.more_ciphertext)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let bit_length_right = reader.read_nested::<SdOreRightCiphertext>()?;
        let more_ciphertext = reader.read_nested::<MoreCiphertext>()?;
        reader.finish()?;
        Ok(Self {
            bit_length_right,
            more_ciphertext,
        })
    }
}

impl ByteCodec for MhOreToken {
    fn to_bytes(&self) -> Result<Vec<u8>, OreError> {
        let mut out = Vec::new();
        write_nested(&mut out, &self.bit_length_left)?;
        write_nested(&mut out, &self.more_token)?;
        Ok(out)
    }

    fn from_bytes(bytes: &[u8]) -> Result<Self, OreError> {
        let mut reader = Reader::new(bytes);
        let bit_length_left = reader.read_nested::<SdOreLeftCiphertext>()?;
        let more_token = reader.read_nested::<MoreToken>()?;
        reader.finish()?;
        Ok(Self {
            bit_length_left,
            more_token,
        })
    }
}

fn write_canonical<T: CanonicalSerialize>(out: &mut Vec<u8>, value: &T) -> Result<(), OreError> {
    let mut bytes = Vec::new();
    value
        .serialize_compressed(&mut bytes)
        .map_err(|err| OreError::Serialization(err.to_string()))?;
    write_len(out, bytes.len())?;
    write_bytes(out, &bytes);
    Ok(())
}

fn write_nested<T: ByteCodec>(out: &mut Vec<u8>, value: &T) -> Result<(), OreError> {
    let bytes = value.to_bytes()?;
    write_len(out, bytes.len())?;
    write_bytes(out, &bytes);
    Ok(())
}

fn write_params(out: &mut Vec<u8>, params: SecurityParams) {
    out.extend_from_slice(&params.value_bits.to_be_bytes());
    out.extend_from_slice(&params.max_clients.to_be_bytes());
}

fn write_u32_vec(out: &mut Vec<u8>, values: &[u32]) -> Result<(), OreError> {
    write_len(out, values.len())?;
    for value in values {
        write_u32(out, *value);
    }
    Ok(())
}

fn write_len(out: &mut Vec<u8>, len: usize) -> Result<(), OreError> {
    let len = u32::try_from(len)
        .map_err(|_| OreError::Serialization("length exceeds u32::MAX".to_string()))?;
    write_u32(out, len);
    Ok(())
}

fn write_u32(out: &mut Vec<u8>, value: u32) {
    out.extend_from_slice(&value.to_be_bytes());
}

fn write_bytes(out: &mut Vec<u8>, bytes: &[u8]) {
    out.extend_from_slice(bytes);
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn read_canonical<T: CanonicalDeserialize>(&mut self) -> Result<T, OreError> {
        let bytes = self.read_len_prefixed_bytes()?;
        T::deserialize_compressed(&mut &*bytes)
            .map_err(|err| OreError::Serialization(err.to_string()))
    }

    fn read_nested<T: ByteCodec>(&mut self) -> Result<T, OreError> {
        T::from_bytes(self.read_len_prefixed_bytes()?)
    }

    fn read_params(&mut self) -> Result<SecurityParams, OreError> {
        let value_bits = self.read_u16()?;
        let max_clients = self.read_u32()?;
        SecurityParams::new(value_bits, max_clients)
    }

    fn read_u32_vec(&mut self) -> Result<Vec<u32>, OreError> {
        let len = self.read_len()?;
        let mut values = Vec::with_capacity(len);
        for _ in 0..len {
            values.push(self.read_u32()?);
        }
        Ok(values)
    }

    fn read_len_prefixed_bytes(&mut self) -> Result<&'a [u8], OreError> {
        let len = self.read_len()?;
        self.read_bytes(len)
    }

    fn read_len(&mut self) -> Result<usize, OreError> {
        Ok(self.read_u32()? as usize)
    }

    fn read_u16(&mut self) -> Result<u16, OreError> {
        let bytes = self.read_bytes(2)?;
        Ok(u16::from_be_bytes([bytes[0], bytes[1]]))
    }

    fn read_u32(&mut self) -> Result<u32, OreError> {
        let bytes = self.read_bytes(4)?;
        Ok(u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    fn read_array_32(&mut self) -> Result<[u8; 32], OreError> {
        let bytes = self.read_bytes(32)?;
        let mut out = [0u8; 32];
        out.copy_from_slice(bytes);
        Ok(out)
    }

    fn read_bytes(&mut self, len: usize) -> Result<&'a [u8], OreError> {
        let end = self
            .offset
            .checked_add(len)
            .ok_or_else(|| OreError::Serialization("length overflow".to_string()))?;
        if end > self.bytes.len() {
            return Err(OreError::Serialization(
                "unexpected end of input".to_string(),
            ));
        }
        let bytes = &self.bytes[self.offset..end];
        self.offset = end;
        Ok(bytes)
    }

    fn finish(&self) -> Result<(), OreError> {
        if self.offset != self.bytes.len() {
            return Err(OreError::Serialization("trailing bytes".to_string()));
        }
        Ok(())
    }
}
