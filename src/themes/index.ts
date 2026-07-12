import type { Theme } from '@fluentui/react-components';
import { windowsLightTheme, windowsDarkTheme } from './windows';
import { macosLightTheme, macosDarkTheme } from './macos';
import type { PlatformType } from '../services/platform';

export function getTheme(platform: PlatformType, isDark: boolean): Theme {
    switch (platform) {
        case 'macos':
            return isDark ? macosDarkTheme : macosLightTheme;
        default:
            return isDark ? windowsDarkTheme : windowsLightTheme;
    }
}

export { windowsLightTheme, windowsDarkTheme } from './windows';
export { macosLightTheme, macosDarkTheme } from './macos';
