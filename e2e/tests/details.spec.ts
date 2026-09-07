import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

test.describe('Details step', () => {
    test('twins with a disability add two flexible weeks per parent', async ({ page }) => {
        const wizard = new WizardPage(page);

        await wizard.goto();
        await wizard.fillDueDate();
        await wizard.next();
        await wizard.chooseParentCount(2);
        await wizard.next();
        await wizard.fillNames(['Alex', 'Sam']);
        await wizard.next();

        await expect(wizard.allowanceSummary).toContainText('6 mandatory + 11 flexible');
        await wizard.setDetails({ babies: 2, disability: true });
        await expect(wizard.allowanceSummary).toContainText(
            'Per parent: 6 mandatory + 13 flexible weeks (until 12 months) + 2 weeks until age 8 = 21 weeks.',
        );
    });

    test('biological mother can take flexible weeks before the birth', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['Marta', 'David'],
            details: { mother: 0, anticipatedWeeks: 2 },
            leaveMode: 'together',
        });

        await calendar.expectLoaded();
        await expect(calendar.row(0, 'anticipated')).toContainText('Before the birth (2 weeks)');
        await expect(calendar.row(0, 'flexible')).toContainText('Flexible leave (9 weeks)');

        await expect(calendar.row(1, 'anticipated')).toHaveCount(0);
        await expect(calendar.row(1, 'flexible')).toContainText('Flexible leave (11 weeks)');

        const anticipated = await calendar.rangeOf(0, 'anticipated');
        const mandatory = await calendar.rangeOf(0, 'mandatory');
        expect(anticipated.end).toBe(mandatory.start);
    });

    test('anticipated weeks selector only appears once a mother is chosen', async ({ page }) => {
        const wizard = new WizardPage(page);

        await wizard.goto();
        await wizard.fillDueDate();
        await wizard.next();
        await wizard.next();
        await wizard.fillNames(['Marta', 'David']);
        await wizard.next();

        await expect(page.getByTestId('anticipated-btn-0')).toHaveCount(0);
        await wizard.setDetails({ mother: 1 });
        await expect(page.getByTestId('anticipated-btn-4')).toBeVisible();
        await wizard.setDetails({ mother: null });
        await expect(page.getByTestId('anticipated-btn-0')).toHaveCount(0);
    });
});
