# Component Specifications

## Overview

This document describes the React components used in the installer application.

## Component Hierarchy

```
App
├── FluentProvider (theme)
│   └── Wizard (react-use-wizard)
│       ├── EulaScreen
│       │   ├── WizardLayout
│       │   │   ├── StepIndicator
│       │   │   ├── LanguageSelector
│       │   │   └── EulaContent
│       ├── DownloadScreen
│       │   ├── WizardLayout
│       │   │   ├── StepIndicator
│       │   │   ├── VersionCard (multiple)
│       │   │   └── DownloadProgress
│       ├── ConnectionScreen
│       │   ├── WizardLayout
│       │   │   ├── StepIndicator
│       │   │   ├── InstructionCarousel
│       │   │   └── ConnectionStatus
│       ├── InstallScreen
│       │   ├── WizardLayout
│       │   │   ├── StepIndicator
│       │   │   ├── InstallStep (multiple)
│       │   │   └── LogViewer
│       └── CompleteScreen
│           ├── WizardLayout
│           │   ├── StepIndicator
│           │   └── NextStepsCard
```

## Shared Components

### WizardLayout

Container component that provides consistent layout for all screens.

```typescript
// src/components/WizardLayout/WizardLayout.tsx

interface WizardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
}

export function WizardLayout({
  children,
  title,
  subtitle,
  footer
}: WizardLayoutProps) {
  return (
    <div className="wizard-layout">
      <header className="wizard-header">
        <img src={logo} alt="Voboost" className="wizard-logo" />
        {title && <h1>{title}</h1>}
        {subtitle && <p>{subtitle}</p>}
      </header>

      <main className="wizard-content">
        {children}
      </main>

      {footer && (
        <footer className="wizard-footer">
          {footer}
        </footer>
      )}
    </div>
  );
}
```

**Styles:**
```css
.wizard-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px;
  background: var(--colorNeutralBackground1);
}

.wizard-header {
  text-align: center;
  margin-bottom: 24px;
}

.wizard-logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.wizard-content {
  flex: 1;
  overflow-y: auto;
}

.wizard-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 24px;
  border-top: 1px solid var(--colorNeutralStroke1);
}
```

---

### StepIndicator

Shows progress through the wizard steps.

```typescript
// src/components/StepIndicator/StepIndicator.tsx

interface Step {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="step-indicator" role="navigation" aria-label="Installation progress">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
          aria-current={index === currentStep ? 'step' : undefined}
        >
          <div className="step-number">
            {index < currentStep ? (
              <Checkmark16Regular />
            ) : (
              index + 1
            )}
          </div>
          <span className="step-label">{step.label}</span>
          {index < steps.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );
}
```

**Accessibility:**
- Uses `role="navigation"` for screen readers
- `aria-current="step"` marks current step
- Checkmark icon for completed steps

---

### LanguageSelector

Dropdown for selecting UI language.

```typescript
// src/components/LanguageSelector/LanguageSelector.tsx

import { Dropdown, Option } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useAppStore();

  const handleChange = (value: string) => {
    setLanguage(value as 'en' | 'ru');
    i18n.changeLanguage(value);
  };

  return (
    <Dropdown
      value={language}
      onOptionSelect={(_, data) => handleChange(data.optionValue!)}
      aria-label="Select language"
    >
      {languages.map((lang) => (
        <Option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </Option>
      ))}
    </Dropdown>
  );
}
```

---

### VersionCard

Card displaying a release version with download button.

