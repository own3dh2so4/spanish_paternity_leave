import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

test.describe('Basic flow: two parents together', () => {
    test('shows both summary cards with the standard periods', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({ names: ['Alex', 'Sam'], leaveMode: 'together' });

        await calendar.expectLoaded();
        await expect(calendar.modeLabel).toHaveText('Together');

        await expect(calendar.card(0)).toContainText('Alex');
        await expect(calendar.card(1)).toContainText('Sam');

        for (const idx of [0, 1]) {
            await expect(calendar.row(idx, 'mandatory')).toContainText('Mandatory leave (6 weeks)');
            await expect(calendar.row(idx, 'flexible')).toContainText('Flexible leave (11 weeks)');
            await expect(calendar.row(idx, 'lactancia')).toContainText(
                /Accumulated lactancia \(\d+ days\)/,
            );
            await expect(calendar.row(idx, 'cuidado')).toContainText(
                'Extra weeks until age 8 (2 weeks)',
            );
        }
    });
});
