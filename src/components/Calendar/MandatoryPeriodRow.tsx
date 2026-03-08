import type { ColorPalette, ComputedPeriod } from '../../types';
import { formatLeaveType } from '../../utils/calendarHelpers';
import { formatDisplayDate } from '../../utils/leaveCalculator';
import { parseLocalDate } from '../../utils/calendarHelpers';
import type { TranslationKeys } from '../../i18n/en';

interface Props {
    period: ComputedPeriod;
    activeColor: ColorPalette;
    t: TranslationKeys;
}

export default function MandatoryPeriodRow({ period, activeColor, t }: Props) {
    return (
        <div className="summary-period period-row-readonly">
            <div className="period-drag-handle period-drag-handle--hidden">⠿</div>
            <div
                className="period-dot"
                style={{ backgroundColor: activeColor.mandatory }}
            />
            <div className="period-info">
                <span className="period-type">
                    {formatLeaveType(period, t)}
                    <span
                        className="period-mandatory-badge"
                        title={t.requiredByLawTooltip}
                    >
                        {t.requiredByLaw}
                    </span>
                </span>
                <span className="period-dates">
                    {formatDisplayDate(parseLocalDate(period.startDate))} →{' '}
                    {formatDisplayDate(parseLocalDate(period.endDate))}
                </span>
            </div>
        </div>
    );
}
