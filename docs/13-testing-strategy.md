# Testing Strategy

## Overview

This document describes the testing approach for the Voboost Installer, including unit tests, integration tests, and manual testing procedures.

---

## Test Pyramid

```
                    ┌─────────────┐
                    │   E2E/UI    │  ← Manual + Automated
                   ─┴─────────────┴─
                  ┌─────────────────┐
                  │  Integration    │  ← Tauri commands
                 ─┴─────────────────┴─
                ┌─────────────────────┐
                │     Unit Tests      │  ← Functions, hooks, store
               ─┴─────────────────────┴─
```

---

## Unit Tests

### Frontend (Vitest)

#### Store Tests

```typescript
// src/store/__tests__/appStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('AppStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  describe('language', () => {
    it('should default to English', () => {
      expect(useAppStore.getState().language).toBe('en');
    });

    it('should change language', () => {
      useAppStore.getState().setLanguage('ru');
      expect(useAppStore.getState().language).toBe('ru');
    });
  });

  describe('EULA', () => {
    it('should not be accepted by default', () => {
      expect(useAppStore.getState().eulaAccepted).toBe(false);
    });

    it('should enable next when accepted', () => {
      useAppStore.getState().setEulaAccepted(true);
      expect(useAppStore.getState().eulaAccepted).toBe(true);
      expect(useAppStore.getState().canGoNext).toBe(true);
    });
  });

  describe('download', () => {
    it('should track download progress', () => {
      useAppStore.getState().setDownloadProgress(50);
      useAppStore.getState().setDownloadedBytes(5000000);
      useAppStore.getState().setTotalBytes(10000000);

      expect(useAppStore.getState().downloadProgress).toBe(50);
      expect(useAppStore.getState().downloadedBytes).toBe(5000000);
    });
  });

  describe('installation log', () => {
    it('should add log entries with timestamp', () => {
      useAppStore.getState().addLogEntry({ level: 'info', message: 'Test' });

      const log = useAppStore.getState().installLog;
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('Test');
      expect(log[0].timestamp).toBeDefined();
    });
  });
});
```

#### Utility Tests

```typescript
// src/services/__tests__/releases.test.ts

import { describe, it, expect } from 'vitest';
import { formatFileSize, formatDate, getLatestStable } from '../releases';

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(15728640)).toBe('15.0 MB');
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
    expect(result).toContain('ноября');
  });
});

describe('getLatestStable', () => {
  const releases = [
    { version: '1.3.0-beta.1', channel: 'beta' },
    { version: '1.2.0', channel: 'stable' },
    { version: '1.1.0', channel: 'stable' },
  ];

  it('should return first stable release', () => {
    const result = getLatestStable(releases as any);
    expect(result?.version).toBe('1.2.0');
  });
});
```

#### Hook Tests

```typescript
// src/hooks/__tests__/useDarkMode.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDarkMode } from '../useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('should detect dark mode', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current).toBe(true);
  });
});
```

### Backend (Rust)

```rust
// src-tauri/src/utils/hash.rs

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_calculate_sha256() {
        // Create temp file with known content
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"Hello, World!").unwrap();

        let hash = calculate_sha256(&file.path().to_path_buf()).unwrap();

        // Known SHA256 of "Hello, World!"
        assert_eq!(
            hash,
            "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"
        );
    }

    #[test]
    fn test_calculate_sha256_empty_file() {
        let file = NamedTempFile::new().unwrap();
        let hash = calculate_sha256(&file.path().to_path_buf()).unwrap();

        // Known SHA256 of empty file
        assert_eq!(
            hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }
}
```

```rust
// src-tauri/src/commands/adb.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_devices_output_empty() {
        let output = "List of devices attached\n\n";
        let devices = parse_devices_output(output);
        assert!(devices.is_empty());
    }

    #[test]
    fn test_parse_devices_output_single_device() {
        let output = "List of devices attached\nABC123\tdevice product:voyah model:Free\n";
        let devices = parse_devices_output(output);

        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].serial, "ABC123");
        assert_eq!(devices[0].state, "device");
        assert_eq!(devices[0].model, Some("Free".to_string()));
        assert_eq!(devices[0].product, Some("voyah".to_string()));
    }

    #[test]
    fn test_parse_devices_output_unauthorized() {
        let output = "List of devices attached\nABC123\tunauthorized\n";
        let devices = parse_devices_output(output);

        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].state, "unauthorized");
    }

    #[test]
    fn test_parse_devices_output_multiple() {
        let output = "List of devices attached\nABC123\tdevice\nDEF456\toffline\n";
        let devices = parse_devices_output(output);

        assert_eq!(devices.len(), 2);
    }
}
```

---

## Integration Tests

### Tauri Command Tests

