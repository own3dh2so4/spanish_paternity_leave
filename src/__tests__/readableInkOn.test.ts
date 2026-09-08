import { describe, expect, it } from 'vitest';
import { COLOR_PALETTES, LEAVE_TYPES, readableInkOn } from '../constants';
import type { ColorPalette, LeaveType } from '../types';

const LEAVE_TYPE_VALUES: LeaveType[] = Object.values(LEAVE_TYPES);

function relativeLuminance(hex: string): number {
    const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const value = Number.parseInt(hex.replace('#', ''), 16);
    return (
        0.2126 * channel((value >> 16) & 0xff) +
        0.7152 * channel((value >> 8) & 0xff) +
        0.0722 * channel(value & 0xff)
    );
}

function contrastRatio(a: string, b: string): number {
    const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('readableInkOn', () => {
    it('picks dark ink on light backgrounds and light ink on dark ones', () => {
        expect(readableInkOn('#FFFFFF')).toBe('#111827');
        expect(readableInkOn('#000000')).toBe('#FFFFFF');
    });

    it('picks dark ink for the pale lactancia swatches', () => {
        expect(readableInkOn('#C7D2FE')).toBe('#111827');
        expect(readableInkOn('#FDE68A')).toBe('#111827');
    });

    it('picks light ink for the saturated mandatory swatches', () => {
        expect(readableInkOn('#4F46E5')).toBe('#FFFFFF');
        expect(readableInkOn('#E11D48')).toBe('#FFFFFF');
    });

    const cases = Object.values(COLOR_PALETTES).flatMap((palette) =>
        LEAVE_TYPE_VALUES.map(
            (type) => [palette.id, type, (palette as ColorPalette)[type]] as const,
        ),
    );

    it.each(cases)('reaches WCAG AA on %s / %s', (_id, _type, background) => {
        expect(contrastRatio(background, readableInkOn(background))).toBeGreaterThanOrEqual(4.5);
    });
});
