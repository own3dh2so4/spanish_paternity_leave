import { useState } from 'react';
import type { ComputedParentSchedule, ExtraLeaveItem } from '../types';
import {
    EXTRA_PRESETS,
    generateExtraId,
    getRemainingFlexWeeks,
} from '../utils/calendarHelpers';
import { formatDateKey } from '../utils/leaveCalculator';

interface UseExtraPeriodsReturn {
    addingForParent: number | null;
    newPresetKey: string;
    newCustomName: string;
    newDurationValue: number;
    newDurationUnit: 'days' | 'weeks';
    setAddingForParent: React.Dispatch<React.SetStateAction<number | null>>;
    setNewPresetKey: React.Dispatch<React.SetStateAction<string>>;
    setNewCustomName: React.Dispatch<React.SetStateAction<string>>;
    setNewDurationValue: React.Dispatch<React.SetStateAction<number>>;
    setNewDurationUnit: React.Dispatch<React.SetStateAction<'days' | 'weeks'>>;
    openAddForm: (parentIndex: number) => void;
    handlePresetChange: (
        key: string,
        parentSchedule: ComputedParentSchedule,
    ) => void;
    handleAddExtra: (
        parentIndex: number,
        onAdd: (parentIdx: number, item: ExtraLeaveItem) => void,
    ) => void;
    handleDeleteExtra: (
        parentIndex: number,
        extraId: string,
        onDelete: (parentIdx: number, extraId: string) => void,
    ) => void;
    editingExtraDate: { parentIndex: number; itemId: string } | null;
    editExtraDateValue: Date | null;
    minEditExtraDate: Date | null;
    openExtraDateEdit: (
        parentIndex: number,
        itemId: string,
        currentDate: Date,
        minDate: Date,
    ) => void;
    commitExtraStartDate: (
        parentIndex: number,
        itemId: string,
        date: Date,
        onCommit: (parentIdx: number, extraId: string, iso: string) => void,
    ) => void;
    cancelExtraDateEdit: () => void;
    setEditExtraDateValue: React.Dispatch<React.SetStateAction<Date | null>>;
}

export function useExtraPeriods(): UseExtraPeriodsReturn {
    const [addingForParent, setAddingForParent] = useState<number | null>(null);
    const [newPresetKey, setNewPresetKey] = useState<string>('vacation');
    const [newCustomName, setNewCustomName] = useState<string>('');
    const [newDurationValue, setNewDurationValue] = useState<number>(2);
    const [newDurationUnit, setNewDurationUnit] = useState<'days' | 'weeks'>('weeks');

    const [editingExtraDate, setEditingExtraDate] = useState<{
        parentIndex: number;
        itemId: string;
    } | null>(null);
    const [editExtraDateValue, setEditExtraDateValue] = useState<Date | null>(null);
    const [minEditExtraDate, setMinEditExtraDate] = useState<Date | null>(null);

    const openAddForm = (parentIndex: number) => {
        setAddingForParent(parentIndex);
        setNewPresetKey('vacation');
        setNewDurationValue(2);
        setNewDurationUnit('weeks');
        setNewCustomName('');
    };

    const handlePresetChange = (key: string, parentSchedule: ComputedParentSchedule) => {
        setNewPresetKey(key);
        if (key === 'flexible-extra') {
            const remaining = getRemainingFlexWeeks(parentSchedule);
            setNewDurationValue(Math.max(1, remaining));
            setNewDurationUnit('weeks');
        } else {
            const preset = EXTRA_PRESETS.find((p) => p.key === key);
            if (preset) {
                setNewDurationValue(preset.defaultValue);
                setNewDurationUnit(preset.defaultUnit);
            }
        }
    };

    const handleAddExtra = (
        parentIndex: number,
        onAdd: (parentIdx: number, item: ExtraLeaveItem) => void,
    ) => {
        const preset = EXTRA_PRESETS.find((p) => p.key === newPresetKey);
        const name =
            newPresetKey === 'custom'
                ? newCustomName.trim() || 'Custom period'
                : newPresetKey === 'flexible-extra'
                  ? '📅 Flexible Leave'
                  : (preset?.label ?? newPresetKey);

        const newItem: ExtraLeaveItem = {
            id: generateExtraId(),
            name,
            durationValue: Math.max(1, newDurationValue),
            durationUnit: newDurationUnit,
            presetKey: newPresetKey,
        };

        onAdd(parentIndex, newItem);
        setAddingForParent(null);
        setNewPresetKey('vacation');
        setNewCustomName('');
        setNewDurationValue(2);
        setNewDurationUnit('weeks');
    };

    const handleDeleteExtra = (
        parentIndex: number,
        extraId: string,
        onDelete: (parentIdx: number, extraId: string) => void,
    ) => {
        onDelete(parentIndex, extraId);
    };

    const openExtraDateEdit = (
        parentIndex: number,
        itemId: string,
        currentDate: Date,
        minDate: Date,
    ) => {
        setEditingExtraDate({ parentIndex, itemId });
        setEditExtraDateValue(currentDate);
        setMinEditExtraDate(minDate);
    };

    const commitExtraStartDate = (
        parentIndex: number,
        itemId: string,
        date: Date,
        onCommit: (parentIdx: number, extraId: string, iso: string) => void,
    ) => {
        const iso = formatDateKey(date);
        onCommit(parentIndex, itemId, iso);
        setEditingExtraDate(null);
        setEditExtraDateValue(null);
        setMinEditExtraDate(null);
    };

    const cancelExtraDateEdit = () => {
        setEditingExtraDate(null);
        setEditExtraDateValue(null);
        setMinEditExtraDate(null);
    };

    return {
        addingForParent,
        newPresetKey,
        newCustomName,
        newDurationValue,
        newDurationUnit,
        setAddingForParent,
        setNewPresetKey,
        setNewCustomName,
        setNewDurationValue,
        setNewDurationUnit,
        openAddForm,
        handlePresetChange,
        handleAddExtra,
        handleDeleteExtra,
        editingExtraDate,
        editExtraDateValue,
        minEditExtraDate,
        openExtraDateEdit,
        commitExtraStartDate,
        cancelExtraDateEdit,
        setEditExtraDateValue,
    };
}
