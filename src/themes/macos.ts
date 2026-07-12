import {
    createDarkTheme,
    createLightTheme,
    type BrandVariants,
    type Theme,
} from '@fluentui/react-components';

// Apple Blue brand palette
const appleBrand: BrandVariants = {
    10: '#020609',
    20: '#0a1a2f',
    30: '#0f274d',
    40: '#103168',
    50: '#0f3c84',
    60: '#0b47a1',
    70: '#0353bf',
    80: '#007AFF',
    90: '#3391ff',
    100: '#52a1ff',
    110: '#6db0ff',
    120: '#86bfff',
    130: '#9eceff',
    140: '#b6ddff',
    150: '#ceeaff',
    160: '#e6f4ff',
};

const baseLightTheme = createLightTheme(appleBrand);
const baseDarkTheme = createDarkTheme(appleBrand);

// macOS overrides for Apple-like feel
const macOSOverrides: Partial<Theme> = {
    fontFamilyBase:
        '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    borderRadiusMedium: '8px',
    borderRadiusLarge: '10px',
    borderRadiusXLarge: '12px',
    shadow4: '0 1px 3px rgba(0,0,0,0.08)',
    shadow8: '0 2px 6px rgba(0,0,0,0.10)',
    shadow16: '0 4px 12px rgba(0,0,0,0.12)',
};

export const macosLightTheme: Theme = { ...baseLightTheme, ...macOSOverrides };
export const macosDarkTheme: Theme = { ...baseDarkTheme, ...macOSOverrides };
