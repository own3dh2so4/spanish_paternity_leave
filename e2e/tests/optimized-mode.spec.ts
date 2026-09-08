import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';
import { findOverlap } from '../utils/dateRanges';

test.describe('Staggered (optimized) leave mode', () => {
    test('second parent starts flexible leave when the first parent returns to work', async ({
        page,
    }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['María', 'Carlos'],
            leaveMode: 'optimized',
            firstParent: 1,
        });

        await calendar.expectLoaded();
        await expect(calendar.modeLabel).toHaveText('Staggered');
        await expect(calendar.card(0)).toContainText('María');
        await expect(calendar.card(1)).toContainText('Carlos');

        const carlosRanges = await calendar.periodRanges(1);
        const carlosLastEnd = Math.max(...carlosRanges.map((r) => r.end));
        const mariaLactancia = await calendar.rangeOf(0, 'lactancia');
        const mariaFlexible = await calendar.rangeOf(0, 'flexible');
        expect(mariaLactancia.start).toBe(carlosLastEnd);
        expect(mariaFlexible.start).toBe(mariaLactancia.end);

        const mariaEditable = await calendar.periodRanges(0, { includeFixed: false });
        const carlosEditable = await calendar.periodRanges(1, { includeFixed: false });
        expect(mariaEditable.length).toBeGreaterThan(0);
        expect(carlosEditable.length).toBeGreaterThan(0);
        expect(findOverlap(mariaEditable, carlosEditable)).toBeNull();
    });
});
