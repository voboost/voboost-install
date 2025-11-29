# Releases JSON Schema

## Overview

The installer fetches available versions from a `releases.json` file hosted on GitHub. This file contains metadata about all available releases including download URLs and checksums.

## Hosting Location

### releases.json

The `releases.json` file is hosted in the **root of the installer repository**:

```
voboost-install/releases.json
```

**Raw URL**:
```
https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json
```

### APK Files

APK files are hosted in the **main app repository** as GitHub Release assets:

```
https://github.com/voboost/voboost/releases/download/v1.2.0/voboost-1.2.0.apk
```

### Repository Structure

```
voboost/                          # Main Android app repository
├── app/                          # Android app source
└── (GitHub Releases)             # APK files as release assets
    └── v1.2.0/
        └── voboost-1.2.0.apk

voboost-install/                  # Installer repository
├── releases.json                 # Release manifest (in root, points to voboost repo)
├── README.md
├── src/                          # Installer source
└── ...
```

### Why This Separation?

1. **Separation of concerns** - App and installer are different projects
2. **Independent versioning** - Installer can be updated without new APK
3. **Smaller installer repo** - No large APK files in installer repo
4. **Flexible updates** - Can update releases.json without rebuilding installer

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Voboost Releases",
  "type": "object",
  "required": ["schemaVersion", "releases"],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "description": "Schema version for backward compatibility",
      "minimum": 1
    },
    "releases": {
      "type": "array",
      "description": "List of available releases",
      "items": {
        "$ref": "#/definitions/Release"
      }
    }
  },
  "definitions": {
    "Release": {
      "type": "object",
      "required": ["version", "channel", "releaseDate", "downloadUrl", "sha256", "size"],
      "properties": {
        "version": {
          "type": "string",
          "description": "Semantic version",
          "pattern": "^\\d+\\.\\d+\\.\\d+(-beta\\.\\d+)?$",
          "examples": ["1.2.0", "1.3.0-beta.1"]
        },
        "channel": {
          "type": "string",
          "description": "Release channel",
          "enum": ["stable", "beta"]
        },
        "releaseDate": {
          "type": "string",
          "description": "Release date in ISO 8601 format",
          "format": "date",
          "examples": ["2024-11-15"]
        },
        "downloadUrl": {
          "type": "string",
          "description": "Direct download URL for APK file",
          "format": "uri"
        },
        "sha256": {
          "type": "string",
          "description": "SHA256 hash of APK file (lowercase hex)",
          "pattern": "^[a-f0-9]{64}$"
        },
        "size": {
          "type": "integer",
          "description": "File size in bytes",
          "minimum": 0
        },
        "minAndroidVersion": {
          "type": "integer",
          "description": "Minimum Android API level",
          "default": 28,
          "minimum": 21
        },
        "changelog": {
          "type": "object",
          "description": "Changelog in multiple languages",
          "properties": {
            "en": {
              "type": "string",
              "description": "English changelog"
            },
            "ru": {
              "type": "string",
              "description": "Russian changelog"
            }
          }
        }
      }
    }
  }
}
```

## Example releases.json

```json
{
  "schemaVersion": 1,
  "releases": [
    {
      "version": "1.2.0",
      "channel": "stable",
      "releaseDate": "2024-11-15",
      "downloadUrl": "https://github.com/voboost/voboost/releases/download/v1.2.0/voboost-1.2.0.apk",
      "sha256": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
      "size": 15728640,
      "minAndroidVersion": 28,
      "changelog": {
        "en": "- New feature: Quick settings panel\n- Bug fix: Bluetooth connection stability\n- Performance improvements",
        "ru": "- Новая функция: Панель быстрых настроек\n- Исправление: Стабильность Bluetooth соединения\n- Улучшения производительности"
      }
    },
    {
      "version": "1.3.0-beta.1",
      "channel": "beta",
      "releaseDate": "2024-11-20",
      "downloadUrl": "https://github.com/voboost/voboost/releases/download/v1.3.0-beta.1/voboost-1.3.0-beta.1.apk",
      "sha256": "b2c3d4e5f6789012345678901234567890123456789012345678901234abcde",
      "size": 16252928,
      "minAndroidVersion": 28,
      "changelog": {
        "en": "- Beta: New dashboard layout\n- Beta: Voice control integration\n- Experimental features",
        "ru": "- Бета: Новый макет панели\n- Бета: Интеграция голосового управления\n- Экспериментальные функции"
      }
    },
    {
      "version": "1.1.0",
      "channel": "stable",
      "releaseDate": "2024-10-01",
      "downloadUrl": "https://github.com/voboost/voboost/releases/download/v1.1.0/voboost-1.1.0.apk",
      "sha256": "c3d4e5f6789012345678901234567890123456789012345678901234abcdef",
      "size": 14680064,
      "minAndroidVersion": 28,
      "changelog": {
        "en": "- Initial stable release\n- Basic vehicle controls\n- Settings management",
        "ru": "- Первый стабильный релиз\n- Базовое управление автомобилем\n- Управление настройками"
      }
    }
  ]
}
```

## TypeScript Types

```typescript
// src/types/releases.ts

