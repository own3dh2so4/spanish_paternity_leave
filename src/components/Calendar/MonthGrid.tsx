import { useMemo } from 'react';
import DayCell from './DayCell';
import type { ColorPalette, DateMap } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';
import { formatDateKey, formatMonthTitle, todayIso, weekdayNames } from '../../utils/dates';

interface Props {
    year: number;
    month: number;
    dateMap: DateMap;
    birthDateKey: string;
    parentColors: ColorPalette[];
    lang: Language;
    t: TranslationKeys;
}

export default function MonthGrid({
    year,
    month,
    dateMap,
    birthDateKey,
    parentColors,
    lang,
    t,
}: Props) {
    const dayNames = useMemo(() => weekdayNames(lang), [lang]);
    const todayKey = todayIso();

    const cells = useMemo(() => {
        const first = new Date(year, month, 1);
        const totalDays = new Date(year, month + 1, 0).getDate();
        const leading = (first.getDay() + 6) % 7;
        const result: (Date | null)[] = Array.from({ length: leading }, () => null);
        for (let d = 1; d <= totalDays; d++) result.push(new Date(year, month, d));
        while (result.length % 7 !== 0) result.push(null);
        return result;
    }, [year, month]);

    return (
        <section className="month-grid" aria-label={formatMonthTitle(year, month, lang)}>
            <h3 className="month-title">{formatMonthTitle(year, month, lang)}</h3>
            <div className="day-names" aria-hidden="true">
                {dayNames.map((name) => (
                    <div key={name} className="day-name">
                        {name}
                    </div>
                ))}
            </div>
            <div className="days-grid">
                {cells.map((day, index) => {
                    if (!day)
                        return <DayCell key={`empty-${index}`} day={null} lang={lang} t={t} />;
                    const dateKey = formatDateKey(day);
                    return (
                        <DayCell
                            key={dateKey}
                            day={day}
                            dateKey={dateKey}
                            entries={dateMap[dateKey] ?? null}
                            isToday={dateKey === todayKey}
                            isBirthDay={dateKey === birthDateKey}
                            column={index % 7}
                            parentColors={parentColors}
                            lang={lang}
                            t={t}
                        />
                    );
                })}
            </div>
        </section>
    );
}
