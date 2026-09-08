import { describe, expect, it } from 'vitest';
import { en, type TranslationKeys } from '../en';
import { es } from '../es';

const LANGUAGES: [string, TranslationKeys][] = [
    ['en', en],
    ['es', es],
];

/** Arguments wide enough to reach the singular, plural and unit branches. */
const CALLS: Record<string, unknown[][]> = {
    accumulatedLactancia: [
        [1, 'days'],
        [2, 'days'],
        [1, 'weeks'],
        [3, 'weeks'],
        [1, 'months'],
        [4, 'months'],
    ],
    allowanceSummary: [[6, 11, 2]],
    babiesOption: [[1], [2], [3]],
    regimeOption: [['et'], ['ebep'], ['sermas']],
    regimeHint: [['et'], ['ebep'], ['sermas']],
    tooltipSwitchTheme: [['dark'], ['light']],
};

const DEFAULT_CALLS: unknown[][] = [[1], [2]];

describe('translation parity', () => {
    it('has the same keys with the same value kinds in both languages', () => {
        const enKeys = Object.keys(en).sort();
        const esKeys = Object.keys(es).sort();
        expect(esKeys).toEqual(enKeys);
        for (const key of enKeys) {
            const k = key as keyof TranslationKeys;
            expect(typeof es[k]).toBe(typeof en[k]);
            if (typeof en[k] === 'string') expect((es[k] as string).length).toBeGreaterThan(0);
        }
    });

    it.each(LANGUAGES)('renders every %s interpolation without gaps', (_lang, translations) => {
        const empty: string[] = [];

        for (const [key, value] of Object.entries(translations)) {
            if (typeof value !== 'function') continue;
            const fn = value as (...args: unknown[]) => string;
            const argSets = CALLS[key] ?? (fn.length > 1 ? [] : DEFAULT_CALLS);
            for (const args of argSets) {
                const rendered = fn(...args);
                if (typeof rendered !== 'string' || rendered.trim().length === 0) {
                    empty.push(`${key}(${args.join(', ')})`);
                }
                if (rendered.includes('undefined') || rendered.includes('NaN')) {
                    empty.push(`${key}(${args.join(', ')}) -> ${rendered}`);
                }
            }
        }

        expect(empty).toEqual([]);
    });

    it('pluralises the accumulated lactancia label per unit in both languages', () => {
        expect(en.accumulatedLactancia(1, 'days')).toContain('1 day');
        expect(en.accumulatedLactancia(2, 'days')).toContain('2 days');
        expect(en.accumulatedLactancia(1, 'weeks')).toContain('1 week');
        expect(en.accumulatedLactancia(1, 'months')).toContain('1 month');

        expect(es.accumulatedLactancia(1, 'days')).toContain('1 día');
        expect(es.accumulatedLactancia(2, 'days')).toContain('2 días');
        expect(es.accumulatedLactancia(1, 'weeks')).toContain('1 semana');
        expect(es.accumulatedLactancia(1, 'months')).toContain('1 mes');
        expect(es.accumulatedLactancia(4, 'months')).toContain('4 meses');
    });
});
