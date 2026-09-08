import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';
import { daysBetween } from '../utils/dateRanges';

const CUIDADO_DAYS_COUPLE = 14;

async function lastPeriodEnd(calendar: CalendarPage, cardIndex: number): Promise<number> {
    const ranges = await calendar.periodRanges(cardIndex);
    expect(ranges.length).toBeGreaterThan(0);
    return Math.max(...ranges.map((r) => r.end));
}

test.describe('Extra weeks until age 8', () => {
    test('declining them drops the row for that parent only and shortens their plan by two weeks', async ({
        page,
    }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['Alex', 'Sam'],
            useExtraWeeks: [false, true],
            leaveMode: 'together',
        });
        await calendar.expectLoaded();

        await expect(calendar.row(0, 'cuidado')).toHaveCount(0);
        await expect(calendar.row(1, 'cuidado')).toContainText('Extra weeks until age 8 (2 weeks)');

        expect(await calendar.rowOrder(0)).toEqual(['mandatory', 'flexible', 'lactancia']);
        expect(await calendar.rowOrder(1)).toEqual([
            'mandatory',
            'flexible',
            'lactancia',
            'cuidado',
        ]);

        const alexEnd = await lastPeriodEnd(calendar, 0);
        const samEnd = await lastPeriodEnd(calendar, 1);
        const samCuidado = await calendar.rangeOf(1, 'cuidado');
        expect(alexEnd).toBe(samCuidado.start);
        expect(daysBetween(alexEnd, samEnd)).toBe(CUIDADO_DAYS_COUPLE);
    });

    test('the first parent opting out pulls the second parent forward in staggered mode', async ({
        page,
    }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['Alex', 'Sam'],
            leaveMode: 'optimized',
            firstParent: 0,
        });
        await calendar.expectLoaded();
        const samFlexibleWithExtra = await calendar.rangeOf(1, 'flexible');

        await calendar.clickReset();
        await wizard.complete({
            names: ['Alex', 'Sam'],
            useExtraWeeks: [false, true],
            leaveMode: 'optimized',
            firstParent: 0,
        });
        await calendar.expectLoaded();

        await expect(calendar.row(0, 'cuidado')).toHaveCount(0);
        const alexEnd = await lastPeriodEnd(calendar, 0);
        const samFlexible = await calendar.rangeOf(1, 'flexible');
        expect(samFlexible.start).toBe(alexEnd);
        expect(daysBetween(samFlexible.start, samFlexibleWithExtra.start)).toBe(
            CUIDADO_DAYS_COUPLE,
        );
    });

    test('a single parent is asked about four weeks and can decline them', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.fillDueDate();
        await wizard.next();
        await wizard.chooseParentCount(1);
        await wizard.next();
        await wizard.fillNames(['Jordan']);
        await wizard.next();

        await expect(wizard.extraWeeksGroup(0)).toHaveAttribute(
            'aria-label',
            /Take the 4 paid weeks until age 8 now\? Jordan/,
        );
        await expect(wizard.parentField(0)).toContainText('Take the 4 paid weeks until age 8 now?');

        await wizard.setUseExtraWeeks(0, false);
        await wizard.submit();
        await calendar.expectLoaded();

        await expect(calendar.row(0, 'cuidado')).toHaveCount(0);
        expect(await calendar.rowOrder(0)).toEqual(['mandatory', 'flexible', 'lactancia']);
    });

    test('yes is preselected for every parent on the details step', async ({ page }) => {
        const wizard = new WizardPage(page);

        await wizard.goto();
        await wizard.fillDueDate();
        await wizard.next();
        await wizard.chooseParentCount(2);
        await wizard.next();
        await wizard.fillNames(['Alex', 'Sam']);
        await wizard.next();

        for (const i of [0, 1]) {
            await expect(wizard.extraWeeksGroup(i)).toHaveAttribute(
                'aria-label',
                new RegExp(`Take the 2 paid weeks until age 8 now\\? ${['Alex', 'Sam'][i]}`),
            );
            await expect(wizard.extraWeeksButton(i, true)).toHaveAttribute('aria-checked', 'true');
            await expect(wizard.extraWeeksButton(i, false)).toHaveAttribute(
                'aria-checked',
                'false',
            );
        }
    });
});
