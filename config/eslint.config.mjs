import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import voboostConfig from 'voboost-codestyle/config-eslint.mjs';

export default [
    { ignores: ['node_modules/**', 'dist/**', 'src-tauri/**', 'releases.json'] },
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { globals: globals.browser } },
    ...voboostConfig,
    ...tseslint.configs.recommended,
    {
        ...pluginReactConfig,
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        plugins: {
            'react-hooks': pluginReactHooks,
            'react-refresh': pluginReactRefresh,
        },
        rules: {
            ...pluginReactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'react/react-in-jsx-scope': 'off', // Not needed in React 17+
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
        },
    },
    {
        // Node build scripts log to the console intentionally.
        files: ['src/build/**/*.{js,mjs,cjs}'],
        languageOptions: { globals: globals.node },
        rules: {
            'no-console': 'off',
        },
    },
];
