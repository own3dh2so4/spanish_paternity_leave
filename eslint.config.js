import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        ignores: [
            'dist',
            'coverage',
            'node_modules',
            'e2e/node_modules',
            'e2e/playwright-report',
            'e2e/test-results',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.{ts,tsx}'],
        ...eslintReact.configs.recommended,
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {
            'react-hooks': reactHooksPlugin,
            'jsx-a11y': jsxA11y,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            ...reactHooksPlugin.configs.recommended.rules,
            ...jsxA11y.configs.recommended.rules,
            // Not in @eslint-react's recommended set, but eslint-plugin-react
            // enforced all three before the swap.
            '@eslint-react/dom-no-unsafe-target-blank': 'error',
            '@eslint-react/dom-no-unknown-property': 'error',
            '@eslint-react/no-duplicate-key': 'error',
            'jsx-a11y/no-autofocus': 'off',
            // A parent's array index is their identity across the whole domain
            // model (names[i], regimes[i], parentIndex), so it is the right key.
            '@eslint-react/no-array-index-key': 'off',
        },
    },
    {
        files: ['e2e/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    eslintConfigPrettier,
);
