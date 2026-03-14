import React, { useMemo, useState } from 'react';
import { registerLocale } from 'react-datepicker';
import { enGB } from 'date-fns/locale';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import MonthGrid from './MonthGrid';
import CalendarHeader from './CalendarHeader';
import CalendarLegend from './CalendarLegend';
import SummaryCard from './SummaryCard';
import { formatDateKey } from '../../utils/leaveCalculator';
import {
    computeSchedule,
    parseLocalDate,
    resizePeriod,
    shiftPeriodStart,
    reorderPeriods,
    addExtraPeriod,
    removeExtraPeriod,
} from '../../utils/calendarHelpers';
import { COLOR_PALETTES } from '../../constants';
import type {
    ColorPalette,
    ComputedParentSchedule,
    DateMapEntry,
    WizardData,
} from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { compressWizardData } from '../../utils/shareUtils';
import { usePeriodEdit } from '../../hooks/usePeriodEdit';
import { useDragSort } from '../../hooks/useDragSort';
import { useStartDateEdit } from '../../hooks/useStartDateEdit';
import { useExtraPeriods } from '../../hooks/useExtraPeriods';
import './CalendarView.css';

registerLocale('en-GB', enGB);
registerLocale('es', es);

interface Props {
    data: WizardData;
    onEdit: () => void;
    onReset: () => void;
    onUpdateData: (data: WizardData) => void;
    initialHidden?: Set<number>;
}

