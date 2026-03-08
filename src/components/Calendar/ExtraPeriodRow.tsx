import React from 'react';
import DatePicker from 'react-datepicker';
import type { ColorPalette, ComputedPeriod } from '../../types';
import { formatDisplayDate } from '../../utils/leaveCalculator';
import { parseLocalDate, getPeriodKey } from '../../utils/calendarHelpers';
import type { TranslationKeys } from '../../i18n/en';
import type { useDragSort } from '../../hooks/useDragSort';
import type { useExtraPeriods } from '../../hooks/useExtraPeriods';

interface Props {
    period: ComputedPeriod;
    parentIndex: number;
    activeColor: ColorPalette;
    t: TranslationKeys;
    allPeriods: ComputedPeriod[];
    // Drag
    draggingKey: ReturnType<typeof useDragSort>['draggingKey'];
    dragOverKey: ReturnType<typeof useDragSort>['dragOverKey'];
    onDragStart: (parentIndex: number, key: string) => void;
    onDragOver: (e: React.DragEvent, parentIndex: number, key: string) => void;
    onDrop: (e: React.DragEvent, parentIndex: number, targetKey: string) => void;
    onDragEnd: () => void;
    // Extra date edit
    editingExtraDate: ReturnType<typeof useExtraPeriods>['editingExtraDate'];
    editExtraDateValue: Date | null;
    minEditExtraDate: Date | null;
    onOpenExtraDateEdit: (
        parentIndex: number,
        itemId: string,
        currentDate: Date,
    ) => void;
    onCommitExtraStartDate: (date: Date) => void;
    onCancelExtraDateEdit: () => void;
    // Delete
    onDelete: (parentIndex: number, extraId: string) => void;
}

export default function ExtraPeriodRow({
    period,
    parentIndex,
    activeColor,
    t,
    draggingKey,
    dragOverKey,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    editingExtraDate,
    editExtraDateValue,
    minEditExtraDate,
    onOpenExtraDateEdit,
    onCommitExtraStartDate,
    onCancelExtraDateEdit,
    onDelete,
}: Props) {
    const periodKey = getPeriodKey(period);
    const extraId = period.extraId!;

    const isDraggingThis =
        draggingKey?.parentIndex === parentIndex && draggingKey?.key === periodKey;
    const isDragOverThis =
        dragOverKey?.parentIndex === parentIndex &&
        dragOverKey?.key === periodKey &&
        draggingKey?.key !== periodKey;

    const isEditingExtraDateThis =
        editingExtraDate?.parentIndex === parentIndex &&
        editingExtraDate?.itemId === extraId;

    return (
        <div
            className={[
                'summary-period extra-period-row',
                isDraggingThis ? 'period-dragging' : '',
                isDragOverThis ? 'period-dragover' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            onDragOver={(e) => onDragOver(e, parentIndex, periodKey)}
            onDrop={(e) => onDrop(e, parentIndex, periodKey)}
        >
            <div
                className={`period-drag-handle ${isEditingExtraDateThis ? 'period-drag-handle--hidden' : ''}`}
                draggable={!isEditingExtraDateThis ? true : undefined}
                onDragStart={
                    !isEditingExtraDateThis
                        ? (e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              onDragStart(parentIndex, periodKey);
                          }
                        : undefined
                }
                onDragEnd={!isEditingExtraDateThis ? onDragEnd : undefined}
                onClick={(e) => e.stopPropagation()}
                title={!isEditingExtraDateThis ? t.dragToReorder : undefined}
            >
                ⠿
            </div>
            <div
                className="period-dot"
                style={{ backgroundColor: activeColor.extra }}
            />
            <div className="period-info">
                <span className="period-type extra-period-name">
                    {period.extraName}
                    <span className="extra-period-badge">
                        {period.durationValue}
                        {period.durationUnit === 'weeks' ? 'w' : 'd'}
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
                                if (date) onCommitExtraStartDate(date);
                            }}
                            onClickOutside={onCancelExtraDateEdit}
                            open
                            minDate={minEditExtraDate ?? undefined}
                            dateFormat="dd/MM/yyyy"
                            locale={t.datePickerLocale}
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
                                        if (e.key === 'Escape') onCancelExtraDateEdit();
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
                            onOpenExtraDateEdit(
                                parentIndex,
                                extraId,
                                parseLocalDate(period.startDate),
                            );
                        }}
                    >
                        {formatDisplayDate(parseLocalDate(period.startDate))} →{' '}
                        {formatDisplayDate(parseLocalDate(period.endDate))}
                        <span
                            className="period-date-edit-icon"
                            title={t.clickToEditStartDate}
                        >
                            ✎
                        </span>
                    </span>
                )}
            </div>
            <button
                className="btn-delete-extra"
                title={t.remove}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(parentIndex, extraId);
                }}
            >
                ✕
            </button>
        </div>
    );
}