```typescript
// src/components/VersionCard/VersionCard.tsx

import {
  Card,
  CardHeader,
  Badge,
  Button,
  Text
} from '@fluentui/react-components';
import { ArrowDownload24Regular } from '@fluentui/react-icons';
import type { Release } from '../../types/releases';
import { formatFileSize, formatDate } from '../../services/releases';

interface VersionCardProps {
  release: Release;
  isSelected: boolean;
  onSelect: () => void;
  language: 'en' | 'ru';
}

export function VersionCard({
  release,
  isSelected,
  onSelect,
  language
}: VersionCardProps) {
  const changelog = release.changelog?.[language] || release.changelog?.en || '';

  return (
    <Card
      className={`version-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
    >
      <CardHeader
        header={
          <div className="version-header">
            <Text weight="semibold" size={500}>
              v{release.version}
            </Text>
            <Badge
              appearance={release.channel === 'stable' ? 'filled' : 'outline'}
              color={release.channel === 'stable' ? 'success' : 'warning'}
            >
              {release.channel}
            </Badge>
          </div>
        }
        description={
          <Text size={200}>
            {formatDate(release.releaseDate, language)} • {formatFileSize(release.size)}
          </Text>
        }
      />

      {changelog && (
        <div className="version-changelog">
          <Text size={200} style={{ whiteSpace: 'pre-line' }}>
            {changelog}
          </Text>
        </div>
      )}

      {isSelected && (
        <div className="version-selected-indicator">
          <Checkmark24Regular />
        </div>
      )}
    </Card>
  );
}
```

---

### ConnectionStatus

Shows ADB connection status with visual indicator.

```typescript
// src/components/ConnectionStatus/ConnectionStatus.tsx

import { Spinner, Text, Badge } from '@fluentui/react-components';
import {
  PlugConnected24Regular,
  PlugDisconnected24Regular,
  Warning24Regular
} from '@fluentui/react-icons';
import type { ConnectionStatus as Status } from '../../store/types';

interface ConnectionStatusProps {
  status: Status;
  deviceName?: string;
}

export function ConnectionStatus({ status, deviceName }: ConnectionStatusProps) {
  const getIcon = () => {
    switch (status) {
      case 'searching':
        return <Spinner size="small" />;
      case 'connected':
        return <PlugConnected24Regular className="status-icon connected" />;
      case 'unauthorized':
        return <Warning24Regular className="status-icon warning" />;
      case 'error':
        return <PlugDisconnected24Regular className="status-icon error" />;
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'searching':
        return 'Searching for device...';
      case 'connected':
        return `Connected to ${deviceName || 'device'}`;
      case 'unauthorized':
        return 'Device found but not authorized. Please accept USB debugging on the device.';
      case 'error':
        return 'Connection error. Please check USB cable and try again.';
    }
  };

  return (
    <div className={`connection-status status-${status}`} role="status" aria-live="polite">
      {getIcon()}
      <Text>{getMessage()}</Text>
      {status === 'connected' && (
        <Badge appearance="filled" color="success">Ready</Badge>
      )}
    </div>
  );
}
```

---

### InstallStep

Shows a single installation step with status.

```typescript
// src/components/InstallStep/InstallStep.tsx

import { Spinner, Text } from '@fluentui/react-components';
import {
  CheckmarkCircle24Filled,
  DismissCircle24Filled,
  Circle24Regular
} from '@fluentui/react-icons';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface InstallStepProps {
  label: string;
  status: StepStatus;
  errorMessage?: string;
}

export function InstallStep({ label, status, errorMessage }: InstallStepProps) {
  const getIcon = () => {
    switch (status) {
      case 'pending':
        return <Circle24Regular className="step-icon pending" />;
      case 'running':
        return <Spinner size="tiny" />;
      case 'success':
        return <CheckmarkCircle24Filled className="step-icon success" />;
      case 'error':
        return <DismissCircle24Filled className="step-icon error" />;
    }
  };

  return (
    <div className={`install-step status-${status}`}>
      {getIcon()}
      <div className="step-content">
        <Text weight={status === 'running' ? 'semibold' : 'regular'}>
          {label}
        </Text>
        {status === 'error' && errorMessage && (
          <Text size={200} className="error-message">
            {errorMessage}
          </Text>
        )}
      </div>
    </div>
  );
}
```

---

### LogViewer

Expandable log viewer for debugging.

```typescript
// src/components/LogViewer/LogViewer.tsx

import {
  Button,
  Textarea,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions
} from '@fluentui/react-components';
import {
  DocumentText24Regular,
  Copy24Regular
} from '@fluentui/react-icons';
import type { LogEntry } from '../../store/types';

interface LogViewerProps {
  logs: LogEntry[];
  title?: string;
}

