import React from 'react';
import { LEAVE_TYPES } from '../../constants';
import type {
    ColorPalette,
    ComputedParentSchedule,
    ComputedPeriod,
    EditUnit,
} from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { usePeriodEdit } from '../../hooks/usePeriodEdit';
import type { useDragSort } from '../../hooks/useDragSort';
import type { useStartDateEdit } from '../../hooks/useStartDateEdit';
import type { useExtraPeriods } from '../../hooks/useExtraPeriods';
import { parseLocalDate, getPeriodKey } from '../../utils/calendarHelpers';
import MandatoryPeriodRow from './MandatoryPeriodRow';
import PeriodRow from './PeriodRow';
import ExtraPeriodRow from './ExtraPeriodRow';
import AddExtraForm from './AddExtraForm';
import WorkTimeline from './WorkTimeline';

interface Props {
    parentIndex: number;
    parent: ComputedParentSchedule;
    activeColor: ColorPalette;
    isHidden: boolean;
    lang: string;
    t: TranslationKeys;
    onToggleVisibility: (idx: number) => void;
    onResetCustom: (idx: number) => void;
    // Period edit
    editingPeriod: ReturnType<typeof usePeriodEdit>['editingPeriod'];
    editValue: string;
    editUnit: EditUnit;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onStartEditing: (parentIndex: number, period: ComputedPeriod) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onEditValueChange: (v: string) => void;
    onEditUnitChange: (u: EditUnit) => void;
    // Drag
    draggingKey: ReturnType<typeof useDragSort>['draggingKey'];
    dragOverKey: ReturnType<typeof useDragSort>['dragOverKey'];
    onDragStart: (parentIndex: number, key: string) => void;
    onDragOver: (e: React.DragEvent, parentIndex: number, key: string) => void;
    onDrop: (e: React.DragEvent, parentIndex: number, targetKey: string) => void;
    onDragEnd: () => void;
    // Start date edit
    editingStartDate: ReturnType<typeof useStartDateEdit>['editingStartDate'];
    editStartDateValue: Date | null;
    minEditStartDate: Date | null;
    onOpenStartDateEdit: (
        parentIndex: number,
        periodKey: string,
        currentDate: Date,
        minDate: Date,
    ) => void;
    onCommitStartDate: (date: Date) => void;
    onCancelEditDate: () => void;
    // Extra periods
    addingForParent: ReturnType<typeof useExtraPeriods>['addingForParent'];
    newPresetKey: string;
    newCustomName: string;
    newDurationValue: number;
    newDurationUnit: 'days' | 'weeks';
    onOpenAddForm: (parentIndex: number) => void;
    onPresetChange: (key: string, parentSchedule: ComputedParentSchedule) => void;
    onCustomNameChange: (v: string) => void;
    onDurationValueChange: (v: number) => void;
    onDurationUnitChange: (u: 'days' | 'weeks') => void;
    onConfirmAddExtra: (parentIndex: number) => void;
    onCancelAddForm: () => void;
    editingExtraDate: ReturnType<typeof useExtraPeriods>['editingExtraDate'];
    editExtraDateValue: Date | null;
    minEditExtraDate: Date | null;
    onOpenExtraDateEdit: (
        parentIndex: number,
        itemId: string,
        currentDate: Date,
        minDate: Date,
    ) => void;
    onCommitExtraStartDate: (date: Date) => void;
    onCancelExtraDateEdit: () => void;
    onDeleteExtra: (parentIndex: number, extraId: string) => void;
}