```typescript
// src/__tests__/integration/commands.test.ts

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { mockIPC } from '@tauri-apps/api/mocks';

describe('Tauri Commands', () => {
  beforeAll(() => {
    // Mock Tauri IPC
    mockIPC((cmd, args) => {
      switch (cmd) {
        case 'fetch_releases':
          return {
            schemaVersion: 1,
            releases: [
              {
                version: '1.2.0',
                channel: 'stable',
                releaseDate: '2024-11-15',
                downloadUrl: 'https://example.com/voboost-1.2.0.apk',
                sha256: 'abc123',
                size: 15728640,
              },
            ],
          };

        case 'get_devices':
          return [
            {
              serial: 'ABC123',
              state: 'device',
              model: 'Free',
              product: 'voyah',
            },
          ];

        case 'check_existing_apk':
          return null; // No cached APK

        default:
          return null;
      }
    });
  });

  it('should fetch releases', async () => {
    const { fetchReleases } = await import('../../services/releases');
    const result = await fetchReleases();

    expect(result.schemaVersion).toBe(1);
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].version).toBe('1.2.0');
  });

  it('should get devices', async () => {
    const { getDevices } = await import('../../services/adb');
    const devices = await getDevices();

    expect(devices).toHaveLength(1);
    expect(devices[0].serial).toBe('ABC123');
  });
});
```

---

## Component Tests

```typescript
// src/components/__tests__/VersionCard.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { VersionCard } from '../VersionCard';

const mockRelease = {
  version: '1.2.0',
  channel: 'stable' as const,
  releaseDate: '2024-11-15',
  downloadUrl: 'https://example.com/voboost.apk',
  sha256: 'abc123',
  size: 15728640,
  changelog: {
    en: '- New feature\n- Bug fix',
    ru: '- Новая функция\n- Исправление',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
);

describe('VersionCard', () => {
  it('should render version number', () => {
    render(
      <VersionCard
        release={mockRelease}
        isSelected={false}
        onSelect={vi.fn()}
        language="en"
      />,
      { wrapper }
    );

    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
  });

  it('should show stable badge', () => {
    render(
      <VersionCard
        release={mockRelease}
        isSelected={false}
        onSelect={vi.fn()}
        language="en"
      />,
      { wrapper }
    );

    expect(screen.getByText('stable')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <VersionCard
        release={mockRelease}
        isSelected={false}
        onSelect={onSelect}
        language="en"
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalled();
  });

  it('should show English changelog', () => {
    render(
      <VersionCard
        release={mockRelease}
        isSelected={false}
        onSelect={vi.fn()}
        language="en"
      />,
      { wrapper }
    );

    expect(screen.getByText(/New feature/)).toBeInTheDocument();
  });

  it('should show Russian changelog', () => {
    render(
      <VersionCard
        release={mockRelease}
        isSelected={false}
        onSelect={vi.fn()}
        language="ru"
      />,
      { wrapper }
    );

    expect(screen.getByText(/Новая функция/)).toBeInTheDocument();
  });
});
```

---

## Manual Testing Checklist

### Pre-release Testing

#### Windows Testing

- [ ] **Installation**
  - [ ] Fresh install on Windows 10
  - [ ] Fresh install on Windows 11
  - [ ] Install with antivirus active
  - [ ] Install to custom directory
  - [ ] Uninstall and reinstall

- [ ] **UI/UX**
  - [ ] All screens render correctly
  - [ ] Language switching works
  - [ ] Dark mode works
  - [ ] High contrast mode works
  - [ ] Keyboard navigation works
  - [ ] Screen reader announces correctly

- [ ] **Functionality**
  - [ ] Releases load from GitHub
  - [ ] Download progress shows correctly
  - [ ] Download can be cancelled
  - [ ] Cached APK is detected
  - [ ] Hash verification works
  - [ ] Device detection works
  - [ ] Installation completes successfully

- [ ] **Error Handling**
  - [ ] No internet shows error
  - [ ] Invalid hash shows error
  - [ ] Device disconnect handled
  - [ ] Log can be copied

#### macOS Testing

- [ ] **Installation**
  - [ ] Fresh install on macOS 12 (Intel)
  - [ ] Fresh install on macOS 14 (Apple Silicon)
  - [ ] Gatekeeper allows app
  - [ ] App moves to Applications

- [ ] **UI/UX**
  - [ ] macOS theme applied
  - [ ] SF Pro font used
  - [ ] Rounded corners correct
  - [ ] Dark mode follows system

- [ ] **Functionality**
  - [ ] Same as Windows tests
  - [ ] USB accessory prompt handled

### Device Testing Matrix

| Device | Android | ADB Root | Tested |
|--------|---------|----------|--------|
| Voyah Free | 10 | Yes | [ ] |
| Voyah Dream | 10 | Yes | [ ] |
| Other | - | - | [ ] |

---

## Automated E2E Tests (Optional)

Using Playwright or similar:

```typescript
// e2e/installer.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Installer Flow', () => {
  test('should complete EULA screen', async ({ page }) => {
    // Note: Tauri apps need special setup for E2E testing
    await page.goto('tauri://localhost');

    // Check EULA is displayed
    await expect(page.locator('text=License Agreement')).toBeVisible();

    // Accept EULA
    await page.click('input[type="checkbox"]');

    // Next button should be enabled
    await expect(page.locator('button:has-text("Next")')).toBeEnabled();
  });
});
```

---

## Test Configuration

### Vitest Config

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
      ],
    },
  },
});
```

### Test Setup

```typescript
// src/test/setup.ts

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(() => Promise.resolve('darwin')),
}));
```

---

## Coverage Goals

| Category | Target |
|----------|--------|
| Unit Tests | 80%+ |
| Integration Tests | 60%+ |
| E2E Tests | Critical paths |

---

## CI Test Pipeline

```yaml
# .github/workflows/test.yml

name: Test

on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run test:coverage

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cd src-tauri && cargo test
```
