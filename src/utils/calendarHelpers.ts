import { LEAVE_TYPES, MAX_CONVENIO_DAYS, PARENTAL_LEAVE_WEEKS } from '../constants';
import type { TranslationKeys } from '../i18n/en';
import type {
    ComputedParentSchedule,
    ComputedPeriod,
    EditUnit,
    ExtraLeaveItem,
    ExtraPresetKey,
    WizardData,
    WizardInput,
} from '../types';
import {
    addDays,
    addMonths,
    addWorkingDays,
    countWorkingDays,
    daysBetween,
    formatDateKey,
    parseLocalDate,
} from './dates';
import { calculateLeaveSchedule } from './leaveCalculator';
import { getMaxWeeksFor } from './leaveLaw';
import {
    cascadeAllFromEdit,
    gapsOf,
    mandatoryEndOf,
    recomputeEnd,
    splitFixed,
    tightCascadeAll,
} from './periodChain';

export interface ExtraPreset {
    key: ExtraPresetKey;
    labelKey: keyof TranslationKeys;
    emoji: string;
    defaultValue: number;
    defaultUnit: 'days' | 'weeks';
}

export const EXTRA_PRESETS: ExtraPreset[] = [
    {
        key: 'vacation',
        labelKey: 'presetVacation',
        emoji: '🏖️',
        defaultValue: 2,
        defaultUnit: 'weeks',
    },
    {
        key: 'parental',
        labelKey: 'presetParental',
        emoji: '👶',
        defaultValue: PARENTAL_LEAVE_WEEKS,
        defaultUnit: 'weeks',
    },
    { key: 'unpaid', labelKey: 'presetUnpaid', emoji: '📋', defaultValue: 5, defaultUnit: 'days' },
    { key: 'custom', labelKey: 'presetCustom', emoji: '✏️', defaultValue: 1, defaultUnit: 'weeks' },
];

export function presetLabel(key: ExtraPresetKey | undefined, t: TranslationKeys): string {
    const preset = EXTRA_PRESETS.find((p) => p.key === key);
    return preset ? `${preset.emoji} ${t[preset.labelKey] as string}` : t.extraPeriod;
}

