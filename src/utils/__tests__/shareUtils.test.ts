import { describe, expect, it } from 'vitest';
import { at } from '../../test-helpers';
import LZString from 'lz-string';
import { makeData } from '../../test-fixtures';
import type { LeaveType, WizardInput } from '../../types';
import { compressWizardData, decompressWizardData, validateWizardData } from '../shareUtils';

const encode = (obj: unknown) => LZString.compressToEncodedURIComponent(JSON.stringify(obj));

describe('share round trip', () => {
    it('restores the same data and hidden parents', () => {
        const data = makeData({ leaveMode: 'optimized' });
        const payload = decompressWizardData(compressWizardData(data, new Set([1])));
        expect(payload?.data).toEqual(data);
        expect(payload?.hiddenParents).toEqual([1]);
    });

    it.each([
        ['a plain ET plan', {}, 'flexible'],
        ['convenio days', { convenioDays: [10, 0] }, 'convenio'],
        [
            'a SERMAS biological mother',
            { regimes: ['sermas', 'sermas'], biologicalMother: 0 },
            'gestation',
        ],
        ['SERMAS without a biological mother', { regimes: ['sermas', 'sermas'] }, 'lactancia'],
        ['EBEP', { regimes: ['ebep', 'ebep'] }, 'lactancia'],
    ] as [string, Partial<WizardInput>, LeaveType][])(
        'survives %s',
        (_label, overrides, expectedType) => {
            const data = makeData(overrides);
            const emitted = data.schedule.flatMap((parent) => parent.periods.map((p) => p.type));
            expect(emitted).toContain(expectedType);

            expect(validateWizardData(data)).not.toBeNull();
            expect(decompressWizardData(compressWizardData(data, new Set()))?.data).toEqual(data);
        },
    );
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
        [
            'non-boolean useExtraWeeks',
            (d: Record<string, unknown>) => (d.useExtraWeeks = ['yes', 'no']),
        ],
        [
            'useExtraWeeks length mismatch',
            (d: Record<string, unknown>) => (d.useExtraWeeks = [true]),
        ],
        ['convenio days out of range', (d: Record<string, unknown>) => (d.convenioDays = [99, 0])],
        ['schedule not array', (d: Record<string, unknown>) => (d.schedule = {})],
        [
            'period with inverted dates',
            (d: Record<string, unknown>) => {
                const s = d.schedule as { periods: { startDate: string; endDate: string }[] }[];
                at(at(s, 0).periods, 0).endDate = '2020-01-01';
            },
        ],
        [
            'extra without preset',
            (d: Record<string, unknown>) => {
                const s = d.schedule as { periods: Record<string, unknown>[] }[];
                at(s, 0).periods.push({
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
