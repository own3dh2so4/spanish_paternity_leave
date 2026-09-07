export type LeaveMode = 'together' | 'optimized';
export type LeaveType =
    | 'gestation'
    | 'anticipated'
    | 'mandatory'
    | 'flexible'
    | 'convenio'
    | 'cuidado'
    | 'lactancia'
    | 'extra';
export type ColorPaletteId = 'indigo' | 'pink' | 'teal' | 'amber' | 'rose';
export type EditUnit = 'days' | 'weeks' | 'months';
export type ExtraPresetKey = 'vacation' | 'parental' | 'unpaid' | 'custom' | 'flexible-extra';
/** Which set of rules governs a parent: Estatuto de los Trabajadores, EBEP (public employee) or SERMAS pact. */
export type Regime = 'et' | 'ebep' | 'sermas';

export interface ColorPalette extends Record<LeaveType, string> {
    id: ColorPaletteId;
    name: string;
    gradient: string;
    accent: string;
}

export interface LeaveAllowance {
    mandatoryWeeks: number;
    flexibleWeeks: number;
    extraUntil8Weeks: number;
}

export interface DateMapEntry {
    type: LeaveType;
    parentIndex: number;
    parentName: string;
    label: string;
}

export type DateMap = Record<string, DateMapEntry[]>;

export interface ExtraLeaveItem {
    id: string;
    presetKey: ExtraPresetKey;
    customName?: string;
    durationValue: number;
    durationUnit: 'days' | 'weeks';
}

/** ISO date boundaries: startDate inclusive, endDate exclusive. */
export interface ComputedPeriod {
    type: LeaveType;
    startDate: string;
    endDate: string;
    /** Working-day count for lactancia; null when the period is measured in calendar days. */
    days: number | null;
    isExtra?: true;
    extraId?: string;
    extraPresetKey?: ExtraPresetKey;
    extraName?: string;
    durationValue?: number;
    durationUnit?: EditUnit;
}

export interface ComputedParentSchedule {
    name: string;
    colorId: ColorPaletteId;
    regime: Regime;
    allowance: LeaveAllowance;
    /** Fixed periods first (gestation, anticipated, mandatory), then the editable chain in display order. */
    periods: ComputedPeriod[];
}

export interface WizardInput {
    version: number;
    dueDate: string;
    parentCount: 1 | 2;
    names: string[];
    colors: ColorPaletteId[];
    regimes: Regime[];
    /** Paid calendar days granted by the employer or collective agreement right after the leave, per parent. */
    convenioDays: number[];
    leaveMode: LeaveMode;
    firstParent: number;
    babies: number;
    disability: boolean;
    biologicalMother: number | null;
    anticipatedWeeks: number;
}

export interface WizardData extends WizardInput {
    schedule: ComputedParentSchedule[];
}
