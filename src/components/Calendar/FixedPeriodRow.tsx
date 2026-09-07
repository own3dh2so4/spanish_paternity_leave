import { LEAVE_TYPES } from '../../constants';
import type { ColorPalette, ComputedPeriod } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';
import { formatLeaveType } from '../../utils/calendarHelpers';
import { formatDisplayDate, parseLocalDate } from '../../utils/dates';

interface Props {
    period: ComputedPeriod;
    activeColor: ColorPalette;
    lang: Language;
    t: TranslationKeys;
}

export default function FixedPeriodRow({ period, activeColor, lang, t }: Props) {
    const badge =
        period.type === LEAVE_TYPES.MANDATORY
            ? { text: t.requiredByLaw, tip: t.requiredByLawTooltip }
            : period.type === LEAVE_TYPES.GESTATION
              ? { text: t.gestationBadge, tip: t.gestationTooltip }
              : { text: t.anticipatedBadge, tip: t.anticipatedTooltip };
    return (
        <div
            className="summary-period period-row-readonly"
            data-testid={`period-row-${period.type}`}
        >
            <div className="period-drag-handle period-drag-handle--hidden" aria-hidden="true">
                ⠿
            </div>
            <div className="period-dot" style={{ backgroundColor: activeColor[period.type] }} />
            <div className="period-info">
                <span className="period-type">
                    {formatLeaveType(period, t)}
                    <span className="period-mandatory-badge" title={badge.tip}>
                        {badge.text}
                    </span>
                </span>
                <span className="period-dates">
                    {formatDisplayDate(parseLocalDate(period.startDate), lang)} →{' '}
                    {formatDisplayDate(parseLocalDate(period.endDate), lang)}
                </span>
            </div>
        </div>
    );
}
