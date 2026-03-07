import { useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { enGB } from 'date-fns/locale';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useLanguage } from '../../i18n/LanguageContext';

registerLocale('en-GB', enGB);
registerLocale('es', es);

interface Props {
    value: string;
    onChange: (date: string) => void;
}

function toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default function StepDueDate({ value, onChange }: Props) {
    const { t } = useLanguage();

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const selectedDate = useMemo(() => {
        if (!value) return null;
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d);
    }, [value]);

    const handleChange = (date: Date | null) => {
        onChange(date ? toISODate(date) : '');
    };

    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">📅</div>
            <h2>{t.dueDateTitle}</h2>
            <p className="step-description">{t.dueDateDescription}</p>
            <div className="input-group datepicker-group">
                <DatePicker
                    selected={selectedDate}
                    onChange={handleChange}
                    dateFormat="dd/MM/yyyy"
                    locale={t.datePickerLocale}
                    minDate={today}
                    placeholderText={t.dueDatePlaceholder}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    className="text-input datepicker-input"
                    calendarClassName="dp-dark"
                    wrapperClassName="datepicker-wrapper"
                    yearDropdownItemNumber={10}
                    scrollableYearDropdown
                />
            </div>
        </div>
    );
}
