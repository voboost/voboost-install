import React, { useEffect, useState } from 'react';
import { useWizard } from 'react-use-wizard';
import {
    Button,
    Spinner,
    ProgressBar,
    Text,
    MessageBar,
    MessageBarBody,
    Dropdown,
    Option,
    makeStyles
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { injectBemClasses } from '../../utils/injectBemClasses';
import '../../components/MarkdownBlock';
import { getContent } from '../../content';
import { WizardLayout } from '../../components/WizardLayout';
import { VersionCard } from '../../components/VersionCard';
import { LogControls } from '../../components/LogControls';
import { useAppStore } from '../../store';
import {
    fetchReleases,
    readLocalReleases,
    downloadApk,
    checkExistingApk,
    formatFileSize,
    getReleasesByComponent
} from '../../services/releases';
import { open } from '@tauri-apps/plugin-dialog';
import { useSharedStyles } from '../../styles/shared';
import type { ReleaseTrack, ReleasesManifest } from '../../types/releases';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    versionList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flexShrink: 0,
        paddingRight: '8px',
    },
    progressContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        backgroundColor: 'var(--colorNeutralBackground2)',
        borderRadius: '8px',
    },
    progressStats: {
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--colorNeutralForeground2)',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
    },
    trackSelector: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    }
});

/**
 * Filter the unified manifest down to the `app` releases on the selected
 * track (design §3.5.2). The installer only installs `component === "app"`
 * releases; the daemon is provisioned via `--daemon-bin` for the initial
 * install and updated OTA by the app thereafter.
 */
function selectAppReleasesForTrack(
    manifest: ReleasesManifest,
    track: ReleaseTrack
) {
    return getReleasesByComponent(manifest, 'app').filter(
        (r) => r.track === track
    );
}

