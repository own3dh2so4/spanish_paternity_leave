import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

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
        const mariaFlexible = await calendar.rangeOf(0, 'flexible');
        expect(mariaFlexible.start).toBe(carlosLastEnd);

        // Staggering buys a longer stretch of cover, so the flexible blocks are what
        // must not overlap. María's lactancia deliberately sits on her return to work
        // after the mandatory block, which is inside Carlos's leave.
        const carlosFlexible = await calendar.rangeOf(1, 'flexible');
        expect(mariaFlexible.start >= carlosFlexible.end).toBe(true);

        const mariaMandatory = await calendar.rangeOf(0, 'mandatory');
        const mariaLactancia = await calendar.rangeOf(0, 'lactancia');
        expect(mariaLactancia.start).toBe(mariaMandatory.end);
    });
});
