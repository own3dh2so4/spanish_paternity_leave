import { useEffect, useMemo, useState } from 'react';
import { registerLocale } from 'react-datepicker';
import { enGB, es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import MonthGrid from './MonthGrid';
import CalendarHeader from './CalendarHeader';
import CalendarLegend from './CalendarLegend';
import SummaryCard from './SummaryCard';
import { computeSchedule, formatLeaveType } from '../../utils/calendarHelpers';
import { formatDateKey, parseLocalDate } from '../../utils/dates';
import { paletteFor } from '../../constants';
import type { ColorPalette, DateMap, WizardData } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { compressWizardData } from '../../utils/shareUtils';
import { useScheduleEditor } from '../../hooks/useScheduleEditor';
import './CalendarView.css';

registerLocale('en-GB', enGB);
registerLocale('es', es);

interface Props {
    data: WizardData;
    onEdit: () => void;
    onReset: () => void;
    onUpdateData: (data: WizardData) => void;
    initialHidden?: Set<number>;
}

const TOAST_MS = 3000;

export default function CalendarView({
    data,
    onEdit,
    onReset,
    onUpdateData,
    initialHidden,
}: Props) {
    const { t, lang, setLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [hiddenParents, setHiddenParents] = useState<Set<number>>(
        () => initialHidden ?? new Set(),
    );
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const editor = useScheduleEditor(data, onUpdateData);

    useEffect(() => {
        if (!toastMessage) return;
        const id = window.setTimeout(() => setToastMessage(null), TOAST_MS);
        return () => window.clearTimeout(id);
    }, [toastMessage]);

    const schedule = data.schedule;

    const activeColors = useMemo<ColorPalette[]>(
        () => schedule.map((p, i) => paletteFor(p.colorId, i)),
        [schedule],
    );

    const dateMap = useMemo(() => {
        const map: DateMap = {};
        schedule.forEach((parent, i) => {
            if (hiddenParents.has(i)) return;
            for (const period of parent.periods) {
                const label = formatLeaveType(period, t);
                const cur = parseLocalDate(period.startDate);
                const end = parseLocalDate(period.endDate);
                while (cur < end) {
                    const k = formatDateKey(cur);
                    (map[k] ??= []).push({
                        type: period.type,
                        parentIndex: i,
                        parentName: parent.name,
                        label,
                    });
                    cur.setDate(cur.getDate() + 1);
                }
            }
        });
        return map;
    }, [schedule, hiddenParents, t]);

    const months = useMemo(() => {
        let minDate = parseLocalDate(data.dueDate);
        let maxDate = parseLocalDate(data.dueDate);
        for (const parent of schedule) {
            for (const period of parent.periods) {
                const start = parseLocalDate(period.startDate);
                const end = parseLocalDate(period.endDate);
                if (start < minDate) minDate = start;
                if (end > maxDate) maxDate = end;
            }
        }
        const result: { year: number; month: number }[] = [];
        const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const endOfLast = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
        while (current <= endOfLast) {
            result.push({ year: current.getFullYear(), month: current.getMonth() });
            current.setMonth(current.getMonth() + 1);
        }
        return result;
    }, [schedule, data.dueDate]);

    const displayOrder = useMemo<number[]>(() => {
        if (data.leaveMode !== 'optimized' || data.parentCount < 2)
            return schedule.map((_, i) => i);
        return data.firstParent === 1 ? [1, 0] : [0, 1];
    }, [data.leaveMode, data.parentCount, data.firstParent, schedule]);

    const toggleParentVisibility = (idx: number) => {
        setHiddenParents((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleShare = async () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('share', compressWizardData(data, hiddenParents));
            await navigator.clipboard.writeText(url.toString());
            setToastMessage(`✅ ${t.shareSuccess}`);
        } catch {
            setToastMessage(`❌ ${t.shareError}`);
        }
    };

    const handleDueDateChange = (date: Date | null) => {
        if (!date) return;
        const iso = formatDateKey(date);
        if (iso === data.dueDate) return;
        const next = { ...data, dueDate: iso };
        onUpdateData({ ...next, schedule: computeSchedule(next) });
    };

    const resetParentCustom = (parentIndex: number) => {
        const fresh = computeSchedule(data);
        onUpdateData({
            ...data,
            schedule: schedule.map((parent, i) =>
                i === parentIndex ? (fresh[i] ?? parent) : parent,
            ),
        });
    };

    return (
        <div className="calendar-container">
            <CalendarHeader
                data={data}
                lang={lang}
                theme={theme}
                t={t}
                onEdit={onEdit}
                onReset={onReset}
                onShare={handleShare}
                onDueDateChange={handleDueDateChange}
                onToggleLang={() => setLang(lang === 'en' ? 'es' : 'en')}
                onToggleTheme={toggleTheme}
            />

            <div className="summary-cards">
                {displayOrder.map((idx) => {
                    const parent = schedule[idx];
                    const activeColor = activeColors[idx];
                    if (!parent || !activeColor) return null;
                    return (
                        <SummaryCard
                            key={idx}
                            parentIndex={idx}
                            parent={parent}
                            activeColor={activeColor}
                            isHidden={hiddenParents.has(idx)}
                            dueDate={data.dueDate}
                            lang={lang}
                            t={t}
                            editor={editor}
                            onToggleVisibility={toggleParentVisibility}
                            onResetCustom={resetParentCustom}
                        />
                    );
                })}
            </div>

            <CalendarLegend
                displayOrder={displayOrder}
                schedule={schedule}
                activeColors={activeColors}
                hiddenParents={hiddenParents}
                t={t}
            />

            <div className="months-container">
                {months.map(({ year, month }) => (
                    <MonthGrid
                        key={`${year}-${month}`}
                        year={year}
                        month={month}
                        dateMap={dateMap}
                        birthDateKey={data.dueDate}
                        parentColors={activeColors}
                        lang={lang}
                        t={t}
                    />
                ))}
            </div>

            <p className="legal-disclaimer">{t.legalDisclaimer}</p>

            <div className="toast-region" role="status" aria-live="polite">
                {toastMessage && <div className="toast-message">{toastMessage}</div>}
            </div>
        </div>
    );
}
