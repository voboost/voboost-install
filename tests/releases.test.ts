import { describe, it, expect } from 'vitest';
import {
    formatFileSize,
    formatDate,
    getLatestByTrack,
    getLatestAppByTrack,
    getReleasesByComponent,
    compareVersions,
} from '../src/services/releases';
import type { ReleasesManifest, Release } from '../src/types/releases';

/** Build a minimal Release with required unified-schema fields. */
function makeRelease(over: Partial<Release>): Release {
    return {
        component: 'app',
        track: 'production',
        version: '0.0.0',
        releasedAt: '2024-01-01',
        downloadUrl: '',
        sha256: '',
        size: 0,
        ...over,
    };
}

function manifestOf(releases: Release[]): ReleasesManifest {
    return { schemaVersion: 1, releases };
}

describe('Releases Utils', () => {
    describe('formatFileSize', () => {
        it('should format bytes correctly', () => {
            expect(formatFileSize(500)).toBe('500 B');
            expect(formatFileSize(0)).toBe('0 B');
        });

        it('should format kilobytes correctly', () => {
            expect(formatFileSize(1536)).toBe('1.5 KB');
        });

        it('should format megabytes correctly', () => {
            expect(formatFileSize(15728640)).toBe('15.0 MB');
            expect(formatFileSize(1048576)).toBe('1.0 MB');
        });
    });

    describe('formatDate', () => {
        it('should format date in English', () => {
            const result = formatDate('2024-11-15', 'en');
            expect(result).toContain('November');
            expect(result).toContain('15');
            expect(result).toContain('2024');
        });

        it('should format date in Russian', () => {
            const result = formatDate('2024-11-15', 'ru');
            // 'ноября' corresponds to November in genitive case which Intl uses
            expect(result).toContain('ноября');
        });
    });

    describe('compareVersions', () => {
        it('should order semver segments numerically', () => {
            expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
            expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
            expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
        });

        it('should treat missing segments as zero', () => {
            expect(compareVersions('1.0', '1.0.0')).toBe(0);
            expect(compareVersions('1.0.1', '1.0')).toBeGreaterThan(0);
        });
    });
});

describe('getReleasesByComponent', () => {
    it('should return only the requested component', () => {
        const manifest = manifestOf([
            makeRelease({ component: 'app', version: '1.0.0' }),
            makeRelease({ component: 'inject', version: '1.0.0' }),
            makeRelease({ component: 'app', version: '1.1.0' }),
        ]);

        const apps = getReleasesByComponent(manifest, 'app');
        expect(apps).toHaveLength(2);
        expect(apps.every((r) => r.component === 'app')).toBe(true);

        const injects = getReleasesByComponent(manifest, 'inject');
        expect(injects).toHaveLength(1);
        expect(injects[0].component).toBe('inject');
    });

    it('should return an empty array when no entries match', () => {
        const manifest = manifestOf([
            makeRelease({ component: 'app', version: '1.0.0' }),
        ]);
        expect(getReleasesByComponent(manifest, 'inject')).toHaveLength(0);
    });
});

describe('getLatestByTrack', () => {
    it('should return null for an empty manifest', () => {
        expect(getLatestByTrack(manifestOf([]), 'production')).toBeNull();
    });

    it('should filter by track and return the highest version', () => {
        const manifest = manifestOf([
            makeRelease({ track: 'production', version: '1.0.0' }),
            makeRelease({ track: 'testing', version: '1.1.0-beta' }),
            makeRelease({ track: 'production', version: '1.0.1' }),
        ]);

        const latest = getLatestByTrack(manifest, 'production');
        expect(latest).toBeDefined();
        expect(latest?.version).toBe('1.0.1');
    });

    it('should return null when no entries match the track', () => {
        const manifest = manifestOf([
            makeRelease({ track: 'production', version: '1.0.0' }),
        ]);
        expect(getLatestByTrack(manifest, 'testing')).toBeNull();
    });
});

describe('getLatestAppByTrack', () => {
    it('should filter by component AND track', () => {
        const manifest = manifestOf([
            makeRelease({ component: 'app', track: 'production', version: '1.0.0' }),
            makeRelease({ component: 'inject', track: 'production', version: '9.9.9' }),
            makeRelease({ component: 'app', track: 'testing', version: '2.0.0' }),
            makeRelease({ component: 'app', track: 'production', version: '1.1.0' }),
        ]);

        const latest = getLatestAppByTrack(manifest, 'production');
        expect(latest?.version).toBe('1.1.0');
        expect(latest?.component).toBe('app');
        expect(latest?.track).toBe('production');
    });

    it('should return null when no app entries exist on the track', () => {
        const manifest = manifestOf([
            makeRelease({ component: 'inject', track: 'production', version: '1.0.0' }),
            makeRelease({ component: 'app', track: 'testing', version: '1.0.0' }),
        ]);
        expect(getLatestAppByTrack(manifest, 'production')).toBeNull();
    });
});
