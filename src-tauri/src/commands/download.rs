use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;

use crate::utils::logger;

/// The unified OTA release manifest public key (PEM SubjectPublicKeyInfo,
/// ed25519). Embedded at build time so the installer trusts exactly the key
/// committed in `config/release-public.pem` (per the unified-manifest design
/// §3.4). The private half is gitignored and stored as a CI secret.
const RELEASE_PUBLIC_KEY_PEM: &[u8] =
    include_bytes!("../../../config/release-public.pem");

/// Default production manifest URL (GitHub raw, CDN-cached ~5 min).
/// `releases/manifest.json` is the single source of truth for both the
/// `voboost` app and `voboost-install` (design §3.2).
const DEFAULT_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/voboost/voboost-install/main/releases/manifest.json";

/// Default production manifest signature URL. Derived from the manifest URL
/// by replacing the `.json` suffix with `.sig` (design §3.5.2).
const DEFAULT_MANIFEST_SIG_URL: &str =
    "https://raw.githubusercontent.com/voboost/voboost-install/main/releases/manifest.sig";

/// Build-time-configurable manifest URL. Set `MANIFEST_URL` at build time to
/// point at a `file://` path for local testing (design §0.3 / §3.5.2).
fn get_manifest_url() -> String {
    option_env!("MANIFEST_URL")
        .unwrap_or(DEFAULT_MANIFEST_URL)
        .to_string()
}

/// Build-time-configurable manifest signature URL. Defaults to the derived
/// production URL; override with `MANIFEST_SIG_URL` for local testing.
fn get_manifest_sig_url() -> String {
    option_env!("MANIFEST_SIG_URL")
        .unwrap_or(DEFAULT_MANIFEST_SIG_URL)
        .to_string()
}

/// A single release entry in the unified manifest (design §3.3).
///
/// `component` (app|inject) replaces the old app `channel: app|core` and is
/// orthogonal to `track`. `track` (dev|testing|production) replaces the old
/// installer `channel: stable|beta`. The installer only installs
/// `component == "app"` releases; the daemon is provisioned via `--daemon-bin`
/// for the initial install and updated OTA by the app thereafter.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub component: String,
    pub track: String,
    pub version: String,
    pub released_at: String,
    pub download_url: String,
    pub sha256: String,
    pub size: u64,
    pub min_android_version: Option<u32>,
    pub changelog: Option<Changelog>,
    pub install_scenario: Option<String>,
    pub uninstall_scenario: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Changelog {
    pub en: Option<String>,
    pub ru: Option<String>,
}

