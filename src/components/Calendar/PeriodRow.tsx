import DatePicker from 'react-datepicker';
import { LEAVE_TYPES, MAX_DURATION_VALUE } from '../../constants';
import type { ColorPalette, ComputedParentSchedule, ComputedPeriod, EditUnit } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';
import type { ScheduleEditor } from '../../hooks/useScheduleEditor';
import { formatLeaveType, getPeriodKey } from '../../utils/calendarHelpers';
import { formatDisplayDate, parseLocalDate } from '../../utils/dates';
import { getMaxWeeksFor, getPeriodWarning } from '../../utils/leaveLaw';

interface Props {
    period: ComputedPeriod;
    parent: ComputedParentSchedule;
    parentIndex: number;
    activeColor: ColorPalette;
    dueDate: string;
    lang: Language;
    t: TranslationKeys;
    editor: ScheduleEditor;
    canMoveEarlier: boolean;
    canMoveLater: boolean;
    minStartDate: Date;
}

export default function PeriodRow({
    period,
    parent,
    parentIndex,
    activeColor,
    dueDate,
    lang,
    t,
    editor,
    canMoveEarlier,
    canMoveLater,
    minStartDate,
}: Props) {
    const { inputRef, editValue, editUnit, editStartDateValue, cancelStartDate, minEditStartDate } =
        editor;

    const periodKey = getPeriodKey(period);
    const isLactancia = period.type === LEAVE_TYPES.LACTANCIA;
    const isNaturalLactancia = isLactancia && period.days === null;
    const isExtra = period.isExtra === true;
    const canEditDuration = !isExtra;

    const isEditing =
        editor.editingPeriod?.parentIndex === parentIndex &&
        editor.editingPeriod.periodKey === periodKey;
    const isEditingDate =
        editor.editingStartDate?.parentIndex === parentIndex &&
        editor.editingStartDate.periodKey === periodKey;
    const isBusy = isEditing || isEditingDate;

    const isDragging =
        editor.draggingKey?.parentIndex === parentIndex &&
        editor.draggingKey.periodKey === periodKey;
    const isDragOver =
        editor.dragOverKey?.parentIndex === parentIndex &&
        editor.dragOverKey.periodKey === periodKey &&
        !isDragging;

    const warning = getPeriodWarning(period, dueDate);
    const warningText =
        warning === 'afterFirstBirthday'
            ? t.warnAfterFirstBirthday
            : warning === 'afterEighthBirthday'
              ? t.warnAfterEighthBirthday
              : null;
    const maxWeeks = getMaxWeeksFor(parent, period);
    const label = formatLeaveType(period, t);

    const unitLabel = (u: EditUnit) =>
        u === 'days' ? t.unitDays : u === 'weeks' ? t.unitWeeksShort : t.unitMonths;

    return (
        <div
            className={[
                'summary-period period-row-editable',
                isExtra ? 'extra-period-row' : '',
                isDragging ? 'period-dragging' : '',
                isDragOver ? 'period-dragover' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            data-testid={`period-row-${isExtra ? period.extraPresetKey : period.type}`}
            onDragOver={(e) => editor.onDragOver(e, parentIndex, periodKey)}
            onDrop={(e) => editor.onDrop(e, parentIndex, periodKey)}
        >
            <div
                className={`period-drag-handle ${isBusy ? 'period-drag-handle--hidden' : ''}`}
                data-testid={`drag-handle-${isExtra ? period.extraPresetKey : period.type}`}
                draggable={!isBusy || undefined}
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', periodKey);
                    editor.onDragStart(parentIndex, periodKey);
                }}
                onDragEnd={editor.onDragEnd}
                title={t.dragToReorder}
                aria-hidden="true"
            >
                ⠿
            </div>

            <div className="period-dot" style={{ backgroundColor: activeColor[period.type] }} />

            <div className="period-info">
                {isEditing ? (
                    <div
                        className="period-edit-row"
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) editor.commitEdit();
                        }}
                    >
                        <input
                            ref={inputRef}
                            type="number"
                            min="1"
                            max={
                                isLactancia ? MAX_DURATION_VALUE : (maxWeeks ?? MAX_DURATION_VALUE)
                            }
                            step={1}
                            className="period-edit-input"
                            aria-label={t.labelDuration}
                            value={editValue}
                            onChange={(e) => editor.setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') editor.commitEdit();
                                if (e.key === 'Escape') editor.cancelEdit();
                            }}
                        />
                        {isLactancia && !isNaturalLactancia ? (
                            <select
                                className="period-edit-unit-select"
                                aria-label={t.labelDurationUnit}
                                value={editUnit}
                                onChange={(e) => editor.setEditUnit(e.target.value as EditUnit)}
                            >
                                <option value="days">{t.unitDays}</option>
                                <option value="weeks">{t.unitWeeksShort}</option>
                                <option value="months">{t.unitMonths}</option>
                            </select>
                        ) : (
                            <span className="period-edit-unit">
                                {unitLabel(period.type === LEAVE_TYPES.CONVENIO ? 'days' : 'weeks')}
                            </span>
                        )}
                    </div>
                ) : canEditDuration ? (
                    <button
                        type="button"
                        className="period-type period-type-btn"
                        onClick={() => editor.startEditing(parentIndex, period)}
                        title={t.clickToEdit}
                        aria-label={`${label}. ${t.clickToEdit}`}
                    >
                        {label}
                        <span className="period-edit-icon" aria-hidden="true">
                            ✎
                        </span>
                    </button>
                ) : (
                    <span className="period-type extra-period-name">
                        {label}
                        <span className="extra-period-badge">
                            {period.durationValue}{' '}
                            {period.durationUnit === 'weeks' ? t.unitWeeksShort : t.unitDays}
                        </span>
                    </span>
                )}

                {isEditingDate ? (
                    <div className="period-date-picker-row">
                        <DatePicker
                            selected={editStartDateValue}
                            onChange={(date: Date | null) => {
                                if (date) editor.commitStartDate(date);
                            }}
                            onClickOutside={cancelStartDate}
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
                                    aria-label={t.clickToEditStartDate}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') cancelStartDate();
                                    }}
                                />
                            }
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        className="period-dates period-dates-editable"
                        onClick={() =>
                            editor.openStartDateEdit(
                                parentIndex,
                                periodKey,
                                parseLocalDate(period.startDate),
                                minStartDate,
                            )
                        }
                        title={t.clickToEditStartDate}
                        aria-label={`${formatDisplayDate(parseLocalDate(period.startDate), lang)} → ${formatDisplayDate(parseLocalDate(period.endDate), lang)}. ${t.clickToEditStartDate}`}
                    >
                        {formatDisplayDate(parseLocalDate(period.startDate), lang)} →{' '}
                        {formatDisplayDate(parseLocalDate(period.endDate), lang)}
                        <span className="period-date-edit-icon" aria-hidden="true">
                            ✎
                        </span>
                    </button>
                )}

                {isLactancia && period.days !== null && (
                    <span className="period-hint">
                        {parent.regime === 'et'
                            ? t.lactanciaEstimateHint
                            : t.lactanciaEstimateHintPublic}
                    </span>
                )}
                {warningText && (
                    <span className="period-warning" role="note" data-testid="period-warning">
                        ⚠️ {warningText}
                    </span>
                )}
            </div>

            <div className="period-actions">
                <button
                    type="button"
                    className="btn-period-move"
                    onClick={() => editor.move(parentIndex, periodKey, -1)}
                    disabled={!canMoveEarlier}
                    title={t.moveEarlier}
                    aria-label={t.moveEarlier}
                >
                    ▲
                </button>
                <button
                    type="button"
                    className="btn-period-move"
                    onClick={() => editor.move(parentIndex, periodKey, 1)}
                    disabled={!canMoveLater}
                    title={t.moveLater}
                    aria-label={t.moveLater}
                >
                    ▼
                </button>
                {isExtra && period.extraId && (
                    <button
                        type="button"
                        className="btn-delete-extra"
                        title={t.remove}
                        aria-label={`${t.remove}: ${label}`}
                        onClick={() => editor.removeExtra(parentIndex, period.extraId!)}
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}
