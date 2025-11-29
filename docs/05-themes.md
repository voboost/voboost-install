# Themes and Styling

## Overview

The installer uses Fluent UI React with platform-specific themes:
- **Windows**: Default Fluent Design (Microsoft style)
- **macOS**: Custom Apple-inspired theme

## Platform Detection

```typescript
// src/hooks/usePlatform.ts

import { useState, useEffect } from 'react';
import { platform } from '@tauri-apps/plugin-os';

export type Platform = 'windows' | 'macos' | 'linux';

export function usePlatform(): Platform {
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('windows');

  useEffect(() => {
    platform().then((p) => {
      if (p === 'macos' || p === 'darwin') {
        setCurrentPlatform('macos');
      } else if (p === 'windows' || p === 'win32') {
        setCurrentPlatform('windows');
      } else {
        setCurrentPlatform('linux');
      }
    });
  }, []);

  return currentPlatform;
}
```

## Theme Selection

```typescript
// src/themes/index.ts

import { Theme } from '@fluentui/react-components';
import { windowsLightTheme, windowsDarkTheme } from './windows';
import { macOSLightTheme, macOSDarkTheme } from './macos';
import type { Platform } from '../hooks/usePlatform';

export function getTheme(platform: Platform, isDark: boolean): Theme {
  if (platform === 'macos') {
    return isDark ? macOSDarkTheme : macOSLightTheme;
  }
  return isDark ? windowsDarkTheme : windowsLightTheme;
}

export { windowsLightTheme, windowsDarkTheme } from './windows';
export { macOSLightTheme, macOSDarkTheme } from './macos';
```

## Windows Theme (Fluent Design)

```typescript
// src/themes/windows.ts

import {
  createLightTheme,
  createDarkTheme,
  BrandVariants
} from '@fluentui/react-components';

// Voboost brand colors (blue palette)
const voboostBrand: BrandVariants = {
  10: '#020305',
  20: '#111723',
  30: '#16263D',
  40: '#1B3452',
  50: '#1F4268',
  60: '#23517E',
  70: '#276196',
  80: '#2B72AE',  // Primary
  90: '#3083C6',
  100: '#4A93CE',
  110: '#64A3D6',
  120: '#7EB3DE',
  130: '#98C3E6',
  140: '#B2D3EE',
  150: '#CCE3F6',
  160: '#E6F3FE',
};

export const windowsLightTheme = createLightTheme(voboostBrand);
export const windowsDarkTheme = createDarkTheme(voboostBrand);
```

## macOS Theme (Apple-inspired)

```typescript
// src/themes/macos.ts

import {
  createLightTheme,
  createDarkTheme,
  BrandVariants,
  Theme
} from '@fluentui/react-components';

// Apple blue palette
const appleBrand: BrandVariants = {
  10: '#001a33',
  20: '#002952',
  30: '#003d7a',
  40: '#0051a3',
  50: '#0066cc',
  60: '#007AFF',  // Apple Blue
  70: '#3395ff',
  80: '#66b0ff',
  90: '#99caff',
  100: '#cce5ff',
  110: '#e6f2ff',
  120: '#f0f7ff',
  130: '#f5faff',
  140: '#fafcff',
  150: '#fcfdff',
  160: '#ffffff',
};

const baseLightTheme = createLightTheme(appleBrand);

export const macOSLightTheme: Theme = {
  ...baseLightTheme,

  // Typography - SF Pro system font
  fontFamilyBase: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  fontFamilyMonospace: '"SF Mono", Menlo, Monaco, monospace',
  fontSizeBase100: '11px',
  fontSizeBase200: '12px',
  fontSizeBase300: '13px',  // macOS default body
  fontSizeBase400: '15px',
  fontSizeBase500: '17px',
  fontSizeBase600: '20px',

  // Border radius - rounder than Windows
  borderRadiusNone: '0',
  borderRadiusSmall: '4px',
  borderRadiusMedium: '8px',
  borderRadiusLarge: '12px',
  borderRadiusXLarge: '16px',
  borderRadiusCircular: '9999px',

  // Colors - Apple gray palette
  colorNeutralBackground1: '#ffffff',
  colorNeutralBackground2: '#f5f5f7',  // Apple light gray
  colorNeutralBackground3: '#e8e8ed',
  colorNeutralBackground4: '#d2d2d7',
  colorNeutralForeground1: '#1d1d1f',  // Apple dark text
  colorNeutralForeground2: '#424245',
  colorNeutralForeground3: '#6e6e73',
  colorNeutralStroke1: '#d2d2d7',
  colorNeutralStroke2: '#e8e8ed',

  // Shadows - softer, more diffused
  shadow2: '0 1px 2px rgba(0, 0, 0, 0.04)',
  shadow4: '0 2px 8px rgba(0, 0, 0, 0.08)',
  shadow8: '0 4px 16px rgba(0, 0, 0, 0.1)',
  shadow16: '0 8px 32px rgba(0, 0, 0, 0.12)',
  shadow28: '0 14px 42px rgba(0, 0, 0, 0.14)',
  shadow64: '0 32px 64px rgba(0, 0, 0, 0.16)',
};

const baseDarkTheme = createDarkTheme(appleBrand);

export const macOSDarkTheme: Theme = {
  ...baseDarkTheme,

  // Typography
  fontFamilyBase: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  fontFamilyMonospace: '"SF Mono", Menlo, Monaco, monospace',
  fontSizeBase100: '11px',
  fontSizeBase200: '12px',
  fontSizeBase300: '13px',
  fontSizeBase400: '15px',
  fontSizeBase500: '17px',
  fontSizeBase600: '20px',

  // Border radius
  borderRadiusNone: '0',
  borderRadiusSmall: '4px',
  borderRadiusMedium: '8px',
  borderRadiusLarge: '12px',
  borderRadiusXLarge: '16px',
  borderRadiusCircular: '9999px',

  // Colors - Apple dark mode
  colorNeutralBackground1: '#1c1c1e',
  colorNeutralBackground2: '#2c2c2e',
  colorNeutralBackground3: '#3a3a3c',
  colorNeutralForeground1: '#ffffff',
  colorNeutralForeground2: '#ebebf5',
  colorNeutralForeground3: '#8e8e93',
};
```

