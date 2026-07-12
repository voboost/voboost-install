import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
    Release,
    ReleaseComponent,
    ReleaseTrack,
    ReleasesManifest,
    DownloadProgress,
} from '../types/releases';

export async function fetchReleases(): Promise<ReleasesManifest> {
    return invoke('fetch_releases');
}

export async function readLocalReleases(path: string): Promise<ReleasesManifest> {
    return invoke('read_local_releases', { path });
}

export async function downloadApk(
    url: string,
    expectedHash: string,
    version: string,
    onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
    if (onProgress) {
        const unlisten = await listen<DownloadProgress>('download-progress', (event) => {
            onProgress(event.payload);
        });

        try {
            return await invoke<string>('download_apk', { url, expectedHash, version });
        } finally {
            unlisten();
        }
    }

    return invoke('download_apk', { url, expectedHash, version });
}

export async function checkExistingApk(
    version: string,
    expectedHash: string
): Promise<string | null> {
    return invoke('check_existing_apk', { version, expectedHash });
}

/**
 * Filter manifest releases by `component` (design §3.5.2). The installer only
 * installs `component === "app"` releases; the daemon is provisioned via
 * `--daemon-bin` for the initial install and updated OTA by the app.
 */
export function getReleasesByComponent(
    manifest: ReleasesManifest,
    component: ReleaseComponent
): Release[] {
    return manifest.releases.filter((r) => r.component === component);
}

/**
 * Return the latest release for a given `track` across all components, picking
 * the highest version when multiple entries share the track. Replaces the old
 * `getLatestStable` / `getLatestBeta` helpers (design §3.7).
 */
export function getLatestByTrack(
    manifest: ReleasesManifest,
    track: ReleaseTrack
): Release | null {
    const filtered = manifest.releases.filter((r) => r.track === track);
    if (filtered.length === 0) return null;
    return filtered.reduce((latest, current) =>
        compareVersions(current.version, latest.version) > 0 ? current : latest
    );
}

/**
 * Return the latest `app` release for a given `track`. This is the
 * installer-specific helper: the version picker lists `component === "app"`
 * releases filtered by the selected track (design §3.5.2).
 */
export function getLatestAppByTrack(
    manifest: ReleasesManifest,
    track: ReleaseTrack
): Release | null {
    const filtered = manifest.releases.filter(
        (r) => r.component === 'app' && r.track === track
    );
    if (filtered.length === 0) return null;
    return filtered.reduce((latest, current) =>
        compareVersions(current.version, latest.version) > 0 ? current : latest
    );
}

export function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
    const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const da = pa[i] ?? 0;
        const db = pb[i] ?? 0;
        if (da !== db) return da - db;
    }
    return 0;
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