export interface Release {
  version: string;
  channel: 'stable' | 'beta';
  releaseDate: string;
  downloadUrl: string;
  sha256: string;
  size: number;
  minAndroidVersion?: number;
  changelog?: {
    en?: string;
    ru?: string;
  };
}

export interface ReleasesManifest {
  schemaVersion: number;
  releases: Release[];
}
```

## Rust Implementation

```rust
// src-tauri/src/commands/download.rs

use serde::{Deserialize, Serialize};
use reqwest;
use sha2::{Sha256, Digest};
use std::path::PathBuf;
use std::fs::File;
use std::io::{Read, Write};
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub version: String,
    pub channel: String,
    pub release_date: String,
    pub download_url: String,
    pub sha256: String,
    pub size: u64,
    pub min_android_version: Option<u32>,
    pub changelog: Option<Changelog>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Changelog {
    pub en: Option<String>,
    pub ru: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleasesManifest {
    pub schema_version: u32,
    pub releases: Vec<Release>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
}

const RELEASES_URL: &str = "https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json";

/// Fetch releases manifest from GitHub
#[tauri::command]
pub async fn fetch_releases() -> Result<ReleasesManifest, String> {
    let response = reqwest::get(RELEASES_URL)
        .await
        .map_err(|e| format!("Failed to fetch releases: {}", e))?;

    let manifest: ReleasesManifest = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse releases: {}", e))?;

    Ok(manifest)
}

/// Download APK file with progress reporting
#[tauri::command]
pub async fn download_apk(
    app: AppHandle,
    url: String,
    expected_hash: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);

    // Create temp file
    let temp_dir = std::env::temp_dir();
    let file_name = url.split('/').last().unwrap_or("voboost.apk");
    let file_path = temp_dir.join(file_name);

    let mut file = File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Write error: {}", e))?;

        downloaded += chunk.len() as u64;

        // Emit progress event
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

    // Verify hash
    let hash = calculate_sha256(&file_path)?;
    if hash != expected_hash {
        std::fs::remove_file(&file_path).ok();
        return Err(format!(
            "Hash mismatch. Expected: {}, Got: {}",
            expected_hash, hash
        ));
    }

    Ok(file_path.to_string_lossy().to_string())
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

    let hash = calculate_sha256(&file_path)?;
    if hash == expected_hash {
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        // Hash mismatch, delete corrupted file
        std::fs::remove_file(&file_path).ok();
        Ok(None)
    }
}

/// Calculate SHA256 hash of file
fn calculate_sha256(path: &PathBuf) -> Result<String, String> {
    let mut file = File::open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file.read(&mut buffer)
            .map_err(|e| format!("Read error: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    let hash = hasher.finalize();
    Ok(hex::encode(hash))
}
```

## TypeScript Service

```typescript
// src/services/releases.ts

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Release, ReleasesManifest } from '../types/releases';

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export async function fetchReleases(): Promise<ReleasesManifest> {
  return invoke('fetch_releases');
}

export async function downloadApk(
  url: string,
  expectedHash: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
  // Listen for progress events
  if (onProgress) {
    const unlisten = await listen<DownloadProgress>('download-progress', (event) => {
      onProgress(event.payload);
    });

    try {
      const result = await invoke<string>('download_apk', { url, expectedHash });
      return result;
    } finally {
      // Always cleanup listener, whether success or error
      unlisten();
    }
  }

  return invoke('download_apk', { url, expectedHash });
}

export async function checkExistingApk(
  version: string,
  expectedHash: string
): Promise<string | null> {
  return invoke('check_existing_apk', { version, expectedHash });
}

// Helper functions

export function getLatestStable(releases: Release[]): Release | undefined {
  return releases.find(r => r.channel === 'stable');
}

export function getLatestBeta(releases: Release[]): Release | undefined {
  return releases.find(r => r.channel === 'beta');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

## Updating releases.json

When releasing a new version:

1. Build the APK
2. Calculate SHA256:
   - Linux/macOS: `sha256sum voboost-1.2.0.apk`
   - Windows: `certutil -hashfile voboost-1.2.0.apk SHA256`
3. Upload APK to GitHub Releases
4. Update `releases.json` with new entry
5. Commit and push

### GitHub Actions Automation

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build APK
        run: ./gradlew assembleRelease

      - name: Calculate SHA256
        id: hash
        run: |
          HASH=$(sha256sum app/build/outputs/apk/release/voboost-*.apk | cut -d' ' -f1)
          echo "sha256=$HASH" >> $GITHUB_OUTPUT

      - name: Update releases.json
        run: |
          # Script to update releases.json with new version
          python scripts/update-releases.py \
            --version ${{ github.ref_name }} \
            --hash ${{ steps.hash.outputs.sha256 }}

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: app/build/outputs/apk/release/voboost-*.apk
```
