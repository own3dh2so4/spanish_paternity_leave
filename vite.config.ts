import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

function loadBase(): string {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
        ?.env;
    return env?.VITE_BASE ?? '/spanish_paternity_leave/';
}

const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

/**
 * Build-only: the dev server needs inline scripts and a websocket for HMR, so
 * shipping this policy in index.html itself would break `npm run dev`.
 */
function contentSecurityPolicy(): Plugin {
    return {
        name: 'content-security-policy',
        apply: 'build',
        transformIndexHtml(html) {
            return html.replace(
                '<head>',
                `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
            );
        },
    };
}

export default defineConfig({
    plugins: [react(), contentSecurityPolicy()],
    base: loadBase(),
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/main.tsx',
                'src/test-setup.ts',
                'src/test-fixtures.ts',
            ],
            thresholds: {
                statements: 84,
                branches: 75,
                functions: 79,
                lines: 86,
            },
        },
    },
});