export function DownloadScreen() {
    const styles = useStyles();
    const sharedStyles = useSharedStyles();
    const { t } = useTranslation();
    const { nextStep, previousStep } = useWizard();
    const {
        language,
        releases,
        setReleases,
        setReleasesManifest,
        selectedTrack,
        setSelectedTrack,
        selectedVersion,
        setSelectedVersion,
        downloadStatus,
        setDownloadStatus,
        downloadProgress,
        setDownloadProgress,
        downloadedBytes,
        setDownloadedBytes,
        totalBytes,
        setTotalBytes,
        apkPath,
        setApkPath,
        error,
        setError,
        setIsUninstalling,
        addLogEntry
    } = useAppStore();

    const [loading, setLoading] = useState(releases.length === 0);
    const content = getContent('download', language);

    // The visible releases are the `app` releases on the selected track.
    const visibleReleases = releases.filter(
        (r) => r.component === 'app' && r.track === selectedTrack
    );

    const loadManifest = async (manifest: ReleasesManifest) => {
        setReleasesManifest(manifest);
        setReleases(manifest.releases);
        const appForTrack = selectAppReleasesForTrack(manifest, selectedTrack);
        if (appForTrack.length > 0) {
            // Auto-select the latest app release on the selected track.
            setSelectedVersion(appForTrack[0].version);
        } else {
            setSelectedVersion(null);
        }
    };

    useEffect(() => {
        async function loadReleases() {
            if (releases.length > 0) return;

            try {
                setLoading(true);
                addLogEntry({
                    level: 'info',
                    message: 'Fetching signed OTA manifest from GitHub raw (manifest.json + manifest.sig)',
                });
                const manifest = await fetchReleases();
                await loadManifest(manifest);
            } catch {
                addLogEntry({
                    level: 'error',
                    message: 'Failed to fetch or verify the OTA manifest',
                });
                setError(t('download.fetchError', 'Failed to fetch releases. Please check your internet connection.'));
            } finally {
                setLoading(false);
            }
        }

        loadReleases();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [releases.length, selectedTrack, setError, t, addLogEntry, setReleasesManifest, setReleases, setSelectedVersion]);

    const handleRetry = async () => {
        setError(null);
        setLoading(true);
        addLogEntry({
            level: 'info',
            message: 'Fetching signed OTA manifest from GitHub raw (manifest.json + manifest.sig)',
        });
        try {
            const manifest = await fetchReleases();
            await loadManifest(manifest);
        } catch {
            addLogEntry({
                level: 'error',
                message: 'Failed to fetch or verify the OTA manifest',
            });
            setError(t('download.fetchError', 'Failed to fetch releases. Please check your internet connection.'));
        } finally {
            setLoading(false);
        }
    };

    // When the track changes, re-select the latest app release on that track
    // and clear any cached APK path so the operator must re-download.
    useEffect(() => {
        const appForTrack = selectAppReleasesForTrack(
            { schemaVersion: 1, releases },
            selectedTrack
        );
        if (appForTrack.length > 0) {
            setSelectedVersion(appForTrack[0].version);
        } else {
            setSelectedVersion(null);
        }
        setApkPath(null);
        setDownloadStatus('idle');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTrack]);

    useEffect(() => {
        // Reset uninstalling state when we land here
        setIsUninstalling(false);
    }, [setIsUninstalling]);

    useEffect(() => {
        async function checkExisting() {
            if (!selectedVersion || downloadStatus === 'downloading') return;

            const release = releases.find(r => r.version === selectedVersion);
            if (!release) return;

            try {
                const existingPath = await checkExistingApk(selectedVersion, release.sha256);
                if (existingPath) {
                    addLogEntry({ level: 'success', message: `Found existing cached APK for version ${selectedVersion} at ${existingPath}` });
                    setApkPath(existingPath);
                    setDownloadStatus('ready');
                } else {
                    setDownloadStatus('idle');
                    setApkPath(null);
                }
            } catch {
                // Existing-APK check is best-effort; ignore failures.
            }
        }

        checkExisting();
    }, [selectedVersion, releases, setApkPath, setDownloadStatus, downloadStatus, addLogEntry]);

    const handleDownload = async () => {
        const release = releases.find(r => r.version === selectedVersion);
        if (!release) return;

        setDownloadStatus('downloading');
        setError(null);
        addLogEntry({ level: 'info', message: `Starting firmware download for version ${selectedVersion}` });

        try {
            const path = await downloadApk(
                release.downloadUrl,
                release.sha256,
                release.version,
                (progress) => {
                    setDownloadProgress(progress.percentage);
                    setDownloadedBytes(progress.downloaded);
                    setTotalBytes(progress.total);
                }
            );

            setApkPath(path);
            addLogEntry({ level: 'success', message: `Firmware download completed to ${path}` });
            setDownloadStatus('ready');
        } catch (err) {
            addLogEntry({ level: 'error', message: `Firmware download failed` });
            setDownloadStatus('error');
            setError(err instanceof Error ? err.message : t('download.error', 'Download failed'));
        }
    };

    const handlePrimaryButtonClick = () => {
        setIsUninstalling(false); // Make sure we are installing
        if (downloadStatus === 'ready' && apkPath) {
            addLogEntry({ level: 'info', message: 'Proceeding with downloaded firmware.' });
            addLogEntry({ level: 'empty', message: '' });
            nextStep();
        } else {
            handleDownload();
        }
    };

    const handleLoadLocalJson = async () => {
        try {
            const selectedPath = await open({
                multiple: false,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (selectedPath && typeof selectedPath === 'string') {
                addLogEntry({ level: 'info', message: `User selected local manifest: ${selectedPath}` });
                setLoading(true);
                const manifest = await readLocalReleases(selectedPath);
                addLogEntry({ level: 'info', message: `Loaded ${manifest.releases.length} local releases.` });
                await loadManifest(manifest);
            }
        } catch {
            setError('Failed to load local manifest');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadLocalApk = async () => {
        try {
            const selectedPath = await open({
                multiple: false,
                filters: [{ name: 'APK', extensions: ['apk'] }]
            });
            if (selectedPath && typeof selectedPath === 'string') {
                setApkPath(selectedPath);
                addLogEntry({ level: 'info', message: `User selects custom APK installation from ${selectedPath}` });
                setDownloadStatus('ready');
                setIsUninstalling(false);
                nextStep();
            }
        } catch {
            setError('Failed to select local APK');
        }
    };

    const footer = (
        <div className={styles.footer}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="large" onClick={() => previousStep()} disabled={downloadStatus === 'downloading'}>
                    {t('common.back', 'Back')}
                </Button>
                <LogControls />
            </div>
            <div className={sharedStyles.footerActions}>
                <Button
                    size="large"
                    onClick={() => {
                        addLogEntry({ level: 'warn', message: 'User selected to uninstall Voboost' });
                        addLogEntry({ level: 'empty', message: '' });
                        setIsUninstalling(true);
                        nextStep();
                    }}
                    disabled={downloadStatus === 'downloading' || loading}
                >
                    {t('common.uninstall', 'Uninstall')}
                </Button>
                <Button
                    appearance="primary"
                    size="large"
                    onClick={handlePrimaryButtonClick}
                    disabled={!selectedVersion || loading || downloadStatus === 'downloading'}
                    className={sharedStyles.primaryButton}
                >
                    {downloadStatus === 'ready' ? t('common.next', 'Next') : t('download.button', 'Download Firmware')}
                </Button>
            </div>
        </div>
    );

    return (
        <WizardLayout
            footer={footer}
        >
            <div className={styles.container}>
                <div style={{ marginBottom: '10px' }} dangerouslySetInnerHTML={{ __html: injectBemClasses(content, 'page-title') }} />
                <div className={styles.versionList}>
                    {error && (
                        <MessageBar intent="error">
                            <MessageBarBody>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span>{error}</span>
                                    <Button size="small" onClick={handleRetry}>
                                        {t('common.retry', 'Retry')}
                                    </Button>
                                </div>
                            </MessageBarBody>
                        </MessageBar>
                    )}
                    <div className={styles.trackSelector}>
                        <Text weight="semibold">{t('download.track', 'Track')}</Text>
                        <Dropdown
                            value={t(`download.track_${selectedTrack}`, selectedTrack)}
                            onOptionSelect={(_, data) => {
                                const track = data.optionValue as ReleaseTrack | undefined;
                                if (track) {
                                    setSelectedTrack(track);
                                }
                            }}
                            disabled={loading || downloadStatus === 'downloading'}
                        >
                            <Option value="production">{t('download.track_production', 'Production')}</Option>
                            <Option value="testing">{t('download.track_testing', 'Testing')}</Option>
                            <Option value="dev">{t('download.track_dev', 'Dev')}</Option>
                        </Dropdown>
                    </div>
                    <Button size="large" onClick={handleLoadLocalJson} disabled={loading || downloadStatus === 'downloading'}>
                        {t('download.localJson', 'Choose manifest.json')}
                    </Button>
                    <Button size="large" onClick={handleLoadLocalApk} disabled={loading || downloadStatus === 'downloading'}>
                        {t('download.localApk', 'Choose local APK')}
                    </Button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                        <Spinner label={t('download.loading', 'Fetching releases...')} />
                    </div>
                ) : (
                    <div className={styles.versionList}>
                        {visibleReleases.length === 0 && (
                            <MessageBar>
                                <MessageBarBody>
                                    {t('download.noReleases', 'No releases available')}
                                </MessageBarBody>
                            </MessageBar>
                        )}
                        {visibleReleases.map((release) => (
                            <VersionCard
                                key={release.version}
                                release={release}
                                isSelected={selectedVersion === release.version}
                                onSelect={() => {
                                    if (downloadStatus !== 'downloading') {
                                        setSelectedVersion(release.version);
                                    }
                                }}
                                language={language}
                            />
                        ))}
                    </div>
                )}

                {downloadStatus === 'downloading' && (
                    <div className={styles.progressContainer}>
                        <Text weight="semibold">{t('download.downloading', 'Downloading...')}</Text>
                        <ProgressBar value={downloadProgress} max={100} />
                        <div className={styles.progressStats}>
                            <Text size={200}>{Math.round(downloadProgress)}%</Text>
                            <Text size={200}>
                                {formatFileSize(downloadedBytes)} / {formatFileSize(totalBytes)}
                            </Text>
                        </div>
                    </div>
                )}

                {downloadStatus === 'ready' && (
                    <MessageBar intent="success">
                        <MessageBarBody>
                            {t('download.ready', 'Firmware downloaded and verified successfully. Ready to continue.')}
                        </MessageBarBody>
                    </MessageBar>
                )}
            </div>
        </WizardLayout>
    );
}
