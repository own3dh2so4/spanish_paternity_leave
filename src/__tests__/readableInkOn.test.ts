import { describe, expect, it } from 'vitest';
import { COLOR_PALETTES, LEAVE_TYPES, readableInkOn } from '../constants';
import type { ColorPalette, LeaveType } from '../types';

const LEAVE_TYPE_VALUES: LeaveType[] = Object.values(LEAVE_TYPES);
const WCAG_AA_NORMAL_TEXT = 4.5;

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
    it('flips the ink with the background', () => {
        expect(readableInkOn('#FFFFFF')).toBe('#111827');
        expect(readableInkOn('#000000')).toBe('#FFFFFF');
        expect(readableInkOn('#C7D2FE')).toBe('#111827');
        expect(readableInkOn('#4F46E5')).toBe('#FFFFFF');
    });

    it('reaches WCAG AA on every palette colour', () => {
        const failures = Object.values(COLOR_PALETTES).flatMap((palette) =>
            LEAVE_TYPE_VALUES.flatMap((type) => {
                const background = (palette as ColorPalette)[type];
                const ratio = contrastRatio(background, readableInkOn(background));
                return ratio >= WCAG_AA_NORMAL_TEXT
                    ? []
                    : [`${palette.id}/${type} ${background} is ${ratio.toFixed(2)}:1`];
            }),
        );

        expect(failures).toEqual([]);
    });
});
