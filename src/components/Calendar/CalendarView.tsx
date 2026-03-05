import React, { useMemo, useState, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import MonthGrid from './MonthGrid';
import {
    calculateLeaveSchedule,
    formatDateKey,
    formatDisplayDate,
    addDays,
    addMonths,
    addWorkingDays,
} from '../../utils/leaveCalculator';
import {
    COLOR_PALETTES,
    LEAVE_TYPES,
    MANDATORY_WEEKS,
    FLEXIBLE_WEEKS,
    CUIDADO_PAID_WEEKS,
} from '../../constants';
import type {
    ColorPalette,
    CustomDuration,
    CustomDurations,
    CustomDurationsForParent,
    CustomStartDates,
    CustomStartDatesForParent,
    DateMapEntry,
    EditUnit,
    ExtraLeaveItem,
    LeavePeriod,
    LeaveType,
    ParentSchedule,
    ScheduleResult,
    WizardData,
} from '../../types';
import './CalendarView.css';

registerLocale('es', es);

const DEFAULT_DURATIONS: Record<LeaveType, number> = {
    mandatory: MANDATORY_WEEKS * 7,
    flexible: FLEXIBLE_WEEKS * 7,
    lactancia: 0,
    cuidado: 0,
    extra: 0,
};

const EXTRA_PRESETS: Array<{
    key: string;
    label: string;
    defaultValue: number;
    defaultUnit: 'days' | 'weeks';
}> = [
    { key: 'vacation', label: '🏖️ Vacation',        defaultValue: 2, defaultUnit: 'weeks' },
    { key: 'unpaid',   label: '📋 Unpaid leave',     defaultValue: 5, defaultUnit: 'days'  },
    { key: 'gradual',  label: '🔄 Gradual return',   defaultValue: 4, defaultUnit: 'weeks' },
    { key: 'custom',   label: '✏️ Custom',            defaultValue: 1, defaultUnit: 'weeks' },
];

function generateExtraId(): string {
    return `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Return the number of whole calendar days between two dates, DST-safe.
 *
 * Raw millisecond subtraction (end - start) includes the ±1-hour DST offset,
 * which makes the result 1 hour short or long and shifts computed end-dates to
 * 23:00 or 01:00 instead of midnight. Using Math.round absorbs the ±1 h skew
 * (DST never shifts by more than 1 h in Spain/EU).
 */
function daysBetween(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Returns the number of whole flexible-leave weeks still available for a parent.
 * Accounts for both the main flexible period (which may have a custom duration)
 * and any extra periods the user already added with presetKey === 'flexible-extra'.
 * Returns 0 when the full allocation is already used.
 */
function getRemainingFlexWeeks(
    parentIndex: number,
    customDurations: CustomDurations,
    extraPeriods?: ExtraLeaveItem[][],
): number {
    const flexCustom = getNormalizedCustom(
        customDurations[parentIndex] as CustomDurationsForParent | undefined,
        LEAVE_TYPES.FLEXIBLE,
    );
    const mainFlexDays = flexCustom
        ? flexCustom.unit === 'weeks'
            ? flexCustom.value * 7
            : flexCustom.value
        : FLEXIBLE_WEEKS * 7;

    const extraFlexDays = (extraPeriods?.[parentIndex] ?? [])
        .filter((item) => item.presetKey === 'flexible-extra')
        .reduce((sum, item) => {
            const days =
                item.durationUnit === 'weeks' ? item.durationValue * 7 : item.durationValue;
            return sum + days;
        }, 0);

    return Math.max(0, Math.floor((FLEXIBLE_WEEKS * 7 - mainFlexDays - extraFlexDays) / 7));
}

// ─── Unified-order types & helpers ────────────────────────────────────────────

interface UnifiedPeriod {
    /** LeaveType string for regular periods; extra item ID for user-added ones. */
    key: string;
    isExtra: boolean;
    leaveType?: LeaveType;
    extraItem?: ExtraLeaveItem;
    startDate: Date;
    endDate: Date;
    /** Working-days count; only set for lactancia, null otherwise. */
    lactanciaDays: number | null;
}

/**
 * Returns the ordered list of non-mandatory period keys for a parent.
 * Falls back to the natural schedule order when no explicit order is stored.
 * Stale keys (deleted periods) are pruned; new keys are appended at the end.
 */
function getEffectiveOrder(
    nonMandatoryPeriods: LeavePeriod[],
    extraItems: ExtraLeaveItem[],
    storedOrder: string[] | undefined,
): string[] {
    const defaultOrder = [
        ...nonMandatoryPeriods.map((p) => p.type as string),
        ...extraItems.map((item) => item.id),
    ];
    if (!storedOrder || storedOrder.length === 0) return defaultOrder;
    const valid = storedOrder.filter((k) => defaultOrder.includes(k));
    const missing = defaultOrder.filter((k) => !valid.includes(k));
    return [...valid, ...missing];
}

/**
 * Re-cascades all non-mandatory periods (regular + extra) in the given order,
 * computing fresh start/end dates from `startCursor`.
 *
 * For lactancia (working-day-based) the correct duration is resolved in priority:
 *   1. Custom duration from `customForParent` (the user's override)
 *   2. Original working-day count stored on the period (`reg.days`)
 *   3. Calendar duration fallback (should never be reached for lactancia)
 *
 * Units 'weeks' and 'months' always use calendar arithmetic; 'days' for lactancia
 * uses `addWorkingDays` so weekends are skipped, matching Spanish law.
 */
function buildUnifiedPeriods(
    order: string[],
    nonMandatoryPeriods: LeavePeriod[],
    extraItems: ExtraLeaveItem[],
    startCursor: Date,
    customForParent?: CustomDurationsForParent,
): UnifiedPeriod[] {
    const result: UnifiedPeriod[] = [];
    let cursor = new Date(startCursor);

    for (const key of order) {
        const reg = nonMandatoryPeriods.find((p) => p.type === key);
        if (reg) {
            const start = new Date(cursor);
            const isLact = reg.type === LEAVE_TYPES.LACTANCIA;
            const custom = getNormalizedCustom(customForParent, reg.type as LeaveType);
            let end: Date;
            if (custom) {
                // Respects the user's chosen unit: 'days' → working days, 'weeks'/'months' → calendar
                end = calculateCustomEnd(start, custom, isLact);
            } else if (isLact && reg.days !== null) {
                end = addWorkingDays(start, reg.days);
            } else {
                end = addDays(start, daysBetween(reg.startDate, reg.endDate));
            }
            result.push({
                key,
                isExtra: false,
                leaveType: reg.type as LeaveType,
                startDate: start,
                endDate: end,
                lactanciaDays: reg.days,
            });
            cursor = new Date(end);
        } else {
            const extra = extraItems.find((item) => item.id === key);
            if (extra) {
                const days =
                    extra.durationUnit === 'weeks' ? extra.durationValue * 7 : extra.durationValue;
                // Apply custom start date when it falls strictly after the cascade cursor
                let start = new Date(cursor);
                if (extra.startDate) {
                    const custom = new Date(extra.startDate);
                    custom.setHours(0, 0, 0, 0);
                    if (custom > cursor) start = custom;
                }
                const end = addDays(start, days);
                result.push({
                    key,
                    isExtra: true,
                    extraItem: extra,
                    startDate: start,
                    endDate: end,
                    lactanciaDays: null,
                });
                cursor = new Date(end);
            }
        }
    }
    return result;
}

// ─── Date helpers (using exported utilities from leaveCalculator) ──────────────

function calculateCustomEnd(startDate: Date, custom: CustomDuration, isLactancia: boolean): Date {
    const { value, unit } = custom;
    if (unit === 'weeks') return addDays(startDate, value * 7);
    if (unit === 'months') return addMonths(startDate, value);
    // 'days'
    return isLactancia ? addWorkingDays(startDate, value) : addDays(startDate, value);
}

// ─── Custom-duration application ─────────────────────────────────────────────

function getNormalizedCustom(
    customForParent: CustomDurationsForParent | undefined,
    periodType: LeaveType,
): CustomDuration | null {
    const val = customForParent?.[periodType];
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') {
        // Legacy format — stored as plain days
        return { value: val, unit: 'days' };
    }
    return val;
}

function applyCustomDurationsToParent(
    basePeriods: LeavePeriod[],
    customForParent: CustomDurationsForParent,
    customStartsForParent: CustomStartDatesForParent = {},
): LeavePeriod[] {
    const hasAny =
        Object.keys(customForParent).length > 0 || Object.keys(customStartsForParent).length > 0;
    if (!hasAny) return basePeriods;

    const result: LeavePeriod[] = [];
    let currentStart = new Date(basePeriods[0].startDate);

    for (const period of basePeriods) {
        // Non-mandatory periods can have their start date pushed forward
        if (period.type !== LEAVE_TYPES.MANDATORY) {
            const customStartStr = customStartsForParent[period.type];
            if (customStartStr) {
                const customStart = new Date(customStartStr);
                customStart.setHours(0, 0, 0, 0);
                // Only allow moving the start forward (never overlap with the previous period)
                if (customStart > currentStart) {
                    currentStart = customStart;
                }
            }
        }

        const isLactancia = period.type === LEAVE_TYPES.LACTANCIA;
        const customVal = getNormalizedCustom(customForParent, period.type);

        let newEnd: Date;
        if (customVal) {
            newEnd = calculateCustomEnd(currentStart, customVal, isLactancia);
        } else if (isLactancia && period.days !== null) {
            newEnd = addWorkingDays(currentStart, period.days);
        } else {
            newEnd = addDays(currentStart, daysBetween(period.startDate, period.endDate));
        }

        result.push({ ...period, startDate: new Date(currentStart), endDate: newEnd });
        currentStart = new Date(newEnd);
    }

    return result;
}

function applyCustomDurations(
    schedule: ScheduleResult,
    customDurations: CustomDurations,
    customStartDates: CustomStartDates,
    mode: string,
    firstParentIndex: number,
): ScheduleResult {
    const hasAny =
        Object.keys(customDurations).length > 0 || Object.keys(customStartDates).length > 0;
    if (!hasAny) return schedule;

    const newParents = schedule.parents.map((parent, i) => {
        const custom = customDurations[i] ?? {};
        const customStarts = customStartDates[i] ?? {};
        if (Object.keys(custom).length === 0 && Object.keys(customStarts).length === 0) return parent;
        const newPeriods = applyCustomDurationsToParent(parent.periods, custom, customStarts);
        const lastEnd = Math.max(...newPeriods.map((p) => p.endDate.getTime()));
        return { ...parent, periods: newPeriods, returnDate: new Date(lastEnd) };
    });

    // In optimized mode, cascade the second parent's non-mandatory periods off the first
    // parent's new return date.  firstParentIndex is passed explicitly because both parents'
    // mandatory leave starts on the same date (birth), so comparing start dates can't determine
    // who is "first".
    if (mode === 'optimized' && newParents.length === 2) {
        const firstIdx = firstParentIndex;
        const secondIdx = firstIdx === 0 ? 1 : 0;

        const firstReturn = newParents[firstIdx].returnDate;
        const secondParent = newParents[secondIdx];

        const mandatoryPeriod = secondParent.periods.find((p) => p.type === LEAVE_TYPES.MANDATORY);
        const otherPeriods = secondParent.periods.filter((p) => p.type !== LEAVE_TYPES.MANDATORY);

        const mandatoryEnd = mandatoryPeriod ? new Date(mandatoryPeriod.endDate) : firstReturn;
        const nonMandatoryStart = firstReturn > mandatoryEnd ? firstReturn : mandatoryEnd;

        const customSecond: CustomDurationsForParent = customDurations[secondIdx] ?? {};
        const customStartsSecond: CustomStartDatesForParent = customStartDates[secondIdx] ?? {};
        let cascadeStart = new Date(nonMandatoryStart);

        const newOtherPeriods = otherPeriods.map((period) => {
            // Apply custom start date for this period (must be after cascade start)
            const customStartStr = customStartsSecond[period.type];
            if (customStartStr) {
                const customStart = new Date(customStartStr);
                customStart.setHours(0, 0, 0, 0);
                if (customStart > cascadeStart) {
                    cascadeStart = new Date(customStart);
                }
            }

            const isLactancia = period.type === LEAVE_TYPES.LACTANCIA;
            const customVal = getNormalizedCustom(customSecond, period.type);
            let newEnd: Date;

            if (customVal) {
                newEnd = calculateCustomEnd(cascadeStart, customVal, isLactancia);
            } else if (isLactancia && period.days !== null) {
                newEnd = addWorkingDays(cascadeStart, period.days);
            } else {
                newEnd = addDays(cascadeStart, daysBetween(period.startDate, period.endDate));
            }

            const result = { ...period, startDate: new Date(cascadeStart), endDate: newEnd };
            cascadeStart = new Date(newEnd);
            return result;
        });

        const allPeriods = mandatoryPeriod
            ? [mandatoryPeriod, ...newOtherPeriods]
            : newOtherPeriods;
        const lastEnd = Math.max(...allPeriods.map((p) => p.endDate.getTime()));
        newParents[secondIdx] = { ...secondParent, periods: allPeriods, returnDate: new Date(lastEnd) };
    }

    // Recompute calendar range purely from the new periods so it can both grow AND shrink
    // (starting from the base schedule's range would prevent it from shrinking)
    let calendarStart = new Date(8640000000000000);
    let calendarEnd = new Date(-8640000000000000);
    for (const parent of newParents) {
        for (const p of parent.periods) {
            if (p.startDate < calendarStart) calendarStart = new Date(p.startDate);
            if (p.endDate > calendarEnd) calendarEnd = new Date(p.endDate);
        }
    }
    // Extend to full months (same convention as calculateLeaveSchedule)
    calendarStart.setDate(1);
    calendarEnd = addMonths(calendarEnd, 1);
    calendarEnd.setDate(0);

    return { ...schedule, parents: newParents, calendarStart, calendarEnd };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    data: WizardData;
    onEdit: () => void;
    onReset: () => void;
    onUpdateData: (data: WizardData) => void;
}

export default function CalendarView({ data, onEdit, onReset, onUpdateData }: Props) {
    // Stable references — ?? [] / {} would create a new reference on every render when undefined
    const lactanciaFirst = useMemo(() => data.lactanciaFirst ?? [true, true], [data.lactanciaFirst]);
    const customDurations = useMemo<CustomDurations>(
        () => data.customDurations ?? {},
        [data.customDurations],
    );
    const customStartDates = useMemo<CustomStartDates>(
        () => data.customStartDates ?? {},
        [data.customStartDates],
    );

    // Single source of truth for active color palettes — used in baseSchedule, dateMap, and render
    const activeColors = useMemo<ColorPalette[]>(() => {
        return data.names.map((_, i) =>
            data.colors?.[i] ? COLOR_PALETTES[data.colors[i]] : Object.values(COLOR_PALETTES)[i % 5],
        );
    }, [data.names, data.colors]);

    const [editingPeriod, setEditingPeriod] = useState<{
        parentIndex: number;
        periodType: LeaveType;
    } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editUnit, setEditUnit] = useState<EditUnit>('weeks');
    const inputRef = useRef<HTMLInputElement>(null);

    // Unified drag state — covers both regular and extra periods
    const [draggingKey, setDraggingKey] = useState<{
        parentIndex: number;
        key: string;
    } | null>(null);
    const [dragOverKey, setDragOverKey] = useState<{
        parentIndex: number;
        key: string;
    } | null>(null);

    const [editingStartDate, setEditingStartDate] = useState<{
        parentIndex: number;
        periodType: LeaveType;
    } | null>(null);
    const [editStartDateValue, setEditStartDateValue] = useState<Date | null>(null);
    const [minEditStartDate, setMinEditStartDate] = useState<Date | null>(null);

    // ── Extra-period start-date edit state ─────────────────────────────────────
    const [editingExtraDate, setEditingExtraDate] = useState<{
        parentIndex: number;
        itemId: string;
    } | null>(null);
    const [editExtraDateValue, setEditExtraDateValue] = useState<Date | null>(null);
    const [minEditExtraDate, setMinEditExtraDate] = useState<Date | null>(null);

    // ── Extra-period add form state ────────────────────────────────────────────
    const [addingForParent, setAddingForParent] = useState<number | null>(null);
    const [newPresetKey, setNewPresetKey] = useState<string>('vacation');
    const [newCustomName, setNewCustomName] = useState<string>('');
    const [newDurationValue, setNewDurationValue] = useState<number>(2);
    const [newDurationUnit, setNewDurationUnit] = useState<'days' | 'weeks'>('weeks');


    const baseSchedule = useMemo<ScheduleResult>(() => {
        const parents = data.names.map((name, i) => ({ name, color: activeColors[i] }));
        return calculateLeaveSchedule(
            data.dueDate,
            parents,
            data.leaveMode,
            data.firstParent ?? 0,
            lactanciaFirst,
            data.cuidadoWeeks ?? [],
        );
    }, [data, activeColors, lactanciaFirst]);

    const schedule = useMemo(
        () =>
            applyCustomDurations(
                baseSchedule,
                customDurations,
                customStartDates,
                data.leaveMode,
                data.firstParent ?? 0,
            ),
        [baseSchedule, customDurations, customStartDates, data.leaveMode, data.firstParent],
    );

    /**
     * Single source of truth for all non-mandatory period dates, respecting the
     * user-defined period order. In optimised mode the second parent's cascade
     * starts after the first parent's last period ends.
     */
    const unifiedPeriodsMap = useMemo(() => {
        const map = new Map<number, UnifiedPeriod[]>();

        const buildForParent = (i: number, forcedCursorStart?: Date): UnifiedPeriod[] => {
            const ps = schedule.parents[i];
            if (!ps) return [];
            const mandatory = ps.periods.find((p) => p.type === LEAVE_TYPES.MANDATORY);
            const nonMandatory = ps.periods.filter((p) => p.type !== LEAVE_TYPES.MANDATORY);
            const extraItems = data.extraPeriods?.[i] ?? [];
            let cursorStart = mandatory ? new Date(mandatory.endDate) : new Date(data.dueDate);
            if (forcedCursorStart && forcedCursorStart > cursorStart) {
                cursorStart = new Date(forcedCursorStart);
            }
            const order = getEffectiveOrder(nonMandatory, extraItems, data.periodOrder?.[i]);
            const customForParent = customDurations[i] as CustomDurationsForParent | undefined;
            return buildUnifiedPeriods(order, nonMandatory, extraItems, cursorStart, customForParent);
        };

        if (data.leaveMode === 'optimized' && data.parentCount === 2) {
            const firstIdx = data.firstParent ?? 0;
            const secondIdx = firstIdx === 0 ? 1 : 0;
            const firstPeriods = buildForParent(firstIdx);
            map.set(firstIdx, firstPeriods);
            const firstReturn =
                firstPeriods.length > 0
                    ? firstPeriods[firstPeriods.length - 1].endDate
                    : schedule.parents[firstIdx]?.returnDate ?? new Date(data.dueDate);
            map.set(secondIdx, buildForParent(secondIdx, firstReturn));
        } else {
            for (let i = 0; i < data.names.length; i++) {
                map.set(i, buildForParent(i));
            }
        }
        return map;
    }, [
        schedule,
        data.extraPeriods,
        data.periodOrder,
        data.names,
        data.leaveMode,
        data.parentCount,
        data.firstParent,
        data.dueDate,
    ]);

    const dateMap = useMemo(() => {
        const map: Record<string, DateMapEntry[]> = {};
        for (let i = 0; i < data.names.length; i++) {
            const ps = schedule.parents[i];
            if (!ps) continue;
            // Mandatory period (always from base schedule)
            const mandatory = ps.periods.find((p) => p.type === LEAVE_TYPES.MANDATORY);
            if (mandatory) {
                let cur = new Date(mandatory.startDate);
                while (cur < mandatory.endDate) {
                    const k = formatDateKey(cur);
                    if (!map[k]) map[k] = [];
                    map[k].push({ type: LEAVE_TYPES.MANDATORY, parentIndex: i, parentName: data.names[i] });
                    cur.setDate(cur.getDate() + 1);
                }
            }
            // All non-mandatory periods in unified order
            for (const uP of unifiedPeriodsMap.get(i) ?? []) {
                let cur = new Date(uP.startDate);
                while (cur < uP.endDate) {
                    const k = formatDateKey(cur);
                    if (!map[k]) map[k] = [];
                    map[k].push({
                        type: uP.isExtra ? LEAVE_TYPES.EXTRA : (uP.leaveType ?? LEAVE_TYPES.FLEXIBLE),
                        parentIndex: i,
                        parentName: data.names[i],
                        customName: uP.isExtra ? uP.extraItem?.name : undefined,
                    });
                    cur.setDate(cur.getDate() + 1);
                }
            }
        }
        return map;
    }, [schedule, unifiedPeriodsMap, data.names]);

    const birthDateKey = formatDateKey(new Date(data.dueDate));

    const months = useMemo(() => {
        const result: { year: number; month: number }[] = [];
        const start = new Date(schedule.calendarStart);
        let end = new Date(schedule.calendarEnd);
        for (const [, periods] of unifiedPeriodsMap) {
            for (const p of periods) {
                if (p.endDate > end) {
                    end = addMonths(p.endDate, 1);
                    end.setDate(0);
                }
            }
        }
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
            result.push({ year: current.getFullYear(), month: current.getMonth() });
            current.setMonth(current.getMonth() + 1);
        }
        return result;
    }, [schedule, unifiedPeriodsMap]);

    /**
     * In optimized mode the parent who takes flexible leave first should appear
     * first in the summary cards and legend, regardless of their array index.
     */
    const displayOrder = useMemo<number[]>(() => {
        if (data.leaveMode !== 'optimized' || data.parentCount < 2) {
            return schedule.parents.map((_, i) => i);
        }
        const first = data.firstParent ?? 0;
        const second = first === 0 ? 1 : 0;
        return [first, second];
    }, [data.leaveMode, data.parentCount, data.firstParent, schedule.parents]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleDueDateChange = (date: Date | null) => {
        if (!date) return;
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        const iso = formatDateKey(normalized);
        if (iso === data.dueDate) return;
        onUpdateData({ ...data, dueDate: iso });
    };

    const handleUnifiedDragStart = (parentIndex: number, key: string) => {
        setDraggingKey({ parentIndex, key });
    };

    const handleUnifiedDragOver = (e: React.DragEvent, parentIndex: number, key: string) => {
        if (!draggingKey || draggingKey.parentIndex !== parentIndex) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverKey?.key !== key || dragOverKey?.parentIndex !== parentIndex) {
            setDragOverKey({ parentIndex, key });
        }
    };

    const handleUnifiedDrop = (e: React.DragEvent, parentIndex: number, targetKey: string) => {
        e.preventDefault();
        if (!draggingKey || draggingKey.parentIndex !== parentIndex) {
            setDraggingKey(null);
            setDragOverKey(null);
            return;
        }
        const sourceKey = draggingKey.key;
        if (sourceKey !== targetKey) {
            const nonMandatory = schedule.parents[parentIndex]?.periods.filter(
                (p) => p.type !== LEAVE_TYPES.MANDATORY,
            ) ?? [];
            const extraItems = data.extraPeriods?.[parentIndex] ?? [];
            const currentOrder = getEffectiveOrder(nonMandatory, extraItems, data.periodOrder?.[parentIndex]);
            const srcIdx = currentOrder.indexOf(sourceKey);
            const tgtIdx = currentOrder.indexOf(targetKey);
            if (srcIdx >= 0 && tgtIdx >= 0) {
                const newOrder = [...currentOrder];
                const [removed] = newOrder.splice(srcIdx, 1);
                newOrder.splice(tgtIdx, 0, removed);
                const newPeriodOrder = data.periodOrder ? data.periodOrder.map((a) => [...a]) : [];
                while (newPeriodOrder.length <= parentIndex) newPeriodOrder.push([]);
                newPeriodOrder[parentIndex] = newOrder;
                // Clear custom start-dates for this parent — they're positionally invalid after reorder
                const newCustomStartDates: CustomStartDates = { ...customStartDates };
                delete newCustomStartDates[parentIndex];
                onUpdateData({ ...data, periodOrder: newPeriodOrder, customStartDates: newCustomStartDates });
            }
        }
        setDraggingKey(null);
        setDragOverKey(null);
    };

    const handleUnifiedDragEnd = () => {
        setDraggingKey(null);
        setDragOverKey(null);
    };

    const startEditing = (parentIndex: number, periodType: LeaveType, period: LeavePeriod) => {
        setEditingPeriod({ parentIndex, periodType });
        const custom = getNormalizedCustom(
            customDurations[parentIndex] as CustomDurationsForParent | undefined,
            periodType,
        );

        if (periodType === LEAVE_TYPES.LACTANCIA) {
            if (custom) {
                setEditValue(String(custom.value));
                setEditUnit(custom.unit);
            } else {
                setEditValue(String(period.days ?? 0));
                setEditUnit('days');
            }
        } else if (periodType === LEAVE_TYPES.CUIDADO) {
            if (custom) {
                setEditValue(
                    custom.unit === 'weeks'
                        ? String(custom.value)
                        : String(Math.round(custom.value / 7)),
                );
            } else {
                const durationWeeks = Math.round(
                    (period.endDate.getTime() - period.startDate.getTime()) /
                        (7 * 24 * 3600 * 1000),
                );
                setEditValue(String(durationWeeks));
            }
            setEditUnit('weeks');
        } else {
            if (custom) {
                setEditValue(
                    custom.unit === 'weeks'
                        ? String(custom.value)
                        : String(Math.round(custom.value / 7)),
                );
            } else {
                setEditValue(String(Math.round(DEFAULT_DURATIONS[periodType] / 7)));
            }
            setEditUnit('weeks');
        }

        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const commitEdit = () => {
        if (!editingPeriod) return;
        const { parentIndex, periodType } = editingPeriod;
        const rawVal = parseFloat(editValue);
        // Lactancia accepts fractional days; all other types are whole weeks/days
        const val =
            periodType === LEAVE_TYPES.LACTANCIA ? rawVal : Math.round(rawVal);

        if (!isNaN(val) && val > 0) {
            const newCustom: CustomDurationsForParent = {
                ...(customDurations[parentIndex] ?? {}),
            };
            const isDefault =
                periodType !== LEAVE_TYPES.LACTANCIA &&
                val === Math.round(DEFAULT_DURATIONS[periodType] / 7);

            if (isDefault) {
                delete newCustom[periodType];
            } else {
                const duration: CustomDuration = { value: val, unit: editUnit };
                newCustom[periodType] = duration;
            }

            const newCustomDurations: CustomDurations = { ...customDurations };
            if (Object.keys(newCustom).length === 0) {
                delete newCustomDurations[parentIndex];
            } else {
                newCustomDurations[parentIndex] = newCustom;
            }

            onUpdateData({ ...data, customDurations: newCustomDurations });
        }
        setEditingPeriod(null);
    };

    const cancelEdit = () => setEditingPeriod(null);

    const resetParentCustom = (parentIndex: number) => {
        const newCustomDurations: CustomDurations = { ...customDurations };
        delete newCustomDurations[parentIndex];
        const newCustomStartDates: CustomStartDates = { ...customStartDates };
        delete newCustomStartDates[parentIndex];
        const newExtraPeriods = (data.extraPeriods ?? []).map((arr, i) =>
            i === parentIndex ? [] : arr,
        );
        const newPeriodOrder = (data.periodOrder ?? []).map((arr, i) =>
            i === parentIndex ? [] : arr,
        );
        onUpdateData({
            ...data,
            customDurations: newCustomDurations,
            customStartDates: newCustomStartDates,
            extraPeriods: newExtraPeriods,
            periodOrder: newPeriodOrder,
        });
    };

    const hasCustom = (parentIndex: number): boolean =>
        Boolean(customDurations[parentIndex] && Object.keys(customDurations[parentIndex]).length > 0) ||
        Boolean(customStartDates[parentIndex] && Object.keys(customStartDates[parentIndex]).length > 0) ||
        Boolean(data.extraPeriods?.[parentIndex]?.length) ||
        Boolean(data.periodOrder?.[parentIndex]?.length);

    const handleAddExtra = (parentIndex: number) => {
        const preset = EXTRA_PRESETS.find((p) => p.key === newPresetKey);
        const name =
            newPresetKey === 'custom'
                ? newCustomName.trim() || 'Custom period'
                : newPresetKey === 'flexible-extra'
                  ? '📅 Flexible Leave'
                  : preset?.label ?? newPresetKey;

        const newItem: ExtraLeaveItem = {
            id: generateExtraId(),
            name,
            durationValue: Math.max(1, newDurationValue),
            durationUnit: newDurationUnit,
            presetKey: newPresetKey,
        };

        const current = data.extraPeriods ? data.extraPeriods.map((arr) => [...arr]) : [];
        while (current.length <= parentIndex) current.push([]);
        current[parentIndex] = [...current[parentIndex], newItem];

        onUpdateData({ ...data, extraPeriods: current });
        setAddingForParent(null);
        setNewPresetKey('vacation');
        setNewCustomName('');
        setNewDurationValue(2);
        setNewDurationUnit('weeks');
    };

    const handleDeleteExtra = (parentIndex: number, itemId: string) => {
        const current = data.extraPeriods ? data.extraPeriods.map((arr) => [...arr]) : [];
        if (!current[parentIndex]) return;
        current[parentIndex] = current[parentIndex].filter((item) => item.id !== itemId);
        onUpdateData({ ...data, extraPeriods: current });
    };

    const commitExtraStartDate = (parentIndex: number, itemId: string, date: Date) => {
        const isoDate = formatDateKey(date);
        const current = data.extraPeriods ? data.extraPeriods.map((arr) => [...arr]) : [];
        if (!current[parentIndex]) return;
        // Compute the cascade cursor at the time this extra item would start (without custom date)
        // If the chosen date equals the auto-cascade start, clear the custom date (reset to auto)
        const autoStart = unifiedPeriodsMap
            .get(parentIndex)
            ?.find((p) => p.isExtra && p.extraItem?.id === itemId)?.startDate;
        const autoIso = autoStart ? formatDateKey(autoStart) : null;
        current[parentIndex] = current[parentIndex].map((item) =>
            item.id === itemId
                ? { ...item, startDate: isoDate === autoIso ? undefined : isoDate }
                : item,
        );
        onUpdateData({ ...data, extraPeriods: current });
        setEditingExtraDate(null);
        setEditExtraDateValue(null);
        setMinEditExtraDate(null);
    };

    const cancelExtraDateEdit = () => {
        setEditingExtraDate(null);
        setEditExtraDateValue(null);
        setMinEditExtraDate(null);
    };


    const periodHasCustom = (parentIndex: number, periodType: LeaveType): boolean => {
        const c = (customDurations[parentIndex] as CustomDurationsForParent | undefined)?.[periodType];
        return c !== undefined && c !== null;
    };

    const periodHasCustomStart = (parentIndex: number, periodType: LeaveType): boolean =>
        Boolean(customStartDates[parentIndex]?.[periodType]);

    const commitStartDate = (newDate: Date) => {
        if (!editingStartDate) return;
        const { parentIndex, periodType } = editingStartDate;

        const newCustomStartDates: CustomStartDates = { ...customStartDates };
        if (!newCustomStartDates[parentIndex]) newCustomStartDates[parentIndex] = {};

        const isoDate = formatDateKey(newDate);
        // Compare against the base (uncustomised) schedule to know if this is a reset
        const basePeriod = baseSchedule.parents[parentIndex]?.periods.find(
            (p) => p.type === periodType,
        );
        const baseIso = basePeriod ? formatDateKey(basePeriod.startDate) : null;

        if (isoDate === baseIso) {
            delete newCustomStartDates[parentIndex][periodType];
        } else {
            newCustomStartDates[parentIndex][periodType] = isoDate;
        }

        if (Object.keys(newCustomStartDates[parentIndex]).length === 0) {
            delete newCustomStartDates[parentIndex];
        }

        onUpdateData({ ...data, customStartDates: newCustomStartDates });
        setEditingStartDate(null);
        setEditStartDateValue(null);
        setMinEditStartDate(null);
    };

    const cancelEditDate = () => {
        setEditingStartDate(null);
        setEditStartDateValue(null);
        setMinEditStartDate(null);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <div className="header-left">
                    <h1>🗓️ Leave Schedule</h1>
                    <p className="header-subtitle">
                        Due date:{' '}
                        <DatePicker
                            selected={new Date(data.dueDate)}
                            onChange={handleDueDateChange}
                            dateFormat="dd/MM/yyyy"
                            locale="es"
                            calendarClassName="dp-dark"
                            showMonthDropdown
                            showYearDropdown
                            dropdownMode="select"
                            popperPlacement="bottom-start"
                            customInput={
                                <strong
                                    className="header-due-date"
                                    title="Click to change due date"
                                >
                                    {formatDisplayDate(new Date(data.dueDate))}
                                </strong>
                            }
                        />
                        {data.parentCount === 2 && (
                            <>
                                {' '}
                                · Mode:{' '}
                                <strong>
                                    {data.leaveMode === 'together' ? 'Together' : 'Optimized'}
                                </strong>
                            </>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-edit" onClick={onEdit}>
                        ✏️ Edit
                    </button>
                    <button className="btn btn-secondary" onClick={onReset} title="Start over">
                        ↺ Reset
                    </button>
                </div>
            </div>

            <div className="summary-cards">
                {displayOrder.map((realIdx: number) => {
                    const parent: ParentSchedule = schedule.parents[realIdx];
                    const index = realIdx;
                    const activeColor = activeColors[realIdx];
                    return (
                        <div
                            key={parent.name}
                            className="summary-card"
                            style={{ borderColor: activeColor.accent }}
                        >
                            <div
                                className="summary-card-header"
                                style={{ background: activeColor.gradient }}
                            >
                                <span className="summary-card-name">{parent.name}</span>
                                {hasCustom(index) && (
                                    <button
                                        className="btn-reset-custom"
                                        onClick={() => resetParentCustom(index)}
                                        title="Reset to standard leave days"
                                    >
                                        ↺ Reset
                                    </button>
                                )}
                            </div>

                            <div className="summary-card-body">
                                {/* Mandatory period — always first, non-editable */}
                                {(() => {
                                    const mp = parent.periods.find(
                                        (p) => p.type === LEAVE_TYPES.MANDATORY,
                                    );
                                    if (!mp) return null;
                                    return (
                                        <div
                                            key="mandatory"
                                            className="summary-period period-row-readonly"
                                        >
                                            <div className="period-drag-handle period-drag-handle--hidden">
                                                ⠿
                                            </div>
                                            <div
                                                className="period-dot"
                                                style={{ backgroundColor: activeColor.mandatory }}
                                            />
                                            <div className="period-info">
                                                <span className="period-type">
                                                    {formatLeaveType(
                                                        LEAVE_TYPES.MANDATORY,
                                                        null,
                                                        customDurations[index] as
                                                            | CustomDurationsForParent
                                                            | undefined,
                                                    )}
                                                    <span
                                                        className="period-mandatory-badge"
                                                        title="This leave is mandatory under Spanish law and cannot be modified"
                                                    >
                                                        🔒 Required by law
                                                    </span>
                                                </span>
                                                <span className="period-dates">
                                                    {formatDisplayDate(mp.startDate)} →{' '}
                                                    {formatDisplayDate(mp.endDate)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* All non-mandatory periods in unified (user-defined) order */}
                                {(unifiedPeriodsMap.get(index) ?? []).map((uPeriod) => {
                                    const isDraggingThis =
                                        draggingKey?.parentIndex === index &&
                                        draggingKey?.key === uPeriod.key;
                                    const isDragOverThis =
                                        dragOverKey?.parentIndex === index &&
                                        dragOverKey?.key === uPeriod.key &&
                                        draggingKey?.key !== uPeriod.key;

                                    if (uPeriod.isExtra) {
                                        const isEditingExtraDateThis =
                                            editingExtraDate?.parentIndex === index &&
                                            editingExtraDate?.itemId === uPeriod.extraItem!.id;
                                        const hasCustomExtraStart = Boolean(
                                            uPeriod.extraItem!.startDate,
                                        );
                                        return (
                                            <div
                                                key={uPeriod.key}
                                                className={[
                                                    'summary-period extra-period-row',
                                                    isDraggingThis ? 'period-dragging' : '',
                                                    isDragOverThis ? 'period-dragover' : '',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                                onDragOver={(e) =>
                                                    handleUnifiedDragOver(e, index, uPeriod.key)
                                                }
                                                onDrop={(e) =>
                                                    handleUnifiedDrop(e, index, uPeriod.key)
                                                }
                                            >
                                                <div
                                                    className={`period-drag-handle ${isEditingExtraDateThis ? 'period-drag-handle--hidden' : ''}`}
                                                    draggable={
                                                        !isEditingExtraDateThis ? true : undefined
                                                    }
                                                    onDragStart={
                                                        !isEditingExtraDateThis
                                                            ? (e) => {
                                                                  e.dataTransfer.effectAllowed =
                                                                      'move';
                                                                  handleUnifiedDragStart(
                                                                      index,
                                                                      uPeriod.key,
                                                                  );
                                                              }
                                                            : undefined
                                                    }
                                                    onDragEnd={
                                                        !isEditingExtraDateThis
                                                            ? handleUnifiedDragEnd
                                                            : undefined
                                                    }
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={
                                                        !isEditingExtraDateThis
                                                            ? 'Drag to reorder'
                                                            : undefined
                                                    }
                                                >
                                                    ⠿
                                                </div>
                                                <div
                                                    className="period-dot"
                                                    style={{ backgroundColor: activeColor.extra }}
                                                />
                                                <div className="period-info">
                                                    <span className="period-type extra-period-name">
                                                        {uPeriod.extraItem!.name}
                                                        <span className="extra-period-badge">
                                                            {uPeriod.extraItem!.durationValue}
                                                            {uPeriod.extraItem!.durationUnit ===
                                                            'weeks'
                                                                ? 'w'
                                                                : 'd'}
                                                        </span>
                                                    </span>
                                                    {isEditingExtraDateThis ? (
                                                        <div
                                                            className="period-date-picker-row"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <DatePicker
                                                                selected={editExtraDateValue}
                                                                onChange={(date: Date | null) => {
                                                                    if (date)
                                                                        commitExtraStartDate(
                                                                            index,
                                                                            uPeriod.extraItem!.id,
                                                                            date,
                                                                        );
                                                                }}
                                                                onClickOutside={cancelExtraDateEdit}
                                                                open
                                                                minDate={
                                                                    minEditExtraDate ?? undefined
                                                                }
                                                                dateFormat="dd/MM/yyyy"
                                                                locale="es"
                                                                calendarClassName="dp-dark"
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                popperPlacement="bottom-start"
                                                                portalId="dp-start-date-portal"
                                                                customInput={
                                                                    <input
                                                                        className="period-edit-input period-edit-input--date"
                                                                        readOnly
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Escape')
                                                                                cancelExtraDateEdit();
                                                                        }}
                                                                    />
                                                                }
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="period-dates period-dates-editable"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const allUnified =
                                                                    unifiedPeriodsMap.get(index) ??
                                                                    [];
                                                                const thisIdx =
                                                                    allUnified.findIndex(
                                                                        (p) =>
                                                                            p.key === uPeriod.key,
                                                                    );
                                                                const prev =
                                                                    thisIdx > 0
                                                                        ? allUnified[thisIdx - 1]
                                                                        : null;
                                                                const minDate = prev
                                                                    ? new Date(prev.endDate)
                                                                    : new Date(data.dueDate);
                                                                minDate.setHours(0, 0, 0, 0);
                                                                setEditingExtraDate({
                                                                    parentIndex: index,
                                                                    itemId: uPeriod.extraItem!.id,
                                                                });
                                                                setEditExtraDateValue(
                                                                    new Date(uPeriod.startDate),
                                                                );
                                                                setMinEditExtraDate(minDate);
                                                            }}
                                                        >
                                                            {formatDisplayDate(uPeriod.startDate)}{' '}
                                                            →{' '}
                                                            {formatDisplayDate(uPeriod.endDate)}
                                                            <span
                                                                className="period-date-edit-icon"
                                                                title="Click to edit start date"
                                                            >
                                                                ✎
                                                            </span>
                                                            {hasCustomExtraStart && (
                                                                <span className="period-custom-badge">
                                                                    shifted
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    className="btn-delete-extra"
                                                    title="Remove"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteExtra(
                                                            index,
                                                            uPeriod.extraItem!.id,
                                                        );
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    }

                                    // ── Regular non-mandatory period ──────────────────
                                    const periodType = uPeriod.leaveType!;
                                    const isEditing =
                                        editingPeriod?.parentIndex === index &&
                                        editingPeriod?.periodType === periodType;
                                    const isCustom = periodHasCustom(index, periodType);
                                    const isLactancia = periodType === LEAVE_TYPES.LACTANCIA;
                                    const isEditingThisDate =
                                        editingStartDate?.parentIndex === index &&
                                        editingStartDate?.periodType === periodType;
                                    const hasCustomStart = periodHasCustomStart(
                                        index,
                                        periodType,
                                    );
                                    const isEditingEither = isEditing || isEditingThisDate;

                                    return (
                                        <div
                                            key={uPeriod.key}
                                            className={[
                                                'summary-period period-row-editable',
                                                isDraggingThis ? 'period-dragging' : '',
                                                isDragOverThis ? 'period-dragover' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            onDragOver={(e) =>
                                                handleUnifiedDragOver(e, index, uPeriod.key)
                                            }
                                            onDrop={(e) =>
                                                handleUnifiedDrop(e, index, uPeriod.key)
                                            }
                                            onClick={() => {
                                                if (!isEditing && !draggingKey) {
                                                    const lp = schedule.parents[index]?.periods.find(
                                                        (p) => p.type === periodType,
                                                    );
                                                    if (lp) startEditing(index, periodType, lp);
                                                }
                                            }}
                                        >
                                            <div
                                                className={`period-drag-handle ${isEditingEither ? 'period-drag-handle--hidden' : ''}`}
                                                draggable={!isEditingEither ? true : undefined}
                                                onDragStart={
                                                    !isEditingEither
                                                        ? (e) => {
                                                              e.dataTransfer.effectAllowed = 'move';
                                                              handleUnifiedDragStart(
                                                                  index,
                                                                  uPeriod.key,
                                                              );
                                                          }
                                                        : undefined
                                                }
                                                onDragEnd={
                                                    !isEditingEither
                                                        ? handleUnifiedDragEnd
                                                        : undefined
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                                title={
                                                    !isEditingEither ? 'Drag to reorder' : undefined
                                                }
                                            >
                                                ⠿
                                            </div>

                                            <div
                                                className="period-dot"
                                                style={{ backgroundColor: activeColor[periodType] }}
                                            />
                                            <div className="period-info">
                                                {isEditing ? (
                                                    <div
                                                        className="period-edit-row"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onBlur={(e) => {
                                                            if (
                                                                !e.currentTarget.contains(
                                                                    e.relatedTarget,
                                                                )
                                                            ) {
                                                                commitEdit();
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            ref={inputRef}
                                                            type="number"
                                                            min="1"
                                                            max="999"
                                                            step={1}
                                                            className="period-edit-input"
                                                            value={editValue}
                                                            onChange={(e) =>
                                                                setEditValue(e.target.value)
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') commitEdit();
                                                                if (e.key === 'Escape') cancelEdit();
                                                            }}
                                                        />
                                                        {isLactancia ? (
                                                            <select
                                                                className="period-edit-unit-select"
                                                                value={editUnit}
                                                                onChange={(e) =>
                                                                    setEditUnit(
                                                                        e.target.value as EditUnit,
                                                                    )
                                                                }
                                                                onMouseDown={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <option value="days">days</option>
                                                                <option value="weeks">weeks</option>
                                                                <option value="months">months</option>
                                                            </select>
                                                        ) : (
                                                            <span className="period-edit-unit">
                                                                weeks
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="period-type">
                                                        {formatLeaveType(
                                                            periodType,
                                                            uPeriod.lactanciaDays,
                                                            customDurations[index] as
                                                                | CustomDurationsForParent
                                                                | undefined,
                                                        )}
                                                        <span
                                                            className="period-edit-icon"
                                                            title="Click to edit"
                                                        >
                                                            ✎
                                                        </span>
                                                        {isCustom && (
                                                            <span className="period-custom-badge">
                                                                custom
                                                            </span>
                                                        )}
                                                    </span>
                                                )}

                                                {isEditingThisDate ? (
                                                    <div
                                                        className="period-date-picker-row"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <DatePicker
                                                            selected={editStartDateValue}
                                                            onChange={(date: Date | null) => {
                                                                if (date) commitStartDate(date);
                                                            }}
                                                            onClickOutside={cancelEditDate}
                                                            open
                                                            minDate={minEditStartDate ?? undefined}
                                                            dateFormat="dd/MM/yyyy"
                                                            locale="es"
                                                            calendarClassName="dp-dark"
                                                            showMonthDropdown
                                                            showYearDropdown
                                                            dropdownMode="select"
                                                            popperPlacement="bottom-start"
                                                            portalId="dp-start-date-portal"
                                                            customInput={
                                                                <input
                                                                    className="period-edit-input period-edit-input--date"
                                                                    readOnly
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Escape')
                                                                            cancelEditDate();
                                                                    }}
                                                                />
                                                            }
                                                        />
                                                    </div>
                                                ) : (
                                                    <span
                                                        className="period-dates period-dates-editable"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const allUnified =
                                                                unifiedPeriodsMap.get(index) ?? [];
                                                            const thisIdx = allUnified.findIndex(
                                                                (p) => p.key === uPeriod.key,
                                                            );
                                                            const prev =
                                                                thisIdx > 0
                                                                    ? allUnified[thisIdx - 1]
                                                                    : null;
                                                            const minDate = prev
                                                                ? new Date(prev.endDate)
                                                                : new Date(data.dueDate);
                                                            minDate.setHours(0, 0, 0, 0);
                                                            setEditingPeriod(null);
                                                            setEditingStartDate({
                                                                parentIndex: index,
                                                                periodType,
                                                            });
                                                            setEditStartDateValue(
                                                                new Date(uPeriod.startDate),
                                                            );
                                                            setMinEditStartDate(minDate);
                                                        }}
                                                    >
                                                        {formatDisplayDate(uPeriod.startDate)} →{' '}
                                                        {formatDisplayDate(uPeriod.endDate)}
                                                        <span
                                                            className="period-date-edit-icon"
                                                            title="Click to edit start date"
                                                        >
                                                            ✎
                                                        </span>
                                                        {hasCustomStart && (
                                                            <span className="period-custom-badge">
                                                                shifted
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ── Add-extra form / button ───────────────────── */}
                                {addingForParent === index ? (
                                    <div
                                        className="add-extra-form"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <select
                                            className="add-extra-preset-select"
                                            value={newPresetKey}
                                            onChange={(e) => {
                                                const key = e.target.value;
                                                setNewPresetKey(key);
                                                if (key === 'flexible-extra') {
                                                    const remaining = getRemainingFlexWeeks(
                                                        index,
                                                        customDurations,
                                                        data.extraPeriods,
                                                    );
                                                    setNewDurationValue(Math.max(1, remaining));
                                                    setNewDurationUnit('weeks');
                                                } else {
                                                    const preset = EXTRA_PRESETS.find(
                                                        (p) => p.key === key,
                                                    );
                                                    if (preset) {
                                                        setNewDurationValue(preset.defaultValue);
                                                        setNewDurationUnit(preset.defaultUnit);
                                                    }
                                                }
                                            }}
                                        >
                                            {EXTRA_PRESETS.map((p) => (
                                                <option key={p.key} value={p.key}>
                                                    {p.label}
                                                </option>
                                            ))}
                                            {(() => {
                                                const remaining = getRemainingFlexWeeks(
                                                    index,
                                                    customDurations,
                                                    data.extraPeriods,
                                                );
                                                if (remaining <= 0) return null;
                                                return (
                                                    <option value="flexible-extra">
                                                        📅 Flexible Leave ({remaining}w remaining)
                                                    </option>
                                                );
                                            })()}
                                        </select>
                                        {newPresetKey === 'custom' && (
                                            <input
                                                className="add-extra-name-input"
                                                type="text"
                                                value={newCustomName}
                                                onChange={(e) => setNewCustomName(e.target.value)}
                                                placeholder="Period name…"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter')
                                                        handleAddExtra(index);
                                                    if (e.key === 'Escape')
                                                        setAddingForParent(null);
                                                }}
                                            />
                                        )}
                                        <div className="add-extra-duration-row">
                                            {(() => {
                                                const isFlexExtra =
                                                    newPresetKey === 'flexible-extra';
                                                const maxWeeks = isFlexExtra
                                                    ? getRemainingFlexWeeks(
                                                          index,
                                                          customDurations,
                                                          data.extraPeriods,
                                                      )
                                                    : undefined;
                                                return (
                                                    <>
                                                        <input
                                                            className="period-edit-input add-extra-weeks-input"
                                                            type="number"
                                                            min="1"
                                                            max={maxWeeks}
                                                            step="1"
                                                            value={newDurationValue}
                                                            onChange={(e) => {
                                                                const raw =
                                                                    parseInt(e.target.value) || 1;
                                                                setNewDurationValue(
                                                                    maxWeeks !== undefined
                                                                        ? Math.min(
                                                                              Math.max(1, raw),
                                                                              maxWeeks,
                                                                          )
                                                                        : Math.max(1, raw),
                                                                );
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter')
                                                                    handleAddExtra(index);
                                                                if (e.key === 'Escape')
                                                                    setAddingForParent(null);
                                                            }}
                                                        />
                                                        <select
                                                            className="add-extra-unit-select"
                                                            value={newDurationUnit}
                                                            disabled={isFlexExtra}
                                                            onChange={(e) =>
                                                                setNewDurationUnit(
                                                                    e.target.value as
                                                                        | 'days'
                                                                        | 'weeks',
                                                                )
                                                            }
                                                        >
                                                            {!isFlexExtra && (
                                                                <option value="days">days</option>
                                                            )}
                                                            <option value="weeks">weeks</option>
                                                        </select>
                                                    </>
                                                );
                                            })()}
                                            <button
                                                className="add-extra-confirm"
                                                title="Add"
                                                onClick={() => handleAddExtra(index)}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                className="add-extra-cancel"
                                                title="Cancel"
                                                onClick={() => setAddingForParent(null)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="btn-add-extra"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAddingForParent(index);
                                            setNewPresetKey('vacation');
                                            setNewDurationValue(2);
                                            setNewDurationUnit('weeks');
                                            setNewCustomName('');
                                        }}
                                    >
                                        + Add period
                                    </button>
                                )}

                                <div className="return-date">
                                    <span className="return-label">🏢 Work timeline</span>
                                    <div className="return-value">
                                        {(() => {
                                            const mandatory = parent.periods.find(
                                                (p) => p.type === LEAVE_TYPES.MANDATORY,
                                            );
                                            const allLeave = [
                                                ...(mandatory
                                                    ? [{ start: new Date(mandatory.startDate), end: new Date(mandatory.endDate) }]
                                                    : []),
                                                ...(unifiedPeriodsMap.get(index) ?? []).map((uP) => ({
                                                    start: new Date(uP.startDate),
                                                    end: new Date(uP.endDate),
                                                })),
                                            ].sort(
                                                (a, b) => a.start.getTime() - b.start.getTime(),
                                            );

                                            if (allLeave.length === 0) {
                                                return (
                                                    <ul className="work-timeline-list">
                                                        <li className="work-timeline-item">
                                                            <div className="work-timeline-dot" />
                                                            <div className="work-timeline-content">
                                                                <div className="work-timeline-row">
                                                                    <span className="work-timeline-label">
                                                                        Returns to work on
                                                                    </span>
                                                                    <span className="work-timeline-date">
                                                                        {formatDisplayDate(parent.returnDate)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                );
                                            }

                                            const merged: { start: Date; end: Date }[] = [];
                                            let currentBlock = { ...allLeave[0] };

                                            for (let i = 1; i < allLeave.length; i++) {
                                                const next = allLeave[i];
                                                if (next.start <= currentBlock.end) {
                                                    if (next.end > currentBlock.end) {
                                                        currentBlock.end = new Date(next.end);
                                                    }
                                                } else {
                                                    merged.push(currentBlock);
                                                    currentBlock = { ...next };
                                                }
                                            }
                                            merged.push(currentBlock);

                                            return (
                                                <ul className="work-timeline-list">
                                                    {merged.map((block, i) => (
                                                        <li
                                                            key={`${block.start.getTime()}-${block.end.getTime()}`}
                                                            className="work-timeline-item"
                                                        >
                                                            <div className="work-timeline-dot" />
                                                            <div className="work-timeline-content">
                                                                <div className="work-timeline-row">
                                                                    <span className="work-timeline-label">
                                                                        Stops working
                                                                    </span>
                                                                    <span className="work-timeline-date">
                                                                        {formatDisplayDate(block.start)}
                                                                    </span>
                                                                </div>
                                                                <div className="work-timeline-row">
                                                                    <span className="work-timeline-label">
                                                                        Returns to work
                                                                        {i === merged.length - 1
                                                                            ? ' (final)'
                                                                            : ''}
                                                                    </span>
                                                                    <span className="work-timeline-date">
                                                                        {formatDisplayDate(block.end)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="calendar-legend">
                <div className="legend-title">Legend</div>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-color birthday-legend">👶</div>
                        <span>Birth date</span>
                    </div>
                    {displayOrder.map((realIdx: number) => {
                        const parent: ParentSchedule = schedule.parents[realIdx];
                        const activeColor = activeColors[realIdx];
                        return (
                            <React.Fragment key={parent.name}>
                                <div className="legend-item">
                                    <div
                                        className="legend-color"
                                        style={{ backgroundColor: activeColor.mandatory }}
                                    />
                                    <span>{parent.name} — Mandatory</span>
                                </div>
                                <div className="legend-item">
                                    <div
                                        className="legend-color"
                                        style={{ backgroundColor: activeColor.flexible }}
                                    />
                                    <span>{parent.name} — Flexible</span>
                                </div>
                                {(unifiedPeriodsMap.get(realIdx) ?? []).some(
                                    (p) => !p.isExtra && p.leaveType === LEAVE_TYPES.LACTANCIA,
                                ) && (
                                    <div className="legend-item">
                                        <div
                                            className="legend-color"
                                            style={{ backgroundColor: activeColor.lactancia }}
                                        />
                                        <span>{parent.name} — Lactancia</span>
                                    </div>
                                )}
                                {(unifiedPeriodsMap.get(realIdx) ?? []).some(
                                    (p) => !p.isExtra && p.leaveType === LEAVE_TYPES.CUIDADO,
                                ) && (
                                    <div className="legend-item">
                                        <div
                                            className="legend-color"
                                            style={{ backgroundColor: activeColor.cuidado }}
                                        />
                                        <span>{parent.name} — Childcare</span>
                                    </div>
                                )}
                                {(data.extraPeriods?.[realIdx]?.length ?? 0) > 0 && (
                                    <div className="legend-item">
                                        <div
                                            className="legend-color"
                                            style={{ backgroundColor: activeColor.extra }}
                                        />
                                        <span>{parent.name} — Extra periods</span>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Calendar grid */}
            <div className="months-container">
                {months.map(({ year, month }) => (
                    <MonthGrid
                        key={`${year}-${month}`}
                        year={year}
                        month={month}
                        dateMap={dateMap}
                        birthDateKey={birthDateKey}
                        parentColors={activeColors}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLeaveType(
    type: LeaveType,
    lactanciaDays: number | null,
    customDurationsForParent: CustomDurationsForParent | undefined,
): string {
    const custom = getNormalizedCustom(customDurationsForParent, type);

    switch (type) {
        case LEAVE_TYPES.MANDATORY: {
            if (custom) {
                return custom.unit === 'weeks'
                    ? `Mandatory Leave (${custom.value} weeks)`
                    : `Mandatory Leave (${Math.round(custom.value / 7)} weeks)`;
            }
            return `Mandatory Leave (${Math.round(DEFAULT_DURATIONS.mandatory / 7)} weeks)`;
        }
        case LEAVE_TYPES.FLEXIBLE: {
            if (custom) {
                return custom.unit === 'weeks'
                    ? `Flexible Leave (${custom.value} weeks)`
                    : `Flexible Leave (${Math.round(custom.value / 7)} weeks)`;
            }
            return `Flexible Leave (${Math.round(DEFAULT_DURATIONS.flexible / 7)} weeks)`;
        }
        case LEAVE_TYPES.LACTANCIA: {
            if (custom) return `Accumulated Lactancia (${custom.value} ${custom.unit})`;
            return `Accumulated Lactancia (${lactanciaDays} days)`;
        }
        case LEAVE_TYPES.CUIDADO: {
            const totalWeeks = custom
                ? custom.unit === 'weeks'
                    ? custom.value
                    : Math.round(custom.value / 7)
                : lactanciaDays
                  ? Math.round(lactanciaDays / 7)
                  : 0;
            if (totalWeeks <= 0) return 'Childcare Leave';
            const paidWeeks = Math.min(totalWeeks, CUIDADO_PAID_WEEKS);
            const unpaidWeeks = totalWeeks - paidWeeks;
            return unpaidWeeks > 0
                ? `Childcare Leave (${paidWeeks}w paid + ${unpaidWeeks}w unpaid)`
                : `Childcare Leave (${paidWeeks} week${paidWeeks !== 1 ? 's' : ''} paid)`;
        }
        case LEAVE_TYPES.EXTRA:
            return 'Extra period';
        default:
            return type;
    }
}

