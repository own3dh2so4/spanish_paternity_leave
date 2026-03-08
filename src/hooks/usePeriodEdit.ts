import { useRef, useState } from 'react';
import { LEAVE_TYPES } from '../constants';
import type { ComputedPeriod, EditUnit, LeaveType } from '../types';
import { daysBetween, parseLocalDate } from '../utils/calendarHelpers';

interface EditingPeriod {
    parentIndex: number;
    periodKey: string;
    periodType: LeaveType;
}

interface UsePeriodEditReturn {
    editingPeriod: EditingPeriod | null;
    editValue: string;
    editUnit: EditUnit;
    inputRef: React.RefObject<HTMLInputElement | null>;
    startEditing: (parentIndex: number, period: ComputedPeriod) => void;
    commitEdit: (
        onCommit: (parentIdx: number, periodKey: string, value: number, unit: 'days' | 'weeks') => void,
    ) => void;
    cancelEdit: () => void;
    setEditValue: React.Dispatch<React.SetStateAction<string>>;
    setEditUnit: React.Dispatch<React.SetStateAction<EditUnit>>;
}

export function usePeriodEdit(): UsePeriodEditReturn {
    const [editingPeriod, setEditingPeriod] = useState<EditingPeriod | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editUnit, setEditUnit] = useState<EditUnit>('weeks');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const startEditing = (parentIndex: number, period: ComputedPeriod) => {
        const periodType = period.type as LeaveType;
        const periodKey = period.isExtra ? (period.extraId ?? period.type) : period.type;
        setEditingPeriod({ parentIndex, periodKey, periodType });

        if (periodType === LEAVE_TYPES.LACTANCIA) {
            // Use working-day count if available, otherwise compute from calendar duration
            const days = period.days ?? daysBetween(
                parseLocalDate(period.startDate),
                parseLocalDate(period.endDate),
            );
            setEditValue(String(days));
            setEditUnit('days');
        } else {
            const calDays = daysBetween(
                parseLocalDate(period.startDate),
                parseLocalDate(period.endDate),
            );
            setEditValue(String(Math.round(calDays / 7)));
            setEditUnit('weeks');
        }

        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const commitEdit = (
        onCommit: (parentIdx: number, periodKey: string, value: number, unit: 'days' | 'weeks') => void,
    ) => {
        if (!editingPeriod) return;
        const { parentIndex, periodKey, periodType } = editingPeriod;
        const rawVal = parseFloat(editValue);
        const val =
            periodType === LEAVE_TYPES.LACTANCIA ? rawVal : Math.round(rawVal);

        if (!isNaN(val) && val > 0) {
            const unit = (editUnit === 'months' ? 'weeks' : editUnit) as 'days' | 'weeks';
            const normalizedVal =
                editUnit === 'months' ? Math.round(val * 4.33) : val;
            onCommit(parentIndex, periodKey, normalizedVal, unit);
        }
        setEditingPeriod(null);
    };

    const cancelEdit = () => setEditingPeriod(null);

    return {
        editingPeriod,
        editValue,
        editUnit,
        inputRef,
        startEditing,
        commitEdit,
        cancelEdit,
        setEditValue,
        setEditUnit,
    };
}