export default function SummaryCard({
    parentIndex,
    parent,
    activeColor,
    isHidden,
    lang,
    t,
    onToggleVisibility,
    onResetCustom,
    editingPeriod,
    editValue,
    editUnit,
    inputRef,
    onStartEditing,
    onCommitEdit,
    onCancelEdit,
    onEditValueChange,
    onEditUnitChange,
    draggingKey,
    dragOverKey,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    editingStartDate,
    editStartDateValue,
    minEditStartDate,
    onOpenStartDateEdit,
    onCommitStartDate,
    onCancelEditDate,
    addingForParent,
    newPresetKey,
    newCustomName,
    newDurationValue,
    newDurationUnit,
    onOpenAddForm,
    onPresetChange,
    onCustomNameChange,
    onDurationValueChange,
    onDurationUnitChange,
    onConfirmAddExtra,
    onCancelAddForm,
    editingExtraDate,
    editExtraDateValue,
    minEditExtraDate,
    onOpenExtraDateEdit,
    onCommitExtraStartDate,
    onCancelExtraDateEdit,
    onDeleteExtra,
}: Props) {
    const mandatoryPeriod = parent.periods.find(
        (p) => p.type === LEAVE_TYPES.MANDATORY,
    );
    const nonMandatoryPeriods = parent.periods.filter(
        (p) => p.type !== LEAVE_TYPES.MANDATORY,
    );

    /** Minimum start date for a non-mandatory period at `idx` in `nonMandatoryPeriods`. */
    const getMinStartDate = (idx: number): Date => {
        if (idx > 0) {
            return parseLocalDate(nonMandatoryPeriods[idx - 1].endDate);
        }
        if (mandatoryPeriod) {
            return parseLocalDate(mandatoryPeriod.endDate);
        }
        return new Date();
    };

    return (
        <div
            className="summary-card"
            style={{ borderColor: activeColor.accent }}
        >
            <div
                className="summary-card-header"
                style={{ background: activeColor.gradient }}
            >
                <span className="summary-card-name">{parent.name}</span>
                <button
                    className="btn-reset-custom"
                    onClick={() => onResetCustom(parentIndex)}
                    title={t.resetCustomTooltip}
                >
                    {t.btnResetCustom}
                </button>
                <button
                    className="btn-toggle-parent"
                    onClick={() => onToggleVisibility(parentIndex)}
                    title={isHidden ? t.showParent : t.hideParent}
                >
                    {isHidden ? '🙈' : '👁'}
                </button>
            </div>

            <div
                className={`summary-card-body${isHidden ? ' summary-card-body--hidden' : ''}`}
            >
                {mandatoryPeriod && (
                    <MandatoryPeriodRow
                        period={mandatoryPeriod}
                        activeColor={activeColor}
                        t={t}
                    />
                )}

                {nonMandatoryPeriods.map((p, idx) => {
                    const pKey = getPeriodKey(p);
                    if (p.isExtra) {
                        return (
                            <ExtraPeriodRow
                                key={pKey}
                                period={p}
                                parentIndex={parentIndex}
                                activeColor={activeColor}
                                t={t}
                                allPeriods={nonMandatoryPeriods}
                                draggingKey={draggingKey}
                                dragOverKey={dragOverKey}
                                onDragStart={onDragStart}
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                                onDragEnd={onDragEnd}
                                editingExtraDate={editingExtraDate}
                                editExtraDateValue={editExtraDateValue}
                                minEditExtraDate={minEditExtraDate}
                                onOpenExtraDateEdit={(pIdx, itemId, currentDate) => {
                                    const minDate = getMinStartDate(idx);
                                    onOpenExtraDateEdit(pIdx, itemId, currentDate, minDate);
                                }}
                                onCommitExtraStartDate={onCommitExtraStartDate}
                                onCancelExtraDateEdit={onCancelExtraDateEdit}
                                onDelete={onDeleteExtra}
                            />
                        );
                    }
                    return (
                        <PeriodRow
                            key={pKey}
                            period={p}
                            parentIndex={parentIndex}
                            activeColor={activeColor}
                            lang={lang}
                            t={t}
                            allPeriods={nonMandatoryPeriods}
                            editingPeriod={editingPeriod}
                            editValue={editValue}
                            editUnit={editUnit}
                            inputRef={inputRef}
                            onStartEditing={onStartEditing}
                            onCommitEdit={onCommitEdit}
                            onCancelEdit={onCancelEdit}
                            onEditValueChange={onEditValueChange}
                            onEditUnitChange={onEditUnitChange}
                            editingStartDate={editingStartDate}
                            editStartDateValue={editStartDateValue}
                            minEditStartDate={minEditStartDate}
                            onOpenStartDateEdit={(pIdx, periodKey, currentDate) => {
                                const minDate = getMinStartDate(idx);
                                onOpenStartDateEdit(pIdx, periodKey, currentDate, minDate);
                            }}
                            onCommitStartDate={onCommitStartDate}
                            onCancelEditDate={onCancelEditDate}
                            draggingKey={draggingKey}
                            dragOverKey={dragOverKey}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onDragEnd={onDragEnd}
                        />
                    );
                })}

                {addingForParent === parentIndex ? (
                    <AddExtraForm
                        parentIndex={parentIndex}
                        parentSchedule={parent}
                        lang={lang}
                        t={t}
                        newPresetKey={newPresetKey}
                        newCustomName={newCustomName}
                        newDurationValue={newDurationValue}
                        newDurationUnit={newDurationUnit}
                        onPresetChange={onPresetChange}
                        onCustomNameChange={onCustomNameChange}
                        onDurationValueChange={onDurationValueChange}
                        onDurationUnitChange={onDurationUnitChange}
                        onConfirm={onConfirmAddExtra}
                        onCancel={onCancelAddForm}
                    />
                ) : (
                    <button
                        className="btn-add-extra"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenAddForm(parentIndex);
                        }}
                    >
                        {t.btnAddPeriod}
                    </button>
                )}

                <WorkTimeline periods={parent.periods} t={t} />
            </div>
        </div>
    );
}
