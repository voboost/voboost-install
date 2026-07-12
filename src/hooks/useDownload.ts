import { useCallback } from 'react';
import { useAppStore } from '../store';
import {
    downloadApk,
    checkExistingApk,
    fetchReleases,
    getReleasesByComponent
} from '../services/releases';
import { open } from '@tauri-apps/plugin-dialog';

export function useDownload() {
    const {
        releases,
        setReleases,
        selectedTrack,
        selectedVersion,
        setSelectedVersion,
        downloadStatus,
        setDownloadStatus,
        setDownloadProgress,
        setDownloadedBytes,
        setTotalBytes,
        apkPath,
        setApkPath,
        error,
        setError,
    } = useAppStore();

    const loadReleases = useCallback(async () => {
        try {
            const manifest = await fetchReleases();
            setReleases(manifest.releases);

            // Auto-select the latest app release on the selected track
            // (design §3.5.2). The installer only installs `component === "app"`.
            const appForTrack = getReleasesByComponent(manifest, 'app')
                .filter((r) => r.track === selectedTrack);
            if (appForTrack.length > 0) {
                setSelectedVersion(appForTrack[0].version);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch releases');
        }
    }, [setReleases, selectedTrack, setSelectedVersion, setError]);

    const checkCached = useCallback(async () => {
        if (!selectedVersion) return;
        const release = releases.find((r) => r.version === selectedVersion);
        if (!release) return;

        const existingPath = await checkExistingApk(selectedVersion, release.sha256);
        if (existingPath) {
            setApkPath(existingPath);
            setDownloadStatus('ready');
        }
    }, [selectedVersion, releases, setApkPath, setDownloadStatus]);

    const startDownload = useCallback(async () => {
        const release = releases.find((r) => r.version === selectedVersion);
        if (!release) return;

        setDownloadStatus('downloading');
        setError(null);

        try {
            const path = await downloadApk(release.downloadUrl, release.sha256, release.version, (progress) => {
                setDownloadProgress(progress.percentage);
                setDownloadedBytes(progress.downloaded);
                setTotalBytes(progress.total);
            });

            setApkPath(path);
            setDownloadStatus('ready');
        } catch (err) {
            setDownloadStatus('error');
            setError(err instanceof Error ? err.message : 'Download failed');
        }
    }, [
        releases,
        selectedVersion,
        setDownloadStatus,
        setError,
        setDownloadProgress,
        setDownloadedBytes,
        setTotalBytes,
        setApkPath,
    ]);

    const selectLocalApk = useCallback(async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [
                    {
                        name: 'APK Files',
                        extensions: ['apk'],
                    },
                ],
            });
            if (selected && typeof selected === 'string') {
                setApkPath(selected);
                setDownloadStatus('ready');
                setSelectedVersion(null); // Deselect any online version
                setError(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'File selection failed');
        }
    }, [setApkPath, setDownloadStatus, setSelectedVersion, setError]);

    return {
        releases,
        selectedVersion,
        setSelectedVersion,
        downloadStatus,
        apkPath,
        error,
        loadReleases,
        checkCached,
        startDownload,
        selectLocalApk,
    };
}
