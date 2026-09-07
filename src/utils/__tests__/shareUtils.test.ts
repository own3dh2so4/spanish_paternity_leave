import { describe, expect, it } from 'vitest';
import LZString from 'lz-string';
import { makeData } from '../../test-fixtures';
import { compressWizardData, decompressWizardData, validateWizardData } from '../shareUtils';

const encode = (obj: unknown) => LZString.compressToEncodedURIComponent(JSON.stringify(obj));

describe('share round trip', () => {
    it('restores the same data and hidden parents', () => {
        const data = makeData({ leaveMode: 'optimized' });
        const payload = decompressWizardData(compressWizardData(data, new Set([1])));
        expect(payload?.data).toEqual(data);
        expect(payload?.hiddenParents).toEqual([1]);
    });
});

describe('validateWizardData', () => {
    it('accepts a computed schedule', () => {
        expect(validateWizardData(makeData())).not.toBeNull();
    });

    it.each([
        ['no version', (d: Record<string, unknown>) => delete d.version],
        ['old version', (d: Record<string, unknown>) => (d.version = 1)],
        ['bad date', (d: Record<string, unknown>) => (d.dueDate = '2026-13-40')],
        ['parentCount mismatch', (d: Record<string, unknown>) => (d.parentCount = 1)],
        ['unknown colour', (d: Record<string, unknown>) => (d.colors = ['neon', 'pink'])],
        ['missing names', (d: Record<string, unknown>) => delete d.names],
        ['bad babies', (d: Record<string, unknown>) => (d.babies = 7)],
        ['unknown regime', (d: Record<string, unknown>) => (d.regimes = ['muface', 'et'])],
        ['convenio days out of range', (d: Record<string, unknown>) => (d.convenioDays = [99, 0])],
        ['schedule not array', (d: Record<string, unknown>) => (d.schedule = {})],
        [
            'period with inverted dates',
            (d: Record<string, unknown>) => {
                const s = d.schedule as { periods: { startDate: string; endDate: string }[] }[];
                s[0].periods[0].endDate = '2020-01-01';
            },
        ],
        [
            'extra without preset',
            (d: Record<string, unknown>) => {
                const s = d.schedule as { periods: Record<string, unknown>[] }[];
                s[0].periods.push({
                    type: 'extra',
                    startDate: '2027-01-01',
                    endDate: '2027-01-08',
                    days: null,
                    extraId: 'x',
                });
            },
        ],
    ])('rejects %s', (_label, mutate) => {
        const d = JSON.parse(JSON.stringify(makeData())) as Record<string, unknown>;
        mutate(d);
        expect(validateWizardData(d)).toBeNull();
    });

    it('rejects non-objects', () => {
        expect(validateWizardData(null)).toBeNull();
        expect(validateWizardData('x')).toBeNull();
        expect(validateWizardData([])).toBeNull();
    });
});

describe('decompressWizardData', () => {
    it('returns null for garbage, legacy payloads and oversized input', () => {
        expect(decompressWizardData('not-lz')).toBeNull();
        expect(decompressWizardData(encode({ dueDate: '2026-01-01', names: ['A'] }))).toBeNull();
        expect(
            decompressWizardData(encode({ data: { version: 2 }, hiddenParents: [] })),
        ).toBeNull();
        expect(decompressWizardData('a'.repeat(30_000))).toBeNull();
    });

    it('drops out-of-range hidden indices', () => {
        const raw = encode({ v: 2, data: makeData(), hiddenParents: [0, 5, 'x'] });
        expect(decompressWizardData(raw)?.hiddenParents).toEqual([0]);
    });
});
