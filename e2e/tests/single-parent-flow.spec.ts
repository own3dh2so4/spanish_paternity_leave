import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

test.describe('Single-parent flow', () => {
    test('skips leave mode and first parent steps and doubles the flexible allowance', async ({
        page,
    }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.fillDueDate();
        await wizard.next();
        await wizard.chooseParentCount(1);
        await wizard.next();
        await wizard.fillNames(['Jordan']);
        await wizard.next();

        await expect(wizard.allowanceSummary).toContainText(
            'Per parent: 6 mandatory + 22 flexible weeks (until 12 months) + 4 weeks until age 8 = 32 weeks.',
        );
        await expect(page.getByTestId('mode-together-btn')).toHaveCount(0);
        await wizard.submit();

        await calendar.expectLoaded();
        await expect(calendar.modeLabel).toHaveCount(0);
        await expect(calendar.card(1)).toHaveCount(0);

        await expect(calendar.card(0)).toContainText('Jordan');
        await expect(calendar.row(0, 'mandatory')).toContainText('Mandatory leave (6 weeks)');
        await expect(calendar.row(0, 'flexible')).toContainText('Flexible leave (22 weeks)');
        await expect(calendar.row(0, 'cuidado')).toContainText('Extra weeks until age 8 (4 weeks)');
    });
});
