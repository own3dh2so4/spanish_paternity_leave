import { useState } from 'react';
import { formatDateKey } from '../utils/leaveCalculator';

interface EditingStartDate {
    parentIndex: number;
    periodKey: string;
}

interface UseStartDateEditReturn {
    editingStartDate: EditingStartDate | null;
    editStartDateValue: Date | null;
    minEditStartDate: Date | null;
    openStartDateEdit: (
        parentIndex: number,
        periodKey: string,
        currentDate: Date,
        minDate: Date,
    ) => void;
    commitStartDate: (
        newDate: Date,
        onCommit: (parentIdx: number, periodKey: string, iso: string) => void,
    ) => void;
    cancelEditDate: () => void;
    setEditStartDateValue: React.Dispatch<React.SetStateAction<Date | null>>;
}

export function useStartDateEdit(): UseStartDateEditReturn {
    const [editingStartDate, setEditingStartDate] =
        useState<EditingStartDate | null>(null);
    const [editStartDateValue, setEditStartDateValue] = useState<Date | null>(null);
    const [minEditStartDate, setMinEditStartDate] = useState<Date | null>(null);

    const openStartDateEdit = (
        parentIndex: number,
        periodKey: string,
        currentDate: Date,
        minDate: Date,
    ) => {
        setEditingStartDate({ parentIndex, periodKey });
        setEditStartDateValue(currentDate);
        setMinEditStartDate(minDate);
    };

    const commitStartDate = (
        newDate: Date,
        onCommit: (parentIdx: number, periodKey: string, iso: string) => void,
    ) => {
        if (!editingStartDate) return;
        const { parentIndex, periodKey } = editingStartDate;
        const iso = formatDateKey(newDate);
        onCommit(parentIndex, periodKey, iso);
        setEditingStartDate(null);
        setEditStartDateValue(null);
        setMinEditStartDate(null);
    };

    const cancelEditDate = () => {
        setEditingStartDate(null);
        setEditStartDateValue(null);
        setMinEditStartDate(null);
    };

    return {
        editingStartDate,
        editStartDateValue,
        minEditStartDate,
        openStartDateEdit,
        commitStartDate,
        cancelEditDate,
        setEditStartDateValue,
    };
}
