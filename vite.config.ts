/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/spanish_paternity_leave/',
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
    },
});
