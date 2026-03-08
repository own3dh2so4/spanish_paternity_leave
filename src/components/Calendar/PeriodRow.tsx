import React from 'react';
import DatePicker from 'react-datepicker';
import { LEAVE_TYPES } from '../../constants';
import type { ColorPalette, ComputedPeriod, EditUnit } from '../../types';
import { formatLeaveType, parseLocalDate, getPeriodKey } from '../../utils/calendarHelpers';
import { formatDisplayDate } from '../../utils/leaveCalculator';
import type { TranslationKeys } from '../../i18n/en';
import type { usePeriodEdit } from '../../hooks/usePeriodEdit';
import type { useDragSort } from '../../hooks/useDragSort';
import type { useStartDateEdit } from '../../hooks/useStartDateEdit';

interface Props {
    period: ComputedPeriod;
    parentIndex: number;
    activeColor: ColorPalette;
    lang: string;
    t: TranslationKeys;
    allPeriods: ComputedPeriod[];
    // Period edit (duration)
    editingPeriod: ReturnType<typeof usePeriodEdit>['editingPeriod'];
    editValue: string;
    editUnit: EditUnit;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onStartEditing: (parentIndex: number, period: ComputedPeriod) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onEditValueChange: (v: string) => void;
    onEditUnitChange: (u: EditUnit) => void;
    // Start-date edit
    editingStartDate: ReturnType<typeof useStartDateEdit>['editingStartDate'];
    editStartDateValue: Date | null;
    minEditStartDate: Date | null;
    onOpenStartDateEdit: (
        parentIndex: number,
        periodKey: string,
        currentDate: Date,
    ) => void;
    onCommitStartDate: (date: Date) => void;
    onCancelEditDate: () => void;
    // Drag
    draggingKey: ReturnType<typeof useDragSort>['draggingKey'];
    dragOverKey: ReturnType<typeof useDragSort>['dragOverKey'];
    onDragStart: (parentIndex: number, key: string) => void;
    onDragOver: (e: React.DragEvent, parentIndex: number, key: string) => void;
    onDrop: (e: React.DragEvent, parentIndex: number, targetKey: string) => void;
    onDragEnd: () => void;
}

export default function PeriodRow({
    period,
    parentIndex,
    activeColor,
    lang,
    t,
    editingPeriod,
    editValue,
    editUnit,
    inputRef,
    onStartEditing,
    onCommitEdit,
    onCancelEdit,
    onEditValueChange,
    onEditUnitChange,
    editingStartDate,
    editStartDateValue,
    minEditStartDate,
    onOpenStartDateEdit,
    onCommitStartDate,
    onCancelEditDate,
    draggingKey,
    dragOverKey,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: Props) {
    const periodKey = getPeriodKey(period);
    const periodType = period.type;
    const isLactancia = periodType === LEAVE_TYPES.LACTANCIA;

    const isEditing =
        editingPeriod?.parentIndex === parentIndex &&
        editingPeriod?.periodKey === periodKey;
    const isEditingThisDate =
        editingStartDate?.parentIndex === parentIndex &&
        editingStartDate?.periodKey === periodKey;
    const isEditingEither = isEditing || isEditingThisDate;

    const isDraggingThis =
        draggingKey?.parentIndex === parentIndex && draggingKey?.key === periodKey;
    const isDragOverThis =
        dragOverKey?.parentIndex === parentIndex &&
        dragOverKey?.key === periodKey &&
        draggingKey?.key !== periodKey;

    return (
        <div
            className={[
                'summary-period period-row-editable',
                isDraggingThis ? 'period-dragging' : '',
                isDragOverThis ? 'period-dragover' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            onDragOver={(e) => onDragOver(e, parentIndex, periodKey)}
            onDrop={(e) => onDrop(e, parentIndex, periodKey)}
            onClick={() => {
                if (!isEditing && !draggingKey) {
                    onStartEditing(parentIndex, period);
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
                              onDragStart(parentIndex, periodKey);
                          }
                        : undefined
                }
                onDragEnd={!isEditingEither ? onDragEnd : undefined}
                onClick={(e) => e.stopPropagation()}
                title={!isEditingEither ? t.dragToReorder : undefined}
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
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                onCommitEdit();
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
                            onChange={(e) => onEditValueChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onCommitEdit();
                                if (e.key === 'Escape') onCancelEdit();
                            }}
                        />
                        {isLactancia ? (
                            <select
                                className="period-edit-unit-select"
                                value={editUnit}
                                onChange={(e) =>
                                    onEditUnitChange(e.target.value as EditUnit)
                                }
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <option value="days">
                                    {lang === 'es' ? 'días' : 'days'}
                                </option>
                                <option value="weeks">
                                    {lang === 'es' ? 'sem.' : 'weeks'}
                                </option>
                                <option value="months">
                                    {lang === 'es' ? 'meses' : 'months'}
                                </option>
                            </select>
                        ) : (
                            <span className="period-edit-unit">
                                {lang === 'es' ? 'sem.' : 'weeks'}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="period-type">
                        {formatLeaveType(period, t)}
                        <span className="period-edit-icon" title={t.clickToEdit}>
                            ✎
                        </span>
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
                                if (date) onCommitStartDate(date);
                            }}
                            onClickOutside={onCancelEditDate}
                            open
                            minDate={minEditStartDate ?? undefined}
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
                                        if (e.key === 'Escape') onCancelEditDate();
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
                            onCancelEdit();
                            onOpenStartDateEdit(
                                parentIndex,
                                periodKey,
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
        </div>
    );
}