export default function CalendarView({
    data,
    onEdit,
    onReset,
    onUpdateData,
    initialHidden,
}: Props) {
    const { t, lang, setLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    const [hiddenParents, setHiddenParents] = useState<Set<number>>(
        initialHidden || new Set(),
    );

    // ── Hooks ─────────────────────────────────────────────────────────────────

    const periodEdit = usePeriodEdit();
    const dragSort = useDragSort();
    const startDateEdit = useStartDateEdit();
    const extraPeriods = useExtraPeriods();

    // ── Effective schedule ─────────────────────────────────────────────────────
    // Falls back to computing from wizard inputs for backward compat (old localStorage data).

    const effectiveSchedule = useMemo<ComputedParentSchedule[]>(
        () => data.schedule ?? computeSchedule(data),
        [data],
    );

    const activeColors = useMemo<ColorPalette[]>(
        () => effectiveSchedule.map((p) => COLOR_PALETTES[p.colorId]),
        [effectiveSchedule],
    );

    // ── Derived rendering data ─────────────────────────────────────────────────

    const dateMap = useMemo(() => {
        const map: Record<string, DateMapEntry[]> = {};
        for (let i = 0; i < effectiveSchedule.length; i++) {
            if (hiddenParents.has(i)) continue;
            const parent = effectiveSchedule[i];
            for (const period of parent.periods) {
                const cur = parseLocalDate(period.startDate);
                const end = parseLocalDate(period.endDate);
                while (cur < end) {
                    const k = formatDateKey(cur);
                    if (!map[k]) map[k] = [];
                    map[k].push({
                        type: period.type,
                        parentIndex: i,
                        parentName: parent.name,
                        customName: period.isExtra ? period.extraName : undefined,
                    });
                    cur.setDate(cur.getDate() + 1);
                }
            }
        }
        return map;
    }, [effectiveSchedule, hiddenParents]);

    const months = useMemo(() => {
        const result: { year: number; month: number }[] = [];
        if (effectiveSchedule.length === 0) return result;

        let minDate = parseLocalDate(data.dueDate);
        let maxDate = parseLocalDate(data.dueDate);

        for (const parent of effectiveSchedule) {
            for (const period of parent.periods) {
                const start = parseLocalDate(period.startDate);
                const end = parseLocalDate(period.endDate);
                if (start < minDate) minDate = start;
                if (end > maxDate) maxDate = end;
            }
        }

        const startOfFirst = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const endOfLast = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
        const current = new Date(startOfFirst);
        while (current <= endOfLast) {
            result.push({ year: current.getFullYear(), month: current.getMonth() });
            current.setMonth(current.getMonth() + 1);
        }
        return result;
    }, [effectiveSchedule, data.dueDate]);

    const displayOrder = useMemo<number[]>(() => {
        if (data.leaveMode !== 'optimized' || data.parentCount < 2) {
            return effectiveSchedule.map((_, i) => i);
        }
        const first = data.firstParent ?? 0;
        const second = first === 0 ? 1 : 0;
        return [first, second];
    }, [data.leaveMode, data.parentCount, data.firstParent, effectiveSchedule]);

    // ── Visibility helpers ────────────────────────────────────────────────────

    const toggleParentVisibility = (idx: number) => {
        setHiddenParents((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    // ── Share & global handlers ───────────────────────────────────────────────

    const handleShare = async () => {
        try {
            const compressed = compressWizardData(data, hiddenParents);
            const url = new URL(window.location.href);
            url.searchParams.set('share', compressed);
            await navigator.clipboard.writeText(url.toString());
            alert(t.shareSuccess);
        } catch (e) {
            console.error('Failed to share', e);
            alert(t.shareError);
        }
    };

    const handleDueDateChange = (date: Date | null) => {
        if (!date) return;
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        const iso = formatDateKey(normalized);
        if (iso === data.dueDate) return;
        const newData = { ...data, dueDate: iso };
        newData.schedule = computeSchedule(newData);
        onUpdateData(newData);
    };

    const resetParentCustom = (parentIndex: number) => {
        const defaultSchedule = computeSchedule({ ...data, schedule: undefined });
        const newSchedule = effectiveSchedule.map((parent, i) =>
            i === parentIndex ? defaultSchedule[i] : parent,
        );
        onUpdateData({ ...data, schedule: newSchedule });
    };

    const birthDateKey = formatDateKey(parseLocalDate(data.dueDate));

    // ── Fully-wired edit callbacks ─────────────────────────────────────────────
    // All hook state is read here; components receive simple () => void closures.
    // Each edit function now handles cross-parent cascading internally via
    // cascadeAllFromEdit, so no separate wrapper is needed.

    const fp = data.firstParent ?? 0;

    const handleConfirmEdit = () => {
        periodEdit.commitEdit((parentIdx, periodKey, value, unit) => {
            const newSchedule = resizePeriod(effectiveSchedule, parentIdx, periodKey, value, unit, fp);
            onUpdateData({ ...data, schedule: newSchedule });
        });
    };

    const handleConfirmStartDate = (date: Date) => {
        startDateEdit.commitStartDate(date, (parentIdx, periodKey, iso) => {
            const newSchedule = shiftPeriodStart(effectiveSchedule, parentIdx, periodKey, iso, fp);
            onUpdateData({ ...data, schedule: newSchedule });
        });
    };

    const handleDrop = (e: React.DragEvent, parentIndex: number, targetKey: string) => {
        dragSort.handleUnifiedDrop(e, parentIndex, targetKey, (parentIdx, fromKey, toKey) => {
            const newSchedule = reorderPeriods(effectiveSchedule, parentIdx, fromKey, toKey, fp);
            onUpdateData({ ...data, schedule: newSchedule });
        });
    };

    const handleConfirmAddExtra = (parentIndex: number) => {
        extraPeriods.handleAddExtra(parentIndex, (pIdx, item) => {
            const newSchedule = addExtraPeriod(effectiveSchedule, pIdx, item, fp);
            onUpdateData({ ...data, schedule: newSchedule });
        });
    };

    const handleDeleteExtra = (parentIndex: number, extraId: string) => {
        extraPeriods.handleDeleteExtra(parentIndex, extraId, (pIdx, eid) => {
            const newSchedule = removeExtraPeriod(effectiveSchedule, pIdx, eid, fp);
            onUpdateData({ ...data, schedule: newSchedule });
        });
    };

    const handleConfirmExtraStartDate = (date: Date) => {
        const editing = extraPeriods.editingExtraDate;
        if (!editing) return;
        extraPeriods.commitExtraStartDate(editing.parentIndex, editing.itemId, date, (pIdx, extraId, iso) => {
            const newSchedule = shiftPeriodStart(effectiveSchedule, pIdx, extraId, iso, fp);
            onUpdateData({ ...data, schedule: newSchedule });
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="calendar-container">
            <CalendarHeader
                data={data}
                lang={lang}
                theme={theme}
                t={t}
                onEdit={onEdit}
                onReset={onReset}
                onShare={handleShare}
                onDueDateChange={handleDueDateChange}
                onToggleLang={() => setLang(lang === 'en' ? 'es' : 'en')}
                onToggleTheme={toggleTheme}
            />

            <div className="summary-cards">
                {displayOrder.map((realIdx) => (
                    <SummaryCard
                        key={effectiveSchedule[realIdx].name}
                        parentIndex={realIdx}
                        parent={effectiveSchedule[realIdx]}
                        activeColor={activeColors[realIdx]}
                        isHidden={hiddenParents.has(realIdx)}
                        lang={lang}
                        t={t}
                        onToggleVisibility={toggleParentVisibility}
                        onResetCustom={resetParentCustom}
                        // Period edit
                        editingPeriod={periodEdit.editingPeriod}
                        editValue={periodEdit.editValue}
                        editUnit={periodEdit.editUnit}
                        inputRef={periodEdit.inputRef}
                        onStartEditing={periodEdit.startEditing}
                        onCommitEdit={handleConfirmEdit}
                        onCancelEdit={periodEdit.cancelEdit}
                        onEditValueChange={periodEdit.setEditValue}
                        onEditUnitChange={periodEdit.setEditUnit}
                        // Drag
                        draggingKey={dragSort.draggingKey}
                        dragOverKey={dragSort.dragOverKey}
                        onDragStart={dragSort.handleUnifiedDragStart}
                        onDragOver={dragSort.handleUnifiedDragOver}
                        onDrop={handleDrop}
                        onDragEnd={dragSort.handleUnifiedDragEnd}
                        // Start date edit
                        editingStartDate={startDateEdit.editingStartDate}
                        editStartDateValue={startDateEdit.editStartDateValue}
                        minEditStartDate={startDateEdit.minEditStartDate}
                        onOpenStartDateEdit={startDateEdit.openStartDateEdit}
                        onCommitStartDate={handleConfirmStartDate}
                        onCancelEditDate={startDateEdit.cancelEditDate}
                        // Extra periods
                        addingForParent={extraPeriods.addingForParent}
                        newPresetKey={extraPeriods.newPresetKey}
                        newCustomName={extraPeriods.newCustomName}
                        newDurationValue={extraPeriods.newDurationValue}
                        newDurationUnit={extraPeriods.newDurationUnit}
                        onOpenAddForm={extraPeriods.openAddForm}
                        onPresetChange={extraPeriods.handlePresetChange}
                        onCustomNameChange={extraPeriods.setNewCustomName}
                        onDurationValueChange={extraPeriods.setNewDurationValue}
                        onDurationUnitChange={extraPeriods.setNewDurationUnit}
                        onConfirmAddExtra={handleConfirmAddExtra}
                        onCancelAddForm={() => extraPeriods.setAddingForParent(null)}
                        editingExtraDate={extraPeriods.editingExtraDate}
                        editExtraDateValue={extraPeriods.editExtraDateValue}
                        minEditExtraDate={extraPeriods.minEditExtraDate}
                        onOpenExtraDateEdit={extraPeriods.openExtraDateEdit}
                        onCommitExtraStartDate={handleConfirmExtraStartDate}
                        onCancelExtraDateEdit={extraPeriods.cancelExtraDateEdit}
                        onDeleteExtra={handleDeleteExtra}
                    />
                ))}
            </div>

            <CalendarLegend
                displayOrder={displayOrder}
                effectiveSchedule={effectiveSchedule}
                activeColors={activeColors}
                hiddenParents={hiddenParents}
                t={t}
            />

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
