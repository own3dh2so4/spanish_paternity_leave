import { expect, test } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';
import { daysBetween } from '../utils/dateRanges';

test.describe('Holiday after the leave', () => {
    test('the wizard asks for the unit and working days span longer than calendar days', async ({
        page,
    }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['Alex', 'Sam'],
            vacationUnits: ['workdays', 'days'],
            vacationDays: [15, 15],
            leaveMode: 'together',
        });
        await calendar.expectLoaded();

        await expect(calendar.row(0, 'vacation')).toContainText('15 working days');
        await expect(calendar.row(1, 'vacation')).toContainText('15 calendar days');

        const working = await calendar.rangeOf(0, 'vacation');
        const natural = await calendar.rangeOf(1, 'vacation');
        expect(daysBetween(natural.start, natural.end)).toBe(15);
        expect(daysBetween(working.start, working.end)).toBeGreaterThan(15);
    });

    test('the calendar form offers the same choice when adding a holiday', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({ names: ['Alex', 'Sam'], leaveMode: 'together' });
        await calendar.expectLoaded();

        const card = page.getByTestId('summary-card-0');
        await card.getByTestId('add-period-btn').click();
        await card.getByLabel('Duration unit').selectOption('workdays');
        await card.getByLabel('Duration', { exact: true }).fill('10');
        await card.getByTestId('add-extra-confirm').click();

        await expect(calendar.row(0, 'vacation')).toContainText('10 working days');
        const range = await calendar.rangeOf(0, 'vacation');
        expect(daysBetween(range.start, range.end)).toBeGreaterThan(10);
    });
});
