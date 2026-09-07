import type { ColorPalette, ComputedParentSchedule } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';
import type { ScheduleEditor } from '../../hooks/useScheduleEditor';
import { getPeriodKey } from '../../utils/calendarHelpers';
import { parseLocalDate } from '../../utils/dates';
import { splitFixed } from '../../utils/periodChain';
import FixedPeriodRow from './FixedPeriodRow';
import PeriodRow from './PeriodRow';
import AddExtraForm from './AddExtraForm';
import WorkTimeline from './WorkTimeline';

interface Props {
    parentIndex: number;
    parent: ComputedParentSchedule;
    activeColor: ColorPalette;
    isHidden: boolean;
    dueDate: string;
    lang: Language;
    t: TranslationKeys;
    editor: ScheduleEditor;
    onToggleVisibility: (idx: number) => void;
    onResetCustom: (idx: number) => void;
}

export default function SummaryCard({
    parentIndex,
    parent,
    activeColor,
    isHidden,
    dueDate,
    lang,
    t,
    editor,
    onToggleVisibility,
    onResetCustom,
}: Props) {
    const { fixed, editable } = splitFixed(parent.periods);
    const mandatory = fixed.find((p) => p.type === 'mandatory');

    const minStartFor = (idx: number): Date => {
        if (idx > 0) return parseLocalDate(editable[idx - 1].endDate);
        return parseLocalDate(mandatory?.endDate ?? dueDate);
    };

    return (
        <section
            className="summary-card"
            data-testid={`summary-card-${parentIndex}`}
            style={{ borderColor: activeColor.accent }}
            aria-label={parent.name}
        >
            <div className="summary-card-header" style={{ background: activeColor.gradient }}>
                <span className="summary-card-name">{parent.name}</span>
                <button
                    type="button"
                    className="btn-reset-custom"
                    onClick={() => onResetCustom(parentIndex)}
                    title={t.resetCustomTooltip}
                    aria-label={t.resetCustomTooltip}
                >
                    {t.btnResetCustom}
                </button>
                <button
                    type="button"
                    className="btn-toggle-parent"
                    onClick={() => onToggleVisibility(parentIndex)}
                    title={isHidden ? t.showParent : t.hideParent}
                    aria-label={isHidden ? t.showParent : t.hideParent}
                    aria-pressed={isHidden}
                >
                    <span aria-hidden="true">{isHidden ? '🙈' : '👁'}</span>
                </button>
            </div>

            <div className={`summary-card-body${isHidden ? ' summary-card-body--hidden' : ''}`}>
                {fixed.map((p) => (
                    <FixedPeriodRow
                        key={p.type}
                        period={p}
                        activeColor={activeColor}
                        lang={lang}
                        t={t}
                    />
                ))}

                {editable.map((p, idx) => (
                    <PeriodRow
                        key={getPeriodKey(p)}
                        period={p}
                        parent={parent}
                        parentIndex={parentIndex}
                        activeColor={activeColor}
                        dueDate={dueDate}
                        lang={lang}
                        t={t}
                        editor={editor}
                        canMoveEarlier={idx > 0}
                        canMoveLater={idx < editable.length - 1}
                        minStartDate={minStartFor(idx)}
                    />
                ))}

                {editor.addingForParent === parentIndex ? (
                    <AddExtraForm parentIndex={parentIndex} parent={parent} t={t} editor={editor} />
                ) : (
                    <button
                        type="button"
                        className="btn-add-extra"
                        onClick={() => editor.openAddForm(parentIndex)}
                        data-testid="add-period-btn"
                    >
                        {t.btnAddPeriod}
                    </button>
                )}

                <WorkTimeline periods={parent.periods} lang={lang} t={t} />
            </div>
        </section>
    );
}
