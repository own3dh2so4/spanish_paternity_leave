import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
    { ignores: ['dist', 'node_modules'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            // React 17+ JSX transform — no need to import React in every file
            'react/react-in-jsx-scope': 'off',
            // TypeScript handles prop validation
            'react/prop-types': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    eslintConfigPrettier,
);
