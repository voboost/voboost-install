/**
 * Unified OTA manifest types (design §3.3).
 *
 * The unified manifest is a single signed document consumed by both the
 * `voboost` app and `voboost-install`. It replaces the old `releases.json`
 * schema (`channel: stable|beta`) with two orthogonal fields:
 *
 * - `component` (`app` | `inject`) — which artifact the entry describes.
 *   Replaces the app's old `channel: app|core`. The installer only installs
 *   `component === "app"` releases; the daemon is provisioned via
 *   `--daemon-bin` for the initial install and updated OTA by the app.
 * - `track` (`dev` | `testing` | `production`) — the release track. Replaces
 *   the installer's old `channel: stable|beta` and adds the `dev` track.
 *   Filtered client-side by a setting (default `production`).
 */

export interface StepDefinition {
    do?: string;
    title?: Record<string, string>;
    command?: string[];
    args?: string[];
    var?: Record<string, string>;
    fatal?: boolean;
    retry_count?: number;
    retry_delay_secs?: number;
}

/** Which artifact a release entry describes (design §3.3). */
export type ReleaseComponent = 'app' | 'inject';

/** Release track, filtered client-side by a setting (design §3.7). */
export type ReleaseTrack = 'dev' | 'testing' | 'production';

export interface Release {
    component: ReleaseComponent;
    track: ReleaseTrack;
    version: string;
    releasedAt: string;
    downloadUrl: string;
    sha256: string;
    size: number;
    minAndroidVersion?: number;
    changelog?: {
        en?: string;
        ru?: string;
    };
    installScenario?: string;
    uninstallScenario?: string;
}

export interface Scenarios {
    install?: Record<string, StepDefinition[]>;
    uninstall?: Record<string, StepDefinition[]>;
}

export interface ReleasesManifest {
    schemaVersion: number;
    generatedAt?: string;
    releases: Release[];
    scenarios?: Scenarios;
}

export interface DownloadProgress {
    downloaded: number;
    total: number;
    percentage: number;
}