/// The unified signed OTA manifest (design §3.3). One signed document consumed
/// by both `voboost` (app) and `voboost-install` (desktop installer).
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleasesManifest {
    pub schema_version: u32,
    pub generated_at: Option<String>,
    pub releases: Vec<Release>,
    pub scenarios: Option<Scenarios>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scenarios {
    pub install:
        Option<std::collections::HashMap<String, Vec<crate::commands::install::StepDefinition>>>,
    pub uninstall:
        Option<std::collections::HashMap<String, Vec<crate::commands::install::StepDefinition>>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
}

/// Parse the embedded PEM SubjectPublicKeyInfo (ed25519) into a raw 32-byte
/// verifying key. The PEM is produced by `openssl genpkey -algorithm ed25519`
/// and is a standard SPKI (`-----BEGIN PUBLIC KEY-----`).
fn parse_public_key(pem: &[u8]) -> Result<VerifyingKey, String> {
    use base64ct::{Base64, Encoding};
    use pkcs8::spki::SubjectPublicKeyInfoRef;

    let pem_str = std::str::from_utf8(pem)
        .map_err(|e| format!("release-public.pem is not valid UTF-8: {}", e))?;
    // The PEM is a standard SubjectPublicKeyInfo (`-----BEGIN PUBLIC KEY-----`)
    // produced by `openssl genpkey -algorithm ed25519`. We strip the PEM
    // armor and base64-decode the DER body, then parse it as an SPKI ref.
    // This avoids the `DecodePublicKey` trait bound issues with the owned
    // SPKI type and only needs the `der` + `spki` crates already pulled in.
    let b64 = pem_str
        .lines()
        .filter(|line| !line.starts_with("-----"))
        .collect::<String>();
    let der = Base64::decode_vec(&b64)
        .map_err(|e| format!("Failed to base64-decode release-public.pem: {}", e))?;
    let spki = SubjectPublicKeyInfoRef::try_from(&der[..])
        .map_err(|e| format!("Failed to parse SPKI DER: {}", e))?;
    // For ed25519 the subject_public_key is the raw 32-byte verifying key.
    let pub_key_bytes = spki.subject_public_key.as_bytes().ok_or_else(|| {
        "release-public.pem has an empty subject_public_key".to_string()
    })?;
    let key_bytes: [u8; 32] = pub_key_bytes.try_into().map_err(|_| {
        "release-public.pem does not contain a 32-byte ed25519 key".to_string()
    })?;
    VerifyingKey::from_bytes(&key_bytes)
        .map_err(|e| format!("Invalid ed25519 public key: {}", e))
}

/// Verify a raw 64-byte detached ed25519 signature over the exact manifest
/// bytes. The signature is produced by `openssl pkeyutl -sign -rawin` (raw
/// Ed25519, no prehash). Returns Ok(()) on success, Err on any failure.
fn verify_manifest_signature(
    manifest_bytes: &[u8],
    sig_bytes: &[u8],
) -> Result<(), String> {
    let verifying_key = parse_public_key(RELEASE_PUBLIC_KEY_PEM)?;
    let signature = Signature::from_slice(sig_bytes).map_err(|e| {
        format!("Invalid signature length (expected 64 bytes): {}", e)
    })?;
    verifying_key
        .verify(manifest_bytes, &signature)
        .map_err(|_| "Manifest signature verification failed".to_string())
}

/// Read bytes from a `file://` URL (local testing, design §0.3) or fetch via
/// HTTPS for `https://` URLs. Returns the raw bytes so the caller can verify
/// the signature over the exact bytes before parsing.
async fn fetch_bytes(url: &str) -> Result<Vec<u8>, String> {
    if let Some(path) = url.strip_prefix("file://") {
        std::fs::read(path)
            .map_err(|e| format!("Failed to read file://{}: {}", path, e))
    } else {
        let response = reqwest::get(url)
            .await
            .map_err(|e| format!("Failed to fetch {}: {}", url, e))?;
        response
            .bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(|e| format!("Failed to read body from {}: {}", url, e))
    }
}

/// Fetch the unified OTA manifest from GitHub (or a local `file://` URL for
/// testing) and verify its detached ed25519 signature before parsing.
///
/// Per the unified-manifest design §3.5.2, the installer fetches BOTH
/// `manifest.json` and `manifest.sig`, verifies the signature over the exact
/// manifest bytes against the embedded `config/release-public.pem`, and only
/// parses the manifest after verification succeeds. This closes the previous
/// "unsigned manifest" gap (design §1.2.3).
#[tauri::command]
pub async fn fetch_releases() -> Result<ReleasesManifest, String> {
    let url = get_manifest_url();
    let sig_url = get_manifest_sig_url();
    logger::log("INFO", &format!("Fetching manifest from: {}", url));
    logger::log("INFO", &format!("Fetching signature from: {}", sig_url));

    let manifest_bytes = fetch_bytes(&url).await?;
    let sig_bytes = fetch_bytes(&sig_url).await?;

    verify_manifest_signature(&manifest_bytes, &sig_bytes)?;
    logger::log("SUCCESS", "Manifest signature verified");

    let manifest: ReleasesManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    logger::log(
        "INFO",
        &format!("Found {} releases", manifest.releases.len()),
    );
    Ok(manifest)
}

/// Read a local releases manifest from a file path. Kept for the "Choose
/// releases.json" UI affordance; the manifest is parsed WITHOUT signature
/// verification because the operator explicitly chose a local file (the
/// signed path is `fetch_releases` with a `file://` MANIFEST_URL).
#[tauri::command]
pub async fn read_local_releases(path: String) -> Result<ReleasesManifest, String> {
    logger::log(
        "INFO",
        &format!("Reading local releases manifest from: {}", path),
    );

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let manifest: ReleasesManifest = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse local releases JSON: {}", e))?;

    logger::log(
        "INFO",
        &format!("Found {} local releases", manifest.releases.len()),
    );
    Ok(manifest)
}

/// Download APK file with progress reporting.
///
/// Per the `release-manifest` spec, the temp file is named
/// `voboost-<version>.apk` (the same name used by `check_existing_apk`) and
/// written to `std::env::temp_dir()`. The file handle is flushed and synced
/// before the SHA256 is computed so the hash is taken over the full streamed
/// body, not a truncated on-disk view. Any error after the file is created
/// removes the partial file so a truncated artifact is never left on disk.
///
/// `file://` URLs (local testing, design §0.3) are copied directly from the
/// local file instead of HTTP; HTTPS validation is relaxed for `file://`.
#[tauri::command]
pub async fn download_apk(
    app: AppHandle,
    url: String,
    expected_hash: String,
    version: String,
) -> Result<String, String> {
    logger::log("INFO", &format!("Starting download: {}", url));

    let temp_dir = std::env::temp_dir();
    let file_name = apk_temp_file_name(&version);
    let file_path = temp_dir.join(&file_name);

    // `file://` path: copy the local file directly (no HTTP, no HTTPS check).
    // Used for local testing with `file://` APK URLs in the manifest.
    if let Some(local_path) = url.strip_prefix("file://") {
        logger::log(
            "INFO",
            &format!("Copying local APK from file://{}", local_path),
        );
        let result: Result<String, String> = async {
            std::fs::copy(local_path, &file_path).map_err(|e| {
                format!("Failed to copy local APK: {}", e)
            })?;
            let downloaded = std::fs::metadata(&file_path)
                .map(|m| m.len())
                .unwrap_or(0);
            let _ = app.emit(
                "download-progress",
                &DownloadProgress {
                    downloaded,
                    total: downloaded,
                    percentage: 100.0,
                },
            );
            verify_apk_hash(&file_path, &expected_hash)?;
            logger::log("SUCCESS", "Hash verified successfully");
            Ok(file_path.to_string_lossy().to_string())
        }
        .await;
        if result.is_err() {
            let _ = std::fs::remove_file(&file_path);
        }
        return result;
    }

    // Validate HTTPS for non-file URLs.
    if !url.starts_with("https://") {
        return Err("Insecure URL rejected. HTTPS required.".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);

    // Inner block: stream, flush, sync, hash. On any error we fall through
    // to the cleanup below so a partial temp file is never left on disk.
    let result: Result<String, String> = async {
        let mut file = File::create(&file_path)
            .map_err(|e| format!("Failed to create file: {}", e))?;

        let mut downloaded: u64 = 0;
        let mut stream = response.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
            file.write_all(&chunk)
                .map_err(|e| format!("Write error: {}", e))?;

            downloaded += chunk.len() as u64;

            let progress = DownloadProgress {
                downloaded,
                total: total_size,
                percentage: if total_size > 0 {
                    (downloaded as f64 / total_size as f64) * 100.0
                } else {
                    0.0
                },
            };

            let _ = app.emit("download-progress", &progress);
        }

        // Flush + sync the buffered writer before hashing so the SHA256 is
        // computed over the full streamed body, not a truncated on-disk view.
        file.flush().map_err(|e| format!("Flush error: {}", e))?;
        file.sync_all().map_err(|e| format!("Sync error: {}", e))?;
        drop(file);

        logger::log(
            "INFO",
            &format!("Download complete: {} bytes", downloaded),
        );

        verify_apk_hash(&file_path, &expected_hash)?;
        logger::log("SUCCESS", "Hash verified successfully");
        Ok(file_path.to_string_lossy().to_string())
    }
    .await;

    if result.is_err() {
        // Best-effort cleanup of the partial temp file on any error path
        // (write/flush/sync/hash) so a truncated artifact is never reused.
        let _ = std::fs::remove_file(&file_path);
    }
    result
}

/// Verify the SHA256 of a downloaded APK against the expected hash. Extracted
/// so both the `file://` and HTTPS download paths share one verification step.
fn verify_apk_hash(file_path: &PathBuf, expected_hash: &str) -> Result<(), String> {
    logger::log("INFO", "Verifying SHA256 hash...");
    let hash = calculate_sha256(file_path)?;
    if hash != expected_hash {
        logger::log(
            "ERROR",
            &format!(
                "Hash mismatch. Expected: {}, Got: {}",
                expected_hash, hash
            ),
        );
        return Err(format!(
            "Hash mismatch. Expected: {}, Got: {}",
            expected_hash, hash
        ));
    }
    Ok(())
}

/// Check if APK already exists and verify hash
#[tauri::command]
pub async fn check_existing_apk(
    version: String,
    expected_hash: String,
) -> Result<Option<String>, String> {
    let temp_dir = std::env::temp_dir();
    let file_name = format!("voboost-{}.apk", version);
    let file_path = temp_dir.join(&file_name);

    if !file_path.exists() {
        return Ok(None);
    }

    match calculate_sha256(&file_path) {
        Ok(hash) if hash == expected_hash => {
            logger::log("INFO", &format!("Found cached APK: {}", file_name));
            Ok(Some(file_path.to_string_lossy().to_string()))
        }
        _ => {
            // Hash mismatch or read error, delete corrupted file
            std::fs::remove_file(&file_path).ok();
            Ok(None)
        }
    }
}

/// Build the version-scoped temp file name used by both `download_apk` and
/// `check_existing_apk` so a downloaded APK is reused by the cache lookup.
///
/// Extracted as a pure helper so the naming contract is unit-testable without
/// a Tauri `AppHandle` or network access.
fn apk_temp_file_name(version: &str) -> String {
    format!("voboost-{}.apk", version)
}

/// Calculate SHA256 hash of file
fn calculate_sha256(path: &PathBuf) -> Result<String, String> {
    let mut file =
        File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read =
            file.read(&mut buffer).map_err(|e| format!("Read error: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_calculate_sha256() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("test_hash.bin");
        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"Hello, World!").unwrap();
        drop(file);

        let hash = calculate_sha256(&file_path).unwrap();
        std::fs::remove_file(&file_path).ok();

        assert_eq!(
            hash,
            "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"
        );
    }

    #[test]
    fn test_calculate_sha256_empty_file() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("test_hash_empty.bin");
        File::create(&file_path).unwrap();

        let hash = calculate_sha256(&file_path).unwrap();
        std::fs::remove_file(&file_path).ok();

        assert_eq!(
            hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_apk_temp_file_name_matches_cache_name() {
        // The download temp file name MUST match the name checked by
        // `check_existing_apk(version, hash)` so the cache actually hits.
        // `check_existing_apk` looks for `voboost-<version>.apk`.
        assert_eq!(apk_temp_file_name("1.2.3"), "voboost-1.2.3.apk");
        assert_eq!(apk_temp_file_name("0.0.1"), "voboost-0.0.1.apk");
    }

    #[test]
    fn test_apk_temp_file_name_distinct_per_version() {
        // Two different versions must produce two different file names so
        // concurrent downloads of different releases do not collide.
        let a = apk_temp_file_name("1.0.0");
        let b = apk_temp_file_name("2.0.0");
        assert_ne!(a, b);
    }

    /// The embedded release-public.pem must parse into a valid ed25519
    /// verifying key. This guards against a corrupted or replaced key file
    /// silently breaking signature verification.
    #[test]
    fn test_parse_embedded_public_key() {
        let key = parse_public_key(RELEASE_PUBLIC_KEY_PEM);
        assert!(key.is_ok(), "embedded release-public.pem must parse");
    }

    /// Verify the committed `releases/manifest.json` against
    /// `releases/manifest.sig` using the embedded public key. This is the
    /// round-trip validation required by the task: it proves the manifest
    /// served from GitHub raw will verify in the installer.
    #[test]
    fn test_verify_committed_manifest_signature() {
        let manifest_bytes = include_bytes!("../../../releases/manifest.json");
        let sig_bytes = include_bytes!("../../../releases/manifest.sig");
        let result = verify_manifest_signature(manifest_bytes, sig_bytes);
        assert!(
            result.is_ok(),
            "committed manifest.sig must verify against manifest.json: {:?}",
            result
        );
    }

    /// A tampered manifest must fail signature verification. This proves the
    /// verifier actually checks the bytes and is not a no-op.
    #[test]
    fn test_verify_rejects_tampered_manifest() {
        let mut manifest_bytes =
            include_bytes!("../../../releases/manifest.json").to_vec();
        let sig_bytes = include_bytes!("../../../releases/manifest.sig").to_vec();
        // Flip one byte in the manifest body so it no longer matches the sig.
        if let Some(byte) = manifest_bytes.last_mut() {
            *byte = byte.wrapping_add(1);
        }
        let result = verify_manifest_signature(&manifest_bytes, &sig_bytes);
        assert!(result.is_err(), "tampered manifest must be rejected");
    }

    /// A truncated (non-64-byte) signature must be rejected with a clear
    /// error rather than panicking.
    #[test]
    fn test_verify_rejects_short_signature() {
        let manifest_bytes = include_bytes!("../../../releases/manifest.json");
        let short_sig = [0u8; 32];
        let result = verify_manifest_signature(manifest_bytes, &short_sig);
        assert!(result.is_err(), "short signature must be rejected");
    }

    /// The default manifest and signature URLs must point at the GitHub raw
    /// source of truth (design §3.2), and the build-time override must be
    /// respected when set.
    #[test]
    fn test_default_manifest_urls_point_to_github() {
        assert!(get_manifest_url().starts_with("https://raw.githubusercontent.com/"));
        assert!(get_manifest_url().ends_with("/releases/manifest.json"));
        assert!(get_manifest_sig_url().ends_with("/releases/manifest.sig"));
    }
}
