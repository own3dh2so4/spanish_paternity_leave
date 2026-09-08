import { defineConfig, devices } from '@playwright/test';

const DEV_SERVER_URL = 'http://localhost:5173';

/** Point at an already-running deployment (a preview build, a container) instead of `npm run dev`. */
const baseURL = process.env.E2E_BASE_URL ?? DEV_SERVER_URL;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // One Vite dev server backs every worker, so an unbounded pool (one per core)
    // starves it and times specs out. CI stays serial.
    workers: process.env.CI ? 1 : 4,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL,
        locale: 'en-GB',
        timezoneId: 'Europe/Madrid',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer:
        baseURL === DEV_SERVER_URL
            ? {
                  command: 'npm run dev',
                  url: DEV_SERVER_URL,
                  reuseExistingServer: !process.env.CI,
                  cwd: '../',
              }
            : undefined,
});
