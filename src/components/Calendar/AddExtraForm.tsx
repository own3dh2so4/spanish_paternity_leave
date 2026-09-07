import type { ComputedParentSchedule, ExtraPresetKey } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { ScheduleEditor } from '../../hooks/useScheduleEditor';
import { EXTRA_PRESETS } from '../../utils/calendarHelpers';
import { getRemainingFlexWeeks } from '../../utils/leaveLaw';

interface Props {
    parentIndex: number;
    parent: ComputedParentSchedule;
    t: TranslationKeys;
    editor: ScheduleEditor;
}

const MAX_FREE_DURATION = 999;

export default function AddExtraForm({ parentIndex, parent, t, editor }: Props) {
    const { form } = editor;
    const remaining = getRemainingFlexWeeks(parent);
    const isFlexExtra = form.presetKey === 'flexible-extra';
    const max = isFlexExtra ? remaining : MAX_FREE_DURATION;

    const submitOnEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') editor.confirmAdd(parentIndex);
        if (e.key === 'Escape') editor.closeAddForm();
    };

    return (
        <div className="add-extra-form" data-testid="add-extra-form">
            <select
                className="add-extra-preset-select"
                aria-label={t.btnAddPeriod}
                value={form.presetKey}
                onChange={(e) => editor.setPreset(e.target.value as ExtraPresetKey, parent)}
            >
                {EXTRA_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                        {p.emoji} {t[p.labelKey] as string}
                    </option>
                ))}
                {remaining > 0 && (
                    <option value="flexible-extra">{t.flexibleExtraOption(remaining)}</option>
                )}
            </select>

            {form.presetKey === 'custom' && (
                <input
                    className="add-extra-name-input"
                    type="text"
                    maxLength={40}
                    value={form.customName}
                    onChange={(e) => editor.setCustomName(e.target.value)}
                    placeholder={t.periodNamePlaceholder}
                    aria-label={t.periodNamePlaceholder}
                    autoFocus
                    onKeyDown={submitOnEnter}
                />
            )}

            <div className="add-extra-duration-row">
                <input
                    className="period-edit-input add-extra-weeks-input"
                    type="number"
                    min="1"
                    max={max}
                    step="1"
                    aria-label={isFlexExtra ? t.unitWeeksShort : t.unitDays}
                    value={form.durationValue}
                    onChange={(e) => {
                        const raw = Number.parseInt(e.target.value, 10);
                        const value = Number.isFinite(raw) ? raw : 1;
                        editor.setDurationValue(Math.min(Math.max(1, value), max));
                    }}
                    onKeyDown={submitOnEnter}
                />
                <select
                    className="add-extra-unit-select"
                    aria-label={t.unitWeeksShort}
                    value={isFlexExtra ? 'weeks' : form.durationUnit}
                    disabled={isFlexExtra}
                    onChange={(e) => editor.setDurationUnit(e.target.value as 'days' | 'weeks')}
                >
                    <option value="days">{t.unitDays}</option>
                    <option value="weeks">{t.unitWeeksShort}</option>
                </select>
                <button
                    type="button"
                    className="add-extra-confirm"
                    title={t.add}
                    aria-label={t.add}
                    onClick={() => editor.confirmAdd(parentIndex)}
                    data-testid="add-extra-confirm"
                >
                    ✓
                </button>
                <button
                    type="button"
                    className="add-extra-cancel"
                    title={t.cancel}
                    aria-label={t.cancel}
                    onClick={editor.closeAddForm}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
