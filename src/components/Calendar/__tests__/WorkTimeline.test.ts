import { describe, expect, it } from 'vitest';
import { formatDateKey, parseLocalDate } from '../../../utils/dates';
import { mergeTimeBlocks } from '../WorkTimeline';

const block = (start: string, end: string) => ({
    start: parseLocalDate(start),
    end: parseLocalDate(end),
});

const ranges = (blocks: { start: Date; end: Date }[]) =>
    blocks.map((b) => `${formatDateKey(b.start)}→${formatDateKey(b.end)}`);

describe('mergeTimeBlocks', () => {
    it('returns nothing for an empty schedule', () => {
        expect(mergeTimeBlocks([])).toEqual([]);
    });

    it('keeps a single block untouched', () => {
        expect(ranges(mergeTimeBlocks([block('2026-03-02', '2026-04-13')]))).toEqual([
            '2026-03-02→2026-04-13',
        ]);
    });

    it('merges blocks that touch end to start into one stretch away from work', () => {
        const merged = mergeTimeBlocks([
            block('2026-03-02', '2026-04-13'),
            block('2026-04-13', '2026-06-29'),
        ]);
        expect(ranges(merged)).toEqual(['2026-03-02→2026-06-29']);
    });

    it('keeps blocks separated by a working gap apart', () => {
        const merged = mergeTimeBlocks([
            block('2026-03-02', '2026-04-13'),
            block('2026-05-01', '2026-05-15'),
        ]);
        expect(ranges(merged)).toEqual(['2026-03-02→2026-04-13', '2026-05-01→2026-05-15']);
    });

    it('merges overlapping blocks and keeps the furthest end', () => {
        const merged = mergeTimeBlocks([
            block('2026-03-02', '2026-05-01'),
            block('2026-04-13', '2026-06-29'),
        ]);
        expect(ranges(merged)).toEqual(['2026-03-02→2026-06-29']);
    });

    it('absorbs a block fully contained in the previous one', () => {
        const merged = mergeTimeBlocks([
            block('2026-03-02', '2026-06-29'),
            block('2026-04-13', '2026-05-01'),
        ]);
        expect(ranges(merged)).toEqual(['2026-03-02→2026-06-29']);
    });

    it('sorts before merging so period order does not matter', () => {
        const merged = mergeTimeBlocks([
            block('2026-05-01', '2026-05-15'),
            block('2026-03-02', '2026-04-13'),
            block('2026-04-13', '2026-05-01'),
        ]);
        expect(ranges(merged)).toEqual(['2026-03-02→2026-05-15']);
    });

    it('does not mutate the blocks it was given', () => {
        const blocks = [block('2026-03-02', '2026-05-01'), block('2026-04-13', '2026-06-29')];
        const snapshot = ranges(blocks);

        mergeTimeBlocks(blocks);

        expect(ranges(blocks)).toEqual(snapshot);
    });
});
