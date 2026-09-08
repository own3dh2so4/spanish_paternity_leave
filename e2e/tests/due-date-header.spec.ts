import { expect, test } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

test.describe('Changing the due date from the calendar header', () => {
    test('opens the picker, recomputes the plan and survives a reload', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            dueDate: '01/10/2026',
            names: ['Alex', 'Sam'],
            leaveMode: 'together',
        });
        await calendar.expectLoaded();

        const dueDateButton = page.locator('.header-due-date');
        await expect(dueDateButton).toHaveText(/1 Oct 2026/);
        const mandatoryBefore = await calendar.rangeOf(0, 'mandatory');

        await dueDateButton.click();

        const calendarPopper = page.locator('.react-datepicker');
        await expect(calendarPopper).toBeVisible();
        await calendarPopper.getByRole('gridcell', { name: /15 October 2026/ }).click();

        await expect(dueDateButton).toHaveText(/15 Oct 2026/);
        const mandatoryAfter = await calendar.rangeOf(0, 'mandatory');
        expect(mandatoryAfter.start).toBeGreaterThan(mandatoryBefore.start);

        await page.reload();
        await calendar.expectLoaded();
        await expect(page.locator('.header-due-date')).toHaveText(/15 Oct 2026/);
    });
});
