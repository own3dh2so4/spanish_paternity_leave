import { test, expect, type Page } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

async function openCalendar(page: Page): Promise<CalendarPage> {
    const wizard = new WizardPage(page);
    const calendar = new CalendarPage(page);
    await wizard.goto();
    await wizard.complete({ names: ['Alex', 'Sam'], leaveMode: 'together' });
    await calendar.expectLoaded();
    return calendar;
}

test.describe('Calendar view interactions', () => {
    test('editing the flexible duration updates the row label and keeps periods chained', async ({
        page,
    }) => {
        const calendar = await openCalendar(page);

        await calendar.setDuration(0, 'flexible', 8);

        await expect(calendar.row(0, 'flexible')).toContainText('Flexible leave (8 weeks)');
        await expect(calendar.row(1, 'flexible')).toContainText('Flexible leave (11 weeks)');

        const flexible = await calendar.rangeOf(0, 'flexible');
        const lactancia = await calendar.rangeOf(0, 'lactancia');
        expect(lactancia.start).toBe(flexible.end);
    });

    test('"Move earlier" swaps lactancia with the flexible period', async ({ page }) => {
        const calendar = await openCalendar(page);

        expect(await calendar.rowOrder(0)).toEqual([
            'mandatory',
            'flexible',
            'lactancia',
            'cuidado',
        ]);
        await expect(
            calendar.row(0, 'flexible').getByRole('button', { name: 'Move earlier' }),
        ).toBeDisabled();

        await calendar.moveEarlier(0, 'lactancia');

        expect(await calendar.rowOrder(0)).toEqual([
            'mandatory',
            'lactancia',
            'flexible',
            'cuidado',
        ]);
        const mandatory = await calendar.rangeOf(0, 'mandatory');
        const lactancia = await calendar.rangeOf(0, 'lactancia');
        const flexible = await calendar.rangeOf(0, 'flexible');
        expect(lactancia.start).toBe(mandatory.end);
        expect(flexible.start).toBe(lactancia.end);
    });

    test('hiding a parent collapses their card and the toggle flips back on show', async ({
        page,
    }) => {
        const calendar = await openCalendar(page);
        const toggle = calendar.visibilityToggle(0);

        await expect(toggle).toHaveAttribute('aria-label', 'Hide this parent');
        await calendar.toggleParentVisibility(0);
        await expect(toggle).toHaveAttribute('aria-label', 'Show this parent');
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await expect(calendar.card(0).locator('.summary-card-body')).toHaveClass(
            /summary-card-body--hidden/,
        );
        await expect(calendar.row(1, 'mandatory')).toBeVisible();

        await calendar.toggleParentVisibility(0);
        await expect(toggle).toHaveAttribute('aria-label', 'Hide this parent');
        await expect(calendar.row(0, 'mandatory')).toBeVisible();
    });

    test('adding a holiday period appends a vacation row after the last period', async ({
        page,
    }) => {
        const calendar = await openCalendar(page);

        await calendar.addExtraPeriod(0, 'vacation', 2);

        const vacation = calendar.row(0, 'vacation');
        await expect(vacation).toBeVisible();
        await expect(vacation).toContainText('Holidays');
        await expect(vacation).toContainText('2 weeks');
        await expect(calendar.row(1, 'vacation')).toHaveCount(0);

        const cuidado = await calendar.rangeOf(0, 'cuidado');
        const vacationRange = await calendar.rangeOf(0, 'vacation');
        expect(vacationRange.start).toBe(cuidado.end);
    });

    test('Edit returns to the wizard with the previous data', async ({ page }) => {
        const calendar = await openCalendar(page);
        const wizard = new WizardPage(page);

        await calendar.clickEdit();

        await expect(wizard.nextBtn).toBeVisible();
        await expect(wizard.dueDateInput).not.toHaveValue('');
        await expect(page.getByRole('status')).toContainText('Recalculating will discard');
    });

    test('Reset returns to an empty wizard', async ({ page }) => {
        const calendar = await openCalendar(page);
        const wizard = new WizardPage(page);

        await calendar.clickReset();

        await expect(wizard.nextBtn).toBeVisible();
        await expect(wizard.nextBtn).toBeDisabled();
        await expect(wizard.dueDateInput).toHaveValue('');
        await expect(page.getByRole('status')).toHaveCount(0);
    });
});