export function LogViewer({ logs, title = 'Installation Log' }: LogViewerProps) {
  const logText = logs
    .map(entry => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`)
    .join('\n');

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(logText);
  };

  return (
    <Dialog>
      <DialogTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          icon={<DocumentText24Regular />}
        >
          View Log
        </Button>
      </DialogTrigger>

      <DialogSurface>
        <DialogTitle>{title}</DialogTitle>
        <DialogBody>
          <Textarea
            value={logText}
            readOnly
            resize="vertical"
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              minHeight: '300px'
            }}
          />
        </DialogBody>
        <DialogActions>
          <Button
            appearance="secondary"
            icon={<Copy24Regular />}
            onClick={copyToClipboard}
          >
            Copy to Clipboard
          </Button>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="primary">Close</Button>
          </DialogTrigger>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
}
```

---

### InstructionCarousel

Carousel for showing step-by-step instructions with images.

```typescript
// src/components/InstructionCarousel/InstructionCarousel.tsx

import { useState } from 'react';
import { Button, Text, Image } from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  ChevronRight24Regular
} from '@fluentui/react-icons';

interface Instruction {
  image: string;
  title: string;
  description: string;
}

interface InstructionCarouselProps {
  instructions: Instruction[];
}

export function InstructionCarousel({ instructions }: InstructionCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    setCurrentIndex((prev) =>
      prev < instructions.length - 1 ? prev + 1 : prev
    );
  };

  const goPrev = () => {
    setCurrentIndex((prev) => prev > 0 ? prev - 1 : prev);
  };

  const current = instructions[currentIndex];

  return (
    <div className="instruction-carousel">
      <div className="carousel-content">
        <Image
          src={current.image}
          alt={current.title}
          className="instruction-image"
        />
        <Text weight="semibold" size={400} block>
          {current.title}
        </Text>
        <Text size={300}>
          {current.description}
        </Text>
      </div>

      <div className="carousel-controls">
        <Button
          appearance="subtle"
          icon={<ChevronLeft24Regular />}
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous instruction"
        />

        <div className="carousel-dots">
          {instructions.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to instruction ${index + 1}`}
            />
          ))}
        </div>

        <Button
          appearance="subtle"
          icon={<ChevronRight24Regular />}
          onClick={goNext}
          disabled={currentIndex === instructions.length - 1}
          aria-label="Next instruction"
        />
      </div>
    </div>
  );
}
```

---

## Screen Components

### EulaScreen

```typescript
// src/screens/EulaScreen/EulaScreen.tsx

import { useWizard } from 'react-use-wizard';
import {
  Button,
  Checkbox,
  makeStyles
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { WizardLayout } from '../../components/WizardLayout';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useAppStore } from '../../store';

// Import EULA content as raw markdown
import eulaEn from '../../assets/eula/EULA.en.md?raw';
import eulaRu from '../../assets/eula/EULA.ru.md?raw';

const useStyles = makeStyles({
  eulaContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '16px',
    border: '1px solid var(--colorNeutralStroke1)',
    borderRadius: '4px',
    backgroundColor: 'var(--colorNeutralBackground2)',
    marginBottom: '16px',
    // Markdown content styling
    '& h1, & h2, & h3': {
      marginTop: '16px',
      marginBottom: '8px',
    },
    '& p': {
      marginBottom: '8px',
    },
    '& ul, & ol': {
      paddingLeft: '24px',
      marginBottom: '8px',
    },
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acceptSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
});

export function EulaScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { nextStep } = useWizard();
  const { language, eulaAccepted, setEulaAccepted } = useAppStore();

  const eulaContent = language === 'ru' ? eulaRu : eulaEn;

  return (
    <WizardLayout
      title={t('eula.title')}
      subtitle={t('eula.subtitle')}
      footer={
        <div className={styles.footer}>
          <LanguageSelector />
          <div className={styles.acceptSection}>
            <Checkbox
              checked={eulaAccepted}
              onChange={(_, data) => setEulaAccepted(data.checked === true)}
              label={t('eula.accept')}
            />
            <Button
              appearance="primary"
              disabled={!eulaAccepted}
              onClick={nextStep}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.eulaContainer}>
        <ReactMarkdown>{eulaContent}</ReactMarkdown>
      </div>
    </WizardLayout>
  );
}
```

---

### DownloadScreen

```typescript
// src/screens/DownloadScreen/DownloadScreen.tsx

import { useEffect, useState } from 'react';
import { useWizard } from 'react-use-wizard';
import {
  Button,
  Spinner,
  ProgressBar,
  Text,
  MessageBar,
  MessageBarBody
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardLayout } from '../../components/WizardLayout';
import { VersionCard } from '../../components/VersionCard';
import { useAppStore } from '../../store';
import {
  fetchReleases,
  downloadApk,
  checkExistingApk,
  formatFileSize
} from '../../services/releases';

