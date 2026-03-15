import DatePicker from 'react-datepicker';
import type { WizardData } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import { formatDisplayDate } from '../../utils/leaveCalculator';

interface Props {
    data: WizardData;
    lang: string;
    theme: string;
    t: TranslationKeys;
    onEdit: () => void;
    onReset: () => void;
    onShare: () => void;
    onDueDateChange: (date: Date | null) => void;
    onToggleLang: () => void;
    onToggleTheme: () => void;
}

export default function CalendarHeader({
    data,
    lang,
    theme,
    t,
    onEdit,
    onReset,
    onShare,
    onDueDateChange,
    onToggleLang,
    onToggleTheme,
}: Props) {
    return (
        <div className="calendar-header">
            <div className="header-left">
                <h1>{t.scheduleTitle}</h1>
                <p className="header-subtitle">
                    {t.dueDate}:{' '}
                    <DatePicker
                        selected={new Date(data.dueDate)}
                        onChange={onDueDateChange}
                        dateFormat="dd/MM/yyyy"
                        locale={t.datePickerLocale}
                        calendarClassName="dp-dark"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        popperPlacement="bottom-start"
                        customInput={
                            <strong
                                className="header-due-date"
                                title={t.tooltipChangeDueDate}
                            >
                                {formatDisplayDate(new Date(data.dueDate))}
                            </strong>
                        }
                    />
                    {data.parentCount === 2 && (
                        <>
                            {' '}
                            · {t.mode}:{' '}
                            <strong>
                                {data.leaveMode === 'together'
                                    ? t.modeLabelTogether
                                    : t.modeLabelOptimized}
                            </strong>
                        </>
                    )}
                </p>
            </div>
            <div className="header-toolbar">
                <button className="btn btn-edit" onClick={onEdit}>
                    {t.btnEdit}
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={onReset}
                    title={t.resetTooltip}
                >
                    {t.btnReset}
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={onShare}
                    title={t.btnShare}
                >
                    {t.btnShare}
                </button>
                <button
                    className="btn-icon btn btn-secondary"
                    style={{ fontSize: '0.78rem', fontWeight: 700 }}
                    onClick={onToggleLang}
                    title={t.tooltipSwitchLang}
                >
                    {lang === 'en' ? '🇪🇸 ES' : '🇬🇧 EN'}
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={onToggleTheme}
                    title={t.tooltipSwitchTheme(theme)}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>
        </div>
    );
}
