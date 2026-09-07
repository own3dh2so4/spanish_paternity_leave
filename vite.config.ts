/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function loadBase(): string {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    return env?.VITE_BASE ?? '/spanish_paternity_leave/';
}

export default defineConfig({
    plugins: [react()],
    base: loadBase(),
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
});