export function DownloadScreen() {
  const { t } = useTranslation();
  const { nextStep, previousStep } = useWizard();
  const {
    language,
    releases,
    setReleases,
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
  } = useAppStore();

  const [loading, setLoading] = useState(true);

  // Fetch releases on mount
  useEffect(() => {
    async function loadReleases() {
      try {
        const manifest = await fetchReleases();
        setReleases(manifest.releases);

        // Auto-select latest stable
        const latestStable = manifest.releases.find(r => r.channel === 'stable');
        if (latestStable) {
          setSelectedVersion(latestStable.version);
        }
      } catch (err) {
        setError(t('download.fetchError'));
      } finally {
        setLoading(false);
      }
    }

    loadReleases();
  }, []);

  // Check for existing APK when version selected
  useEffect(() => {
    async function checkExisting() {
      if (!selectedVersion) return;

      const release = releases.find(r => r.version === selectedVersion);
      if (!release) return;

      const existingPath = await checkExistingApk(selectedVersion, release.sha256);
      if (existingPath) {
        setApkPath(existingPath);
        setDownloadStatus('ready');
      }
    }

    checkExisting();
  }, [selectedVersion]);

  const handleDownload = async () => {
    const release = releases.find(r => r.version === selectedVersion);
    if (!release) return;

    setDownloadStatus('downloading');
    setError(null);

    try {
      const path = await downloadApk(
        release.downloadUrl,
        release.sha256,
        (progress) => {
          setDownloadProgress(progress.percentage);
          setDownloadedBytes(progress.downloaded);
          setTotalBytes(progress.total);
        }
      );

      setApkPath(path);
      setDownloadStatus('ready');
    } catch (err) {
      setDownloadStatus('error');
      setError(err instanceof Error ? err.message : t('download.error'));
    }
  };

  const selectedRelease = releases.find(r => r.version === selectedVersion);

  return (
    <WizardLayout
      title={t('download.title')}
      subtitle={t('download.subtitle')}
      footer={
        <div className="footer">
          <Button appearance="secondary" onClick={previousStep}>
            {t('common.back')}
          </Button>
          <Button
            appearance="primary"
            disabled={downloadStatus !== 'ready'}
            onClick={nextStep}
          >
            {t('common.next')}
          </Button>
        </div>
      }
    >
      {loading ? (
        <Spinner label={t('download.loading')} />
      ) : (
        <>
          {error && (
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}

          <div className="version-list" role="radiogroup">
            {releases.map((release) => (
              <VersionCard
                key={release.version}
                release={release}
                isSelected={selectedVersion === release.version}
                onSelect={() => setSelectedVersion(release.version)}
                language={language}
              />
            ))}
          </div>

          {downloadStatus === 'downloading' && (
            <div className="download-progress">
              <ProgressBar value={downloadProgress / 100} />
              <Text size={200}>
                {formatFileSize(downloadedBytes)} / {formatFileSize(totalBytes)}
              </Text>
            </div>
          )}

          {downloadStatus === 'ready' && (
            <MessageBar intent="success">
              <MessageBarBody>{t('download.ready')}</MessageBarBody>
            </MessageBar>
          )}

          {selectedVersion && downloadStatus !== 'ready' && (
            <Button
              appearance="primary"
              onClick={handleDownload}
              disabled={downloadStatus === 'downloading'}
            >
              {downloadStatus === 'downloading'
                ? t('download.downloading')
                : t('download.button')}
            </Button>
          )}
        </>
      )}
    </WizardLayout>
  );
}
```

---

## Accessibility Guidelines

All components follow these accessibility principles:

1. **Keyboard Navigation**
   - All interactive elements are focusable
   - Tab order follows visual order
   - Enter/Space activates buttons and checkboxes

2. **Screen Reader Support**
   - Proper ARIA labels on all controls
   - Live regions for status updates
   - Semantic HTML structure

3. **Visual Accessibility**
   - Sufficient color contrast (WCAG AA)
   - Focus indicators visible
   - No reliance on color alone

4. **Motion**
   - Respects `prefers-reduced-motion`
   - Animations can be disabled
