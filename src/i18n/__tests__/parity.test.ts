import { describe, expect, it } from 'vitest';
import { en } from '../en';
import { es } from '../es';

describe('translation parity', () => {
    it('has the same keys with the same value kinds in both languages', () => {
        const enKeys = Object.keys(en).sort();
        const esKeys = Object.keys(es).sort();
        expect(esKeys).toEqual(enKeys);
        for (const key of enKeys) {
            const k = key as keyof typeof en;
            expect(typeof es[k]).toBe(typeof en[k]);
            if (typeof en[k] === 'string') expect((es[k] as string).length).toBeGreaterThan(0);
        }
    });
});
