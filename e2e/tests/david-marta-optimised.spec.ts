import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';
import { findOverlap, htmlDragAndDrop } from '../utils/dragAndDrop';

/**
 * David and Marta plan staggered leave. Marta stays home first, reorders her
 * lactancia before her flexible weeks by dragging, then extends lactancia to
 * one month. David's leave must cascade so that no day is shared.
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
        await htmlDragAndDrop(
            calendar.dragHandle(MARTA, 'lactancia'),
            calendar.row(MARTA, 'flexible'),
        );
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

        const overlap = findOverlap(davidRanges, martaRanges);
        expect(
            overlap,
            overlap
                ? `David ${overlap[0].start}→${overlap[0].end} overlaps Marta ${overlap[1].start}→${overlap[1].end}`
                : undefined,
        ).toBeNull();
    });
});
