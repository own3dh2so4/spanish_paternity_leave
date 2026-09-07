import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import type { WizardData } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';
import type { Theme } from '../../theme/ThemeContext';
import { formatDisplayDate, parseLocalDate } from '../../utils/dates';
import HeaderControls from '../HeaderControls';

interface Props {
    data: WizardData;
    lang: Language;
    theme: Theme;
    t: TranslationKeys;
    onEdit: () => void;
    onReset: () => void;
    onShare: () => void;
    onDueDateChange: (date: Date | null) => void;
    onToggleLang: () => void;
    onToggleTheme: () => void;
}

const DueDateButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    function DueDateButton(props, ref) {
        return <button type="button" ref={ref} {...props} className="header-due-date" />;
    },
);

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
    const dueDate = parseLocalDate(data.dueDate);
    return (
        <header className="calendar-header">
            <div className="header-left">
                <h1>{t.scheduleTitle}</h1>
                <p className="header-subtitle">
                    {t.dueDate}:{' '}
                    <DatePicker
                        selected={dueDate}
                        onChange={onDueDateChange}
                        dateFormat="dd/MM/yyyy"
                        locale={t.datePickerLocale}
                        calendarClassName="dp-dark"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        popperPlacement="bottom-start"
                        customInput={
                            <DueDateButton
                                title={t.tooltipChangeDueDate}
                                aria-label={t.tooltipChangeDueDate}
                            >
                                {formatDisplayDate(dueDate, lang)}
                            </DueDateButton>
                        }
                    />
                    {data.parentCount === 2 && (
                        <>
                            {' '}
                            · {t.mode}:{' '}
                            <strong data-testid="mode-label">
                                {data.leaveMode === 'together'
                                    ? t.modeLabelTogether
                                    : t.modeLabelOptimized}
                            </strong>
                        </>
                    )}
                </p>
            </div>
            <div className="header-toolbar">
                <button
                    type="button"
                    className="btn btn-edit"
                    onClick={onEdit}
                    data-testid="edit-btn"
                >
                    {t.btnEdit}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onReset}
                    title={t.resetTooltip}
                    data-testid="reset-btn"
                >
                    {t.btnReset}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onShare}
                    data-testid="share-btn"
                >
                    {t.btnShare}
                </button>
                <HeaderControls
                    lang={lang}
                    theme={theme}
                    t={t}
                    onToggleLang={onToggleLang}
                    onToggleTheme={onToggleTheme}
                />
            </div>
        </header>
    );
}
