import { useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { enGB, es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { EXTRA_WEEKS_RETROACTIVE_START } from '../../constants';
import { useLanguage } from '../../i18n/LanguageContext';
import { addYears, formatDateKey, parseLocalDate } from '../../utils/dates';
import { isExtraWeeksOnlyRegime, isUnsupportedDueDate } from '../../utils/leaveLaw';

registerLocale('en-GB', enGB);
registerLocale('es', es);

interface Props {
    value: string;
    onChange: (date: string) => void;
}

export default function StepDueDate({ value, onChange }: Props) {
    const { t } = useLanguage();

    const { minDate, maxDate } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
            minDate: parseLocalDate(EXTRA_WEEKS_RETROACTIVE_START),
            maxDate: addYears(today, 2),
        };
    }, []);

    const selectedDate = useMemo(() => (value ? parseLocalDate(value) : null), [value]);

    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">📅</div>
            <h2 id="due-date-title">{t.dueDateTitle}</h2>
            <p className="step-description">{t.dueDateDescription}</p>
            <div className="input-group datepicker-group" data-testid="due-date-container">
                <DatePicker
                    selected={selectedDate}
                    onChange={(date: Date | null) => onChange(date ? formatDateKey(date) : '')}
                    dateFormat="dd/MM/yyyy"
                    locale={t.datePickerLocale}
                    minDate={minDate}
                    maxDate={maxDate}
                    placeholderText={t.dueDatePlaceholder}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    className="text-input datepicker-input"
                    calendarClassName="dp-dark"
                    wrapperClassName="datepicker-wrapper"
                    ariaLabelledBy="due-date-title"
                />
            </div>
            {value && isUnsupportedDueDate(value) && (
                <p className="wizard-notice wizard-notice--warning" role="status">
                    {t.oldRegimeWarning}
                </p>
            )}
            {value && isExtraWeeksOnlyRegime(value) && (
                <p
                    className="wizard-notice wizard-notice--warning"
                    role="status"
                    data-testid="transitional-regime-notice"
                >
                    {t.transitionalExtraWeeksNotice}
                </p>
            )}
        </div>
    );
}
