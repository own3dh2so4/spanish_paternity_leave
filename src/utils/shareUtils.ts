import LZString from 'lz-string';
import {
    COLOR_PALETTES,
    MAX_ANTICIPATED_WEEKS,
    MAX_BABIES,
    MAX_CONVENIO_DAYS,
    REGIMES,
    WIZARD_DATA_VERSION,
} from '../constants';
import type {
    ComputedParentSchedule,
    ComputedPeriod,
    LeaveType,
    Regime,
    WizardData,
} from '../types';
import { isIsoDate } from './dates';

export interface SharedPayload {
    v: number;
    data: WizardData;
    hiddenParents: number[];
}

const LEAVE_TYPE_VALUES: LeaveType[] = [
    'anticipated',
    'mandatory',
    'flexible',
    'cuidado',
    'lactancia',
    'extra',
];
const EXTRA_PRESET_VALUES = ['vacation', 'parental', 'unpaid', 'custom', 'flexible-extra'];

function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isInt(x: unknown, min: number, max: number): x is number {
    return typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
}

function isPeriod(x: unknown): x is ComputedPeriod {
    if (!isRecord(x)) return false;
    if (!LEAVE_TYPE_VALUES.includes(x.type as LeaveType)) return false;
    if (!isIsoDate(x.startDate) || !isIsoDate(x.endDate) || x.startDate > x.endDate) return false;
    if (x.days !== null && !isInt(x.days, 0, 10_000)) return false;
    if (x.type === 'extra') {
        if (typeof x.extraId !== 'string' || x.extraId.length > 64) return false;
        if (!EXTRA_PRESET_VALUES.includes(x.extraPresetKey as string)) return false;
        if (
            x.extraName !== undefined &&
            (typeof x.extraName !== 'string' || x.extraName.length > 80)
        ) {
            return false;
        }
    }
    if (x.durationValue !== undefined && !isInt(x.durationValue, 0, 10_000)) return false;
    return true;
}

function isParentSchedule(x: unknown): x is ComputedParentSchedule {
    if (!isRecord(x)) return false;
    if (typeof x.name !== 'string' || x.name.length === 0 || x.name.length > 60) return false;
    if (!(typeof x.colorId === 'string' && x.colorId in COLOR_PALETTES)) return false;
    if (!REGIMES.includes(x.regime as Regime)) return false;
    if (!isRecord(x.allowance)) return false;
    const a = x.allowance;
    if (
        !isInt(a.mandatoryWeeks, 0, 52) ||
        !isInt(a.flexibleWeeks, 0, 52) ||
        !isInt(a.extraUntil8Weeks, 0, 52)
    ) {
        return false;
    }
    return Array.isArray(x.periods) && x.periods.length <= 50 && x.periods.every(isPeriod);
}

export function validateWizardData(x: unknown): WizardData | null {
    if (!isRecord(x)) return null;
    if (x.version !== WIZARD_DATA_VERSION) return null;
    if (!isIsoDate(x.dueDate)) return null;
    if (!isInt(x.parentCount, 1, 2)) return null;
    const count = x.parentCount;
    if (!Array.isArray(x.names) || x.names.length !== count) return null;
    if (!x.names.every((n) => typeof n === 'string' && n.length > 0 && n.length <= 60)) return null;
    if (!Array.isArray(x.colors) || x.colors.length !== count) return null;
    if (!x.colors.every((c) => typeof c === 'string' && c in COLOR_PALETTES)) return null;
    if (!Array.isArray(x.regimes) || x.regimes.length !== count) return null;
    if (!x.regimes.every((r) => REGIMES.includes(r as Regime))) return null;
    if (!Array.isArray(x.convenioDays) || x.convenioDays.length !== count) return null;
    if (!x.convenioDays.every((d) => isInt(d, 0, MAX_CONVENIO_DAYS))) return null;
    if (!Array.isArray(x.useExtraWeeks) || x.useExtraWeeks.length !== count) return null;
    if (!x.useExtraWeeks.every((v) => typeof v === 'boolean')) return null;
    if (x.leaveMode !== 'together' && x.leaveMode !== 'optimized') return null;
    if (!isInt(x.firstParent, 0, 1)) return null;
    if (!isInt(x.babies, 1, MAX_BABIES)) return null;
    if (typeof x.disability !== 'boolean') return null;
    if (x.biologicalMother !== null && !isInt(x.biologicalMother, 0, 1)) return null;
    if (!isInt(x.anticipatedWeeks, 0, MAX_ANTICIPATED_WEEKS)) return null;
    if (!Array.isArray(x.schedule) || x.schedule.length !== count) return null;
    if (!x.schedule.every(isParentSchedule)) return null;
    return {
        version: WIZARD_DATA_VERSION,
        dueDate: x.dueDate,
        parentCount: count as 1 | 2,
        names: x.names as string[],
        colors: x.colors as WizardData['colors'],
        regimes: x.regimes as Regime[],
        convenioDays: x.convenioDays as number[],
        useExtraWeeks: x.useExtraWeeks as boolean[],
        leaveMode: x.leaveMode,
        firstParent: x.firstParent,
        babies: x.babies,
        disability: x.disability,
        biologicalMother: x.biologicalMother,
        anticipatedWeeks: x.anticipatedWeeks,
        schedule: x.schedule,
    };
}

export function compressWizardData(data: WizardData, hiddenParents: Set<number>): string {
    const payload: SharedPayload = {
        v: WIZARD_DATA_VERSION,
        data,
        hiddenParents: [...hiddenParents].filter((i) => i < data.parentCount),
    };
    return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

const MAX_SHARE_PARAM_LENGTH = 20_000;

export function decompressWizardData(compressed: string): SharedPayload | null {
    if (compressed.length > MAX_SHARE_PARAM_LENGTH) return null;
    try {
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (!json) return null;
        const parsed: unknown = JSON.parse(json);
        if (!isRecord(parsed)) return null;
        const data = validateWizardData(parsed.data);
        if (!data) return null;
        const hidden = Array.isArray(parsed.hiddenParents)
            ? parsed.hiddenParents.filter((i): i is number => isInt(i, 0, 1))
            : [];
        return { v: WIZARD_DATA_VERSION, data, hiddenParents: hidden };
    } catch {
        return null;
    }
}
