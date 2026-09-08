import type { ColorPalette, ColorPaletteId, LeaveMode, LeaveType, Regime } from './types';

export const WIZARD_DATA_VERSION = 5;

export const MANDATORY_WEEKS = 6;
export const FLEXIBLE_WEEKS = { couple: 11, single: 22 } as const;
export const EXTRA_WEEKS_UNTIL_8 = { couple: 2, single: 4 } as const;
export const EXTENSION_WEEKS = { couple: 1, single: 2 } as const;
export const MAX_ANTICIPATED_WEEKS = 4;
export const MAX_BABIES = 3;
export const NEW_REGIME_START = '2025-07-31';
export const CHILD_FIRST_BIRTHDAY_MONTHS = 12;
export const CHILD_EIGHTH_BIRTHDAY_YEARS = 8;
export const PARENTAL_LEAVE_WEEKS = 8;

export const WORK_HOURS_PER_DAY = 8;
export const MAX_CONVENIO_DAYS = 60;
export const MAX_VACATION_DAYS = 60;

export interface RegimeRules {
    lactanciaMonths: number;
    /** Fixed accumulated lactancia in calendar days per child; null = estimate from working days. */
    lactanciaFixedNaturalDays: number | null;
    anticipationAllowed: boolean;
    /** Paid pre-birth leave for the biological mother, in weeks before the due date (0 = none). */
    gestationLeaveWeeks: { single: number; multiple: number };
    /** Paid calendar days the employer adds after the birth leave for the biological mother. */
    motherConvenioDays: number;
}

export const REGIME_RULES: Record<Regime, RegimeRules> = {
    et: {
        lactanciaMonths: 9,
        lactanciaFixedNaturalDays: null,
        anticipationAllowed: true,
        gestationLeaveWeeks: { single: 0, multiple: 0 },
        motherConvenioDays: 0,
    },
    ebep: {
        lactanciaMonths: 12,
        lactanciaFixedNaturalDays: null,
        anticipationAllowed: false,
        gestationLeaveWeeks: { single: 0, multiple: 0 },
        motherConvenioDays: 0,
    },
    sermas: {
        lactanciaMonths: 12,
        lactanciaFixedNaturalDays: 30,
        anticipationAllowed: false,
        gestationLeaveWeeks: { single: 4, multiple: 6 },
        motherConvenioDays: 10,
    },
};

export const REGIMES: Regime[] = ['et', 'ebep', 'sermas'];

export const LEAVE_TYPES = {
    GESTATION: 'gestation',
    ANTICIPATED: 'anticipated',
    MANDATORY: 'mandatory',
    FLEXIBLE: 'flexible',
    CONVENIO: 'convenio',
    CUIDADO: 'cuidado',
    LACTANCIA: 'lactancia',
    EXTRA: 'extra',
} as const satisfies Record<string, LeaveType>;

export const LEAVE_MODES = {
    TOGETHER: 'together',
    OPTIMIZED: 'optimized',
} as const satisfies Record<string, LeaveMode>;

export const COLOR_PALETTES: Record<ColorPaletteId, ColorPalette> = {
    indigo: {
        id: 'indigo',
        name: 'Indigo',
        gestation: '#818CF8',
        anticipated: '#818CF8',
        mandatory: '#4F46E5',
        flexible: '#818CF8',
        lactancia: '#C7D2FE',
        convenio: '#0EA5E9',
        cuidado: '#10B981',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        accent: '#4F46E5',
    },
    pink: {
        id: 'pink',
        name: 'Pink',
        gestation: '#F472B6',
        anticipated: '#F472B6',
        mandatory: '#DB2777',
        flexible: '#F472B6',
        lactancia: '#FBCFE8',
        convenio: '#0EA5E9',
        cuidado: '#10B981',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #DB2777, #9333EA)',
        accent: '#DB2777',
    },
    teal: {
        id: 'teal',
        name: 'Teal',
        gestation: '#2DD4BF',
        anticipated: '#2DD4BF',
        mandatory: '#0D9488',
        flexible: '#2DD4BF',
        lactancia: '#99F6E4',
        convenio: '#0EA5E9',
        cuidado: '#A78BFA',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #0D9488, #2563EB)',
        accent: '#0D9488',
    },
    amber: {
        id: 'amber',
        name: 'Amber',
        gestation: '#FBBF24',
        anticipated: '#FBBF24',
        mandatory: '#D97706',
        flexible: '#FBBF24',
        lactancia: '#FDE68A',
        convenio: '#A78BFA',
        cuidado: '#10B981',
        extra: '#38BDF8',
        gradient: 'linear-gradient(135deg, #D97706, #EA580C)',
        accent: '#D97706',
    },
    rose: {
        id: 'rose',
        name: 'Rose',
        gestation: '#FB7185',
        anticipated: '#FB7185',
        mandatory: '#E11D48',
        flexible: '#FB7185',
        lactancia: '#FECDD3',
        convenio: '#0EA5E9',
        cuidado: '#10B981',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #E11D48, #9F1239)',
        accent: '#E11D48',
    },
};

export const PALETTE_IDS = Object.keys(COLOR_PALETTES) as ColorPaletteId[];
export const DEFAULT_PALETTE_ID: ColorPaletteId = 'indigo';

export function paletteFor(colorId: string | undefined, index: number): ColorPalette {
    if (colorId && colorId in COLOR_PALETTES) return COLOR_PALETTES[colorId as ColorPaletteId];
    const cycled = PALETTE_IDS[Math.abs(index) % PALETTE_IDS.length] ?? DEFAULT_PALETTE_ID;
    return COLOR_PALETTES[cycled];
}

const LIGHT_INK = '#FFFFFF';
const DARK_INK = '#111827';

function srgbChannel(value: number): number {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
    const value = Number.parseInt(hex.replace('#', ''), 16);
    return (
        0.2126 * srgbChannel((value >> 16) & 0xff) +
        0.7152 * srgbChannel((value >> 8) & 0xff) +
        0.0722 * srgbChannel(value & 0xff)
    );
}

/**
 * Ink for text sitting on a palette colour. Derived from the background rather
 * than the theme: a day cell is painted from the palette, so a theme-driven
 * colour goes light-on-light in dark mode.
 */
export function readableInkOn(background: string): string {
    const luminance = relativeLuminance(background);
    const contrastWithLight = 1.05 / (luminance + 0.05);
    const contrastWithDark = (luminance + 0.05) / (relativeLuminance(DARK_INK) + 0.05);
    return contrastWithLight >= contrastWithDark ? LIGHT_INK : DARK_INK;
}

export const MAX_DURATION_VALUE = 999;

export const STORAGE_KEY = 'paternity_leave_data';