export function generateExtraId(): string {
    return `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPeriodKey(period: ComputedPeriod): string {
    return period.isExtra ? (period.extraId ?? period.type) : period.type;
}

export function periodCalendarWeeks(period: ComputedPeriod): number {
    return Math.round(
        daysBetween(parseLocalDate(period.startDate), parseLocalDate(period.endDate)) / 7,
    );
}

export function formatLeaveType(period: ComputedPeriod, t: TranslationKeys): string {
    const weeks = periodCalendarWeeks(period);
    switch (period.type) {
        case LEAVE_TYPES.GESTATION:
            return t.gestationLeave(weeks);
        case LEAVE_TYPES.ANTICIPATED:
            return t.anticipatedLeave(weeks);
        case LEAVE_TYPES.CONVENIO:
            return t.convenioLeave(
                daysBetween(parseLocalDate(period.startDate), parseLocalDate(period.endDate)),
            );
        case LEAVE_TYPES.MANDATORY:
            return t.mandatoryLeave(weeks);
        case LEAVE_TYPES.FLEXIBLE:
            return t.flexibleLeave(weeks);
        case LEAVE_TYPES.CUIDADO:
            return t.extraUntil8Leave(weeks);
        case LEAVE_TYPES.LACTANCIA:
            if (period.durationValue !== undefined && period.durationUnit !== undefined) {
                return t.accumulatedLactancia(period.durationValue, period.durationUnit);
            }
            if (period.days === null) {
                return t.accumulatedLactanciaNatural(
                    daysBetween(parseLocalDate(period.startDate), parseLocalDate(period.endDate)),
                );
            }
            return t.accumulatedLactancia(period.days, 'days');
        case LEAVE_TYPES.EXTRA:
            if (period.extraPresetKey === 'flexible-extra') return t.flexibleExtraLabel(weeks);
            if (period.extraPresetKey === 'custom') return period.extraName || t.extraPeriod;
            return presetLabel(period.extraPresetKey, t);
        default:
            return period.type;
    }
}

export function computeSchedule(input: WizardInput): ComputedParentSchedule[] {
    return calculateLeaveSchedule(input);
}

export function withSchedule(input: WizardInput): WizardData {
    return { ...input, schedule: computeSchedule(input) };
}

function currentGaps(parent: ComputedParentSchedule | undefined): number[] {
    if (!parent) return [];
    return gapsOf(splitFixed(parent.periods).editable, mandatoryEndOf(parent.periods));
}

function locatePeriod(
    parent: ComputedParentSchedule,
    periodKey: string,
): { index: number; period: ComputedPeriod } | null {
    const index = parent.periods.findIndex((p) => getPeriodKey(p) === periodKey);
    const period = parent.periods[index];
    return period ? { index, period } : null;
}

function updateParent(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    fn: (parent: ComputedParentSchedule) => ComputedParentSchedule,
): ComputedParentSchedule[] {
    return schedule.map((parent, i) => (i === parentIdx ? fn(parent) : parent));
}

function lactanciaEnd(start: Date, value: number, unit: EditUnit): { end: Date; workDays: number } {
    if (unit === 'months') {
        const end = addMonths(start, value);
        return { end, workDays: countWorkingDays(start, end) };
    }
    const workDays = unit === 'weeks' ? Math.round(value * 5) : Math.round(value);
    return { end: addWorkingDays(start, workDays), workDays };
}

/** Changes a period's duration, clamped to its statutory maximum, and re-chains. */
export function resizePeriod(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    periodKey: string,
    newValue: number,
    unit: EditUnit,
    firstParent: number,
    optimized: boolean,
): ComputedParentSchedule[] {
    const gaps = currentGaps(schedule[parentIdx]);
    const localEdit = updateParent(schedule, parentIdx, (parent) => {
        const located = locatePeriod(parent, periodKey);
        if (!located) return parent;
        const { index, period } = located;
        const start = parseLocalDate(period.startDate);

        let updated: ComputedPeriod;
        if (period.type === LEAVE_TYPES.LACTANCIA && period.days === null) {
            const end =
                unit === 'months'
                    ? addMonths(start, newValue)
                    : addDays(start, unit === 'weeks' ? newValue * 7 : newValue);
            updated = {
                ...period,
                endDate: formatDateKey(end),
                durationValue: newValue,
                durationUnit: unit,
            };
        } else if (period.type === LEAVE_TYPES.LACTANCIA) {
            const { end, workDays } = lactanciaEnd(start, newValue, unit);
            updated = {
                ...period,
                endDate: formatDateKey(end),
                days: workDays,
                durationValue: newValue,
                durationUnit: unit,
            };
        } else if (period.type === LEAVE_TYPES.CONVENIO) {
            const days = Math.min(newValue, MAX_CONVENIO_DAYS);
            updated = {
                ...period,
                endDate: formatDateKey(addDays(start, days)),
                durationValue: days,
                durationUnit: 'days',
            };
        } else {
            const maxWeeks = getMaxWeeksFor(parent, period);
            const weeks = maxWeeks === undefined ? newValue : Math.min(newValue, maxWeeks);
            updated = {
                ...period,
                endDate: formatDateKey(addDays(start, weeks * 7)),
                durationValue: weeks,
                durationUnit: 'weeks',
            };
        }
        const periods = [...parent.periods];
        periods[index] = updated;
        return { ...parent, periods };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, optimized, gaps);
}

/** Moves a period's start (never before its predecessor's end) and re-chains. */
export function shiftPeriodStart(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    periodKey: string,
    newStartIso: string,
    firstParent: number,
    optimized: boolean,
): ComputedParentSchedule[] {
    const gaps = currentGaps(schedule[parentIdx]);
    const localEdit = updateParent(schedule, parentIdx, (parent) => {
        const located = locatePeriod(parent, periodKey);
        if (!located) return parent;
        const { index, period } = located;
        const prevEnd = parent.periods[index - 1]?.endDate ?? period.startDate;
        const effectiveStart = newStartIso >= prevEnd ? newStartIso : prevEnd;
        const editableIdx = splitFixed(parent.periods).editable.findIndex(
            (p) => getPeriodKey(p) === periodKey,
        );
        gaps[editableIdx] = daysBetween(parseLocalDate(prevEnd), parseLocalDate(effectiveStart));
        const periods = [...parent.periods];
        periods[index] = {
            ...period,
            startDate: effectiveStart,
            endDate: recomputeEnd(effectiveStart, period),
        };
        return { ...parent, periods };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, optimized, gaps);
}

/** Moves `fromKey` to the position of `toKey` among editable periods and re-chains with no gaps. */
export function reorderPeriods(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    fromKey: string,
    toKey: string,
    firstParent: number,
    optimized: boolean,
): ComputedParentSchedule[] {
    const localEdit = updateParent(schedule, parentIdx, (parent) => {
        const { fixed, editable } = splitFixed(parent.periods);
        const fromIdx = editable.findIndex((p) => getPeriodKey(p) === fromKey);
        const toIdx = editable.findIndex((p) => getPeriodKey(p) === toKey);
        if (fromIdx < 0 || toIdx < 0) return parent;
        const reordered = [...editable];
        const [removed] = reordered.splice(fromIdx, 1);
        if (!removed) return parent;
        reordered.splice(toIdx, 0, removed);
        const anchor =
            fixed.find((p) => p.type === LEAVE_TYPES.MANDATORY)?.endDate ??
            editable[0]?.startDate ??
            '';
        return { ...parent, periods: [...fixed, ...tightCascadeAll(reordered, anchor)] };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, optimized, 'tight');
}

/** Swaps a period with its neighbour (direction −1 = earlier, +1 = later). */
export function movePeriod(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    periodKey: string,
    direction: -1 | 1,
    firstParent: number,
    optimized: boolean,
): ComputedParentSchedule[] {
    const { editable } = splitFixed(schedule[parentIdx]?.periods ?? []);
    const idx = editable.findIndex((p) => getPeriodKey(p) === periodKey);
    const target = editable[idx + direction];
    if (idx < 0 || !target) return schedule;
    return reorderPeriods(
        schedule,
        parentIdx,
        periodKey,
        getPeriodKey(target),
        firstParent,
        optimized,
    );
}

export function addExtraPeriod(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    item: ExtraLeaveItem,
    firstParent: number,
    optimized: boolean,
): ComputedParentSchedule[] {
    const gaps = [...currentGaps(schedule[parentIdx]), 0];
    const localEdit = updateParent(schedule, parentIdx, (parent) => {
        const startDate = parent.periods.reduce(
            (max, p) => (p.endDate > max ? p.endDate : max),
            '',
        );
        const from = parseLocalDate(startDate);
        const inWorkdays = item.durationUnit === 'workdays';
        const end = inWorkdays
            ? addWorkingDays(from, item.durationValue)
            : addDays(
                  from,
                  item.durationUnit === 'weeks' ? item.durationValue * 7 : item.durationValue,
              );
        const newPeriod: ComputedPeriod = {
            type: LEAVE_TYPES.EXTRA,
            startDate,
            endDate: formatDateKey(end),
            days: inWorkdays ? item.durationValue : null,
            isExtra: true,
            extraId: item.id,
            extraPresetKey: item.presetKey,
            extraName: item.customName,
            durationValue: item.durationValue,
            durationUnit: item.durationUnit,
        };
        return { ...parent, periods: [...parent.periods, newPeriod] };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, optimized, gaps);
}

export function removeExtraPeriod(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    extraId: string,
    firstParent: number,
    optimized: boolean,
): ComputedParentSchedule[] {
    const parent = schedule[parentIdx];
    const editable = parent ? splitFixed(parent.periods).editable : [];
    const removedIdx = editable.findIndex((p) => p.isExtra && p.extraId === extraId);
    const gaps = currentGaps(parent).filter((_, i) => i !== removedIdx);
    const localEdit = updateParent(schedule, parentIdx, (p) => ({
        ...p,
        periods: p.periods.filter((x) => !(x.isExtra && x.extraId === extraId)),
    }));
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, optimized, gaps);
}
