import { useRef, useState } from 'react';
import { LEAVE_TYPES } from '../constants';
import type {
    ComputedParentSchedule,
    ComputedPeriod,
    EditUnit,
    ExtraPresetKey,
    WizardData,
} from '../types';
import {
    EXTRA_PRESETS,
    addExtraPeriod,
    generateExtraId,
    getPeriodKey,
    movePeriod,
    periodCalendarWeeks,
    removeExtraPeriod,
    reorderPeriods,
    resizePeriod,
    shiftPeriodStart,
} from '../utils/calendarHelpers';
import { daysBetween, formatDateKey, parseLocalDate } from '../utils/dates';
import { getRemainingFlexWeeks } from '../utils/leaveLaw';

export interface PeriodRef {
    parentIndex: number;
    periodKey: string;
}

export interface ExtraForm {
    presetKey: ExtraPresetKey;
    customName: string;
    durationValue: number;
    durationUnit: 'days' | 'weeks';
}

export interface ScheduleEditor {
    editingPeriod: PeriodRef | null;
    editValue: string;
    editUnit: EditUnit;
    inputRef: React.RefObject<HTMLInputElement | null>;
    startEditing: (parentIndex: number, period: ComputedPeriod) => void;
    setEditValue: (v: string) => void;
    setEditUnit: (u: EditUnit) => void;
    commitEdit: () => void;
    cancelEdit: () => void;

    editingStartDate: PeriodRef | null;
    editStartDateValue: Date | null;
    minEditStartDate: Date | null;
    openStartDateEdit: (parentIndex: number, periodKey: string, current: Date, min: Date) => void;
    commitStartDate: (date: Date) => void;
    cancelStartDate: () => void;

    draggingKey: PeriodRef | null;
    dragOverKey: PeriodRef | null;
    onDragStart: (parentIndex: number, key: string) => void;
    onDragOver: (e: React.DragEvent, parentIndex: number, key: string) => void;
    onDrop: (e: React.DragEvent, parentIndex: number, key: string) => void;
    onDragEnd: () => void;
    move: (parentIndex: number, key: string, direction: -1 | 1) => void;

    addingForParent: number | null;
    form: ExtraForm;
    openAddForm: (parentIndex: number) => void;
    closeAddForm: () => void;
    setPreset: (key: ExtraPresetKey, parent: ComputedParentSchedule) => void;
    setCustomName: (v: string) => void;
    setDurationValue: (v: number) => void;
    setDurationUnit: (u: 'days' | 'weeks') => void;
    confirmAdd: (parentIndex: number) => void;
    removeExtra: (parentIndex: number, extraId: string) => void;
}

const MAX_DURATION_VALUE = 999;

const DEFAULT_FORM: ExtraForm = {
    presetKey: 'vacation',
    customName: '',
    durationValue: 2,
    durationUnit: 'weeks',
};