## App Component with Theme

```typescript
// src/App.tsx

import { FluentProvider } from '@fluentui/react-components';
import { usePlatform } from './hooks/usePlatform';
import { getTheme } from './themes';
import { WizardLayout } from './components/WizardLayout';

function App() {
  const platform = usePlatform();
  const isDark = false;  // Could be from system preference or user setting
  const theme = getTheme(platform, isDark);

  return (
    <FluentProvider theme={theme}>
      <WizardLayout />
    </FluentProvider>
  );
}

export default App;
```

## CSS Variables

Global CSS variables for custom styling:

```css
/* src/App.css */

:root {
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;

  /* Layout */
  --wizard-max-width: 800px;
  --wizard-padding: var(--spacing-lg);
  --content-gap: var(--spacing-md);

  /* Animation */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--colorNeutralStroke1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--colorNeutralStroke2);
}
```

## Component-Specific Styling

### BEM Naming Convention

Use BEM with underscore modifiers: `block__element_modifier_value`

```css
/* src/components/StepIndicator/StepIndicator.css */

.step-indicator {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
}

.step-indicator__step {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.step-indicator__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--colorNeutralBackground3);
  transition: var(--transition-fast);
}

.step-indicator__dot_status_completed {
  background: var(--colorBrandBackground);
}

.step-indicator__dot_status_current {
  background: var(--colorBrandBackground);
  box-shadow: 0 0 0 3px var(--colorBrandBackgroundHover);
}

.step-indicator__dot_status_pending {
  background: var(--colorNeutralBackground3);
}

.step-indicator__label {
  font-size: var(--fontSizeBase200);
  color: var(--colorNeutralForeground2);
}

.step-indicator__label_status_current {
  color: var(--colorNeutralForeground1);
  font-weight: 600;
}

.step-indicator__connector {
  width: 24px;
  height: 2px;
  background: var(--colorNeutralBackground3);
}

.step-indicator__connector_completed {
  background: var(--colorBrandBackground);
}
```

## Visual Comparison

### Windows vs macOS

| Element | Windows | macOS |
|---------|---------|-------|
| **Primary color** | #2B72AE (Voboost blue) | #007AFF (Apple blue) |
| **Font** | Segoe UI | SF Pro |
| **Border radius** | 4px | 8px |
| **Shadows** | Sharp | Soft, diffused |
| **Background** | #ffffff | #f5f5f7 |
| **Button style** | Rectangular | Rounded |

### Button Example

**Windows**:
```
┌────────────────┐
│     Next →     │
└────────────────┘
```

**macOS**:
```
╭────────────────╮
│     Next →     │
╰────────────────╯
```

## Dark Mode Detection

The app automatically detects system dark mode preference:

```typescript
// src/hooks/useDarkMode.ts

import { useState, useEffect } from 'react';

export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => {
    // Check initial preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isDark;
}
```

### Updated App Component

```typescript
// src/App.tsx

import { FluentProvider } from '@fluentui/react-components';
import { usePlatform } from './hooks/usePlatform';
import { useDarkMode } from './hooks/useDarkMode';
import { getTheme } from './themes';
import { WizardLayout } from './components/WizardLayout';

function App() {
  const platform = usePlatform();
  const isDark = useDarkMode();
  const theme = getTheme(platform, isDark);

  return (
    <FluentProvider theme={theme}>
      <div className={`app ${isDark ? 'dark' : 'light'}`}>
        <WizardLayout />
      </div>
    </FluentProvider>
  );
}

export default App;
```

## Reduced Motion Support

Respect user's motion preferences:

```css
/* src/App.css */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## High Contrast Mode

Support Windows High Contrast mode:

```css
/* src/App.css */

@media (forced-colors: active) {
  .step-indicator__dot {
    border: 2px solid currentColor;
  }

  .step-indicator__dot_status_completed {
    background: Highlight;
  }

  .version-card.selected {
    outline: 3px solid Highlight;
  }
}
```
