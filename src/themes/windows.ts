import { createDarkTheme, createLightTheme, type BrandVariants } from '@fluentui/react-components';

// Voboost Blue brand palette
const voboostBrand: BrandVariants = {
    10: '#020508',
    20: '#0e1c2e',
    30: '#14294a',
    40: '#173361',
    50: '#193d79',
    60: '#194892',
    70: '#1753ab',
    80: '#2B72AE',
    90: '#4b7fc0',
    100: '#638dc8',
    110: '#799bd0',
    120: '#8fa9d8',
    130: '#a5b8e0',
    140: '#bac7e8',
    150: '#d0d7ef',
    160: '#e7e8f6',
};

export const windowsLightTheme = createLightTheme(voboostBrand);
export const windowsDarkTheme = createDarkTheme(voboostBrand);
