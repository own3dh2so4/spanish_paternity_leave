import type { ComputedParentSchedule } from '../../types';
import {
    EXTRA_PRESETS,
    getRemainingFlexWeeks,
} from '../../utils/calendarHelpers';
import type { TranslationKeys } from '../../i18n/en';

interface Props {
    parentIndex: number;
    parentSchedule: ComputedParentSchedule;
    t: TranslationKeys;
    // Form state
    newPresetKey: string;
    newCustomName: string;
    newDurationValue: number;
    newDurationUnit: 'days' | 'weeks';
    onPresetChange: (key: string, parentSchedule: ComputedParentSchedule) => void;
    onCustomNameChange: (v: string) => void;
    onDurationValueChange: (v: number) => void;
    onDurationUnitChange: (u: 'days' | 'weeks') => void;
    onConfirm: (parentIndex: number) => void;
    onCancel: () => void;
}

export default function AddExtraForm({
    parentIndex,
    parentSchedule,
    t,
    newPresetKey,
    newCustomName,
    newDurationValue,
    newDurationUnit,
    onPresetChange,
    onCustomNameChange,
    onDurationValueChange,
    onDurationUnitChange,
    onConfirm,
    onCancel,
}: Props) {
    const remaining = getRemainingFlexWeeks(parentSchedule);
    const isFlexExtra = newPresetKey === 'flexible-extra';
    const maxWeeks = isFlexExtra ? remaining : undefined;

    return (
        <div className="add-extra-form" onClick={(e) => e.stopPropagation()}>
            <select
                className="add-extra-preset-select"
                value={newPresetKey}
                onChange={(e) => onPresetChange(e.target.value, parentSchedule)}
            >
                {EXTRA_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                        {p.key === 'vacation' ? '🏖️ ' : ''}
                        {p.key === 'unpaid' ? '📋 ' : ''}
                        {p.key === 'gradual' ? '🔄 ' : ''}
                        {p.key === 'custom' ? '✏️ ' : ''}
                        {t[p.labelKey] as string}
                    </option>
                ))}
                {remaining > 0 && (
                    <option value="flexible-extra">{t.flexibleExtra(remaining)}</option>
                )}
            </select>

            {newPresetKey === 'custom' && (
                <input
                    className="add-extra-name-input"
                    type="text"
                    value={newCustomName}
                    onChange={(e) => onCustomNameChange(e.target.value)}
                    placeholder={t.periodNamePlaceholder}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onConfirm(parentIndex);
                        if (e.key === 'Escape') onCancel();
                    }}
                />
            )}

            <div className="add-extra-duration-row">
                <input
                    className="period-edit-input add-extra-weeks-input"
                    type="number"
                    min="1"
                    max={maxWeeks}
                    step="1"
                    value={newDurationValue}
                    onChange={(e) => {
                        const raw = parseInt(e.target.value) || 1;
                        onDurationValueChange(
                            maxWeeks !== undefined
                                ? Math.min(Math.max(1, raw), maxWeeks)
                                : Math.max(1, raw),
                        );
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onConfirm(parentIndex);
                        if (e.key === 'Escape') onCancel();
                    }}
                />
                <select
                    className="add-extra-unit-select"
                    value={newDurationUnit}
                    disabled={isFlexExtra}
                    onChange={(e) =>
                        onDurationUnitChange(e.target.value as 'days' | 'weeks')
                    }
                >
                    {!isFlexExtra && (
                        <option value="days">{t.unitDays}</option>
                    )}
                    <option value="weeks">{t.unitWeeksShort}</option>
                </select>
                <button
                    className="add-extra-confirm"
                    title={t.add}
                    onClick={() => onConfirm(parentIndex)}
                >
                    ✓
                </button>
                <button className="add-extra-cancel" title={t.cancel} onClick={onCancel}>
                    ✕
                </button>
            </div>
        </div>
    );
}
