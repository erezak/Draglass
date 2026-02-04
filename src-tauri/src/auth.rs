//! Vault Password Authentication
//!
//! Uses Argon2id for password hashing with a random salt.
//! This module provides Tauri commands for hashing and verifying passwords.
//!
//! Security notes:
//! - Salt is random 16 bytes encoded as base64
//! - Hash output is 32 bytes encoded as base64
//! - Uses Argon2id variant (hybrid of Argon2d and Argon2i)
//! - Memory cost: 19 MiB (2^14 KiB = 16384 KiB ≈ 16 MiB)
//! - Time cost: 2 iterations
//! - Parallelism: 1 lane

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, Params,
};
use rand::rngs::OsRng;
use serde::Serialize;

/// Result of password hashing
#[derive(Debug, Serialize)]
pub struct HashResult {
    pub hash: String,
    pub salt: String,
}

/// Parameters for Argon2 - conservative defaults for a desktop app
fn argon2_params() -> Params {
    // m_cost: 16 MiB, t_cost: 2, p_cost: 1, output_len: 32
    Params::new(16384, 2, 1, Some(32)).expect("valid argon2 params")
}

/// Hash a password with Argon2id.
///
/// If `existing_salt` is provided, uses that salt (for verification).
/// Otherwise, generates a new random salt.
pub fn hash_password_impl(password: &str, existing_salt: Option<&str>) -> Result<HashResult, String> {
    let salt = match existing_salt {
        Some(s) => SaltString::from_b64(s).map_err(|e| format!("invalid salt: {e}"))?,
        None => SaltString::generate(&mut OsRng),
    };

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, argon2_params());

    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("hashing failed: {e}"))?;

    Ok(HashResult {
        hash: hash.to_string(),
        salt: salt.to_string(),
    })
}

/// Verify a password against a stored hash.
pub fn verify_password_impl(password: &str, hash_str: &str) -> Result<bool, String> {
    let hash = PasswordHash::new(hash_str).map_err(|e| format!("invalid hash format: {e}"))?;

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, argon2_params());

    match argon2.verify_password(password.as_bytes(), &hash) {
        Ok(()) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(format!("verification failed: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_and_verify() {
        let password = "test_password_123";
        let result = hash_password_impl(password, None).unwrap();

        assert!(!result.hash.is_empty());
        assert!(!result.salt.is_empty());

        // Verify correct password
        assert!(verify_password_impl(password, &result.hash).unwrap());

        // Verify incorrect password
        assert!(!verify_password_impl("wrong_password", &result.hash).unwrap());
    }

    #[test]
    fn different_passwords_different_hashes() {
        let result1 = hash_password_impl("password1", None).unwrap();
        let result2 = hash_password_impl("password2", None).unwrap();

        assert_ne!(result1.hash, result2.hash);
    }

    #[test]
    fn same_password_different_salts() {
        let result1 = hash_password_impl("same_password", None).unwrap();
        let result2 = hash_password_impl("same_password", None).unwrap();

        // Different salts produce different hashes
        assert_ne!(result1.salt, result2.salt);
        assert_ne!(result1.hash, result2.hash);

        // Both should verify correctly
        assert!(verify_password_impl("same_password", &result1.hash).unwrap());
        assert!(verify_password_impl("same_password", &result2.hash).unwrap());
    }
}