export function useScheduleEditor(
    data: WizardData,
    onUpdateData: (data: WizardData) => void,
): ScheduleEditor {
    const schedule = data.schedule;
    const firstParent = data.firstParent;
    const optimized = data.leaveMode === 'optimized' && data.parentCount === 2;
    const apply = (next: ComputedParentSchedule[]) => onUpdateData({ ...data, schedule: next });

    const [editingPeriod, setEditingPeriod] = useState<PeriodRef | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editUnit, setEditUnit] = useState<EditUnit>('weeks');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [editingStartDate, setEditingStartDate] = useState<PeriodRef | null>(null);
    const [editStartDateValue, setEditStartDateValue] = useState<Date | null>(null);
    const [minEditStartDate, setMinEditStartDate] = useState<Date | null>(null);

    const [draggingKey, setDraggingKey] = useState<PeriodRef | null>(null);
    const [dragOverKey, setDragOverKey] = useState<PeriodRef | null>(null);

    const [addingForParent, setAddingForParent] = useState<number | null>(null);
    const [form, setForm] = useState<ExtraForm>(DEFAULT_FORM);

    const startEditing = (parentIndex: number, period: ComputedPeriod) => {
        setEditingStartDate(null);
        setEditingPeriod({ parentIndex, periodKey: getPeriodKey(period) });
        if (
            period.type === LEAVE_TYPES.CONVENIO ||
            (period.type === LEAVE_TYPES.LACTANCIA && period.days === null)
        ) {
            setEditValue(
                String(
                    daysBetween(parseLocalDate(period.startDate), parseLocalDate(period.endDate)),
                ),
            );
            setEditUnit('days');
        } else if (period.type === LEAVE_TYPES.LACTANCIA) {
            if (period.durationValue !== undefined && period.durationUnit !== undefined) {
                setEditValue(String(period.durationValue));
                setEditUnit(period.durationUnit);
            } else {
                const days =
                    period.days ??
                    daysBetween(parseLocalDate(period.startDate), parseLocalDate(period.endDate));
                setEditValue(String(days));
                setEditUnit('days');
            }
        } else {
            setEditValue(String(periodCalendarWeeks(period)));
            setEditUnit('weeks');
        }
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const commitEdit = () => {
        if (!editingPeriod) return;
        const value = Math.round(Number(editValue));
        if (Number.isFinite(value) && value > 0) {
            const clamped = Math.min(value, MAX_DURATION_VALUE);
            apply(
                resizePeriod(
                    schedule,
                    editingPeriod.parentIndex,
                    editingPeriod.periodKey,
                    clamped,
                    editUnit,
                    firstParent,
                    optimized,
                ),
            );
        }
        setEditingPeriod(null);
    };

    const openStartDateEdit = (
        parentIndex: number,
        periodKey: string,
        current: Date,
        min: Date,
    ) => {
        setEditingPeriod(null);
        setEditingStartDate({ parentIndex, periodKey });
        setEditStartDateValue(current);
        setMinEditStartDate(min);
    };

    const cancelStartDate = () => {
        setEditingStartDate(null);
        setEditStartDateValue(null);
        setMinEditStartDate(null);
    };

    const commitStartDate = (date: Date) => {
        if (!editingStartDate) return;
        const min = minEditStartDate;
        const effective = min && date < min ? min : date;
        apply(
            shiftPeriodStart(
                schedule,
                editingStartDate.parentIndex,
                editingStartDate.periodKey,
                formatDateKey(effective),
                firstParent,
                optimized,
            ),
        );
        cancelStartDate();
    };

    const onDragOver = (e: React.DragEvent, parentIndex: number, key: string) => {
        if (!draggingKey || draggingKey.parentIndex !== parentIndex) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverKey?.periodKey !== key || dragOverKey.parentIndex !== parentIndex) {
            setDragOverKey({ parentIndex, periodKey: key });
        }
    };

    const onDrop = (e: React.DragEvent, parentIndex: number, key: string) => {
        e.preventDefault();
        if (
            draggingKey &&
            draggingKey.parentIndex === parentIndex &&
            draggingKey.periodKey !== key
        ) {
            apply(
                reorderPeriods(
                    schedule,
                    parentIndex,
                    draggingKey.periodKey,
                    key,
                    firstParent,
                    optimized,
                ),
            );
        }
        setDraggingKey(null);
        setDragOverKey(null);
    };

    const openAddForm = (parentIndex: number) => {
        setAddingForParent(parentIndex);
        setForm(DEFAULT_FORM);
    };

    const setPreset = (key: ExtraPresetKey, parent: ComputedParentSchedule) => {
        if (key === 'flexible-extra') {
            setForm({
                presetKey: key,
                customName: '',
                durationValue: Math.max(1, getRemainingFlexWeeks(parent)),
                durationUnit: 'weeks',
            });
            return;
        }
        const preset = EXTRA_PRESETS.find((p) => p.key === key);
        setForm({
            presetKey: key,
            customName: '',
            durationValue: preset?.defaultValue ?? 1,
            durationUnit: preset?.defaultUnit ?? 'weeks',
        });
    };

    const confirmAdd = (parentIndex: number) => {
        const parent = schedule[parentIndex];
        if (!parent) return;
        let value = Math.min(MAX_DURATION_VALUE, Math.max(1, Math.round(form.durationValue)));
        if (form.presetKey === 'flexible-extra') {
            const remaining = getRemainingFlexWeeks(parent);
            if (remaining <= 0) return;
            value = Math.min(value, remaining);
        }
        apply(
            addExtraPeriod(
                schedule,
                parentIndex,
                {
                    id: generateExtraId(),
                    presetKey: form.presetKey,
                    customName:
                        form.presetKey === 'custom'
                            ? form.customName.trim() || undefined
                            : undefined,
                    durationValue: value,
                    durationUnit: form.presetKey === 'flexible-extra' ? 'weeks' : form.durationUnit,
                },
                firstParent,
                optimized,
            ),
        );
        setAddingForParent(null);
        setForm(DEFAULT_FORM);
    };

    return {
        editingPeriod,
        editValue,
        editUnit,
        inputRef,
        startEditing,
        setEditValue,
        setEditUnit,
        commitEdit,
        cancelEdit: () => setEditingPeriod(null),

        editingStartDate,
        editStartDateValue,
        minEditStartDate,
        openStartDateEdit,
        commitStartDate,
        cancelStartDate,

        draggingKey,
        dragOverKey,
        onDragStart: (parentIndex, key) => setDraggingKey({ parentIndex, periodKey: key }),
        onDragOver,
        onDrop,
        onDragEnd: () => {
            setDraggingKey(null);
            setDragOverKey(null);
        },
        move: (parentIndex, key, direction) =>
            apply(movePeriod(schedule, parentIndex, key, direction, firstParent, optimized)),

        addingForParent,
        form,
        openAddForm,
        closeAddForm: () => setAddingForParent(null),
        setPreset,
        setCustomName: (v) => setForm((f) => ({ ...f, customName: v })),
        setDurationValue: (v) => setForm((f) => ({ ...f, durationValue: v })),
        setDurationUnit: (u) => setForm((f) => ({ ...f, durationUnit: u })),
        confirmAdd,
        removeExtra: (parentIndex, extraId) =>
            apply(removeExtraPeriod(schedule, parentIndex, extraId, firstParent, optimized)),
    };
}
