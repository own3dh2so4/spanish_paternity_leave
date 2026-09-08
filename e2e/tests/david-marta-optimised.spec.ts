import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

/**
 * David and Marta plan staggered leave. Marta stays home first, reorders her
 * lactancia before her flexible weeks by dragging, then extends lactancia to
 * one month. David's flexible weeks must cascade to start when Marta finishes;
 * his own lactancia stays on his return to work after the mandatory block, so it
 * sits inside Marta's leave by design.
 */
test.describe('David & Marta — staggered mode with reordering and duration edit', () => {
    test('Marta reorders and extends lactancia; David cascades with no overlaps', async ({
        page,
    }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);
        const DAVID = 0;
        const MARTA = 1;

        await wizard.goto();
        await wizard.complete({
            names: ['David', 'Marta'],
            leaveMode: 'optimized',
            firstParent: MARTA,
        });
        await calendar.expectLoaded();
        await expect(calendar.modeLabel).toHaveText('Staggered');
        await expect(calendar.card(DAVID)).toContainText('David');
        await expect(calendar.card(MARTA)).toContainText('Marta');

        const davidFlexibleBefore = await calendar.rangeOf(DAVID, 'flexible');

        expect(await calendar.rowOrder(MARTA)).toEqual([
            'mandatory',
            'flexible',
            'lactancia',
            'cuidado',
        ]);
        await calendar.dragHandle(MARTA, 'lactancia').dragTo(calendar.row(MARTA, 'flexible'));
        expect(await calendar.rowOrder(MARTA)).toEqual([
            'mandatory',
            'lactancia',
            'flexible',
            'cuidado',
        ]);

        await calendar.setDuration(MARTA, 'lactancia', 1, 'months');
        await expect(calendar.row(MARTA, 'lactancia')).toContainText(
            'Accumulated lactancia (1 month)',
        );

        const martaMandatory = await calendar.rangeOf(MARTA, 'mandatory');
        const martaLactancia = await calendar.rangeOf(MARTA, 'lactancia');
        const martaFlexible = await calendar.rangeOf(MARTA, 'flexible');
        expect(martaLactancia.start).toBe(martaMandatory.end);
        expect(martaFlexible.start).toBe(martaLactancia.end);

        const martaRanges = await calendar.periodRanges(MARTA);
        const davidRanges = await calendar.periodRanges(DAVID, { includeFixed: false });
        expect(davidRanges.length).toBeGreaterThan(0);
        expect(martaRanges.length).toBeGreaterThan(0);

        const martaLastEnd = Math.max(...martaRanges.map((r) => r.end));
        const davidFlexible = await calendar.rangeOf(DAVID, 'flexible');
        expect(davidFlexible.start).toBe(martaLastEnd);
        expect(davidFlexible.start).toBeGreaterThan(davidFlexibleBefore.start);

        const martaFlexibleAfter = await calendar.rangeOf(MARTA, 'flexible');
        expect(davidFlexible.start >= martaFlexibleAfter.end).toBe(true);

        const davidMandatory = await calendar.rangeOf(DAVID, 'mandatory');
        const davidLactancia = await calendar.rangeOf(DAVID, 'lactancia');
        expect(davidLactancia.start).toBe(davidMandatory.end);
    });
});
