import { useState } from 'react';
import { readableInkOn } from '../../constants';
import type { ColorPalette, DateMapEntry } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';
import { DISPLAY_LOCALES } from '../../utils/dates';

interface Props {
    day: Date | null;
    dateKey?: string;
    entries?: DateMapEntry[] | null;
    isToday?: boolean;
    isBirthDay?: boolean;
    column?: number;
    parentColors?: ColorPalette[];
    lang: Language;
    t: TranslationKeys;
}

export default function DayCell({
    day,
    dateKey,
    entries,
    isToday,
    isBirthDay,
    column = 0,
    parentColors,
    lang,
    t,
}: Props) {
    const [pinned, setPinned] = useState(false);
    if (!day) return <div className="day-cell empty" aria-hidden="true" />;

    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const shown = (entries ?? []).slice(0, 2);
    const [first, second] = shown;
    const colorOf = (entry: DateMapEntry) => parentColors?.[entry.parentIndex]?.[entry.type];
    const firstColor = first && colorOf(first);
    const hasEntries = !!firstColor;

    const style: React.CSSProperties = {};
    let textColor: string | undefined;
    if (firstColor) {
        const secondColor = second && colorOf(second);
        if (secondColor) {
            style.background = `linear-gradient(135deg, ${firstColor} 50%, ${secondColor} 50%)`;
        } else {
            style.backgroundColor = firstColor;
        }
        textColor = readableInkOn(firstColor);
    }

    const dateLabel = day.toLocaleDateString(DISPLAY_LOCALES[lang], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const description = [
        isBirthDay ? t.birthDate : null,
        isToday ? t.today : null,
        ...shown.map((e) => `${e.parentName}: ${e.label}`),
    ]
        .filter(Boolean)
        .join('. ');

    const tooltipSide = column >= 4 ? 'day-tooltip--right' : column <= 1 ? 'day-tooltip--left' : '';
    const interactive = hasEntries || isBirthDay;
    const className = [
        'day-cell',
        isWeekend ? 'weekend' : '',
        isToday ? 'today' : '',
        isBirthDay ? 'birthday' : '',
        hasEntries ? 'has-leave' : '',
        pinned ? 'tooltip-pinned' : '',
    ]
        .filter(Boolean)
        .join(' ');

    if (!interactive) {
        return (
            <div className={className} style={style} aria-label={dateLabel} data-date={dateKey}>
                <span className="day-number">{day.getDate()}</span>
            </div>
        );
    }

    return (
        <button
            type="button"
            className={className}
            style={style}
            aria-label={`${dateLabel}. ${description}`}
            aria-pressed={pinned}
            onClick={() => setPinned((v) => !v)}
            onBlur={() => setPinned(false)}
            data-date={dateKey}
        >
            <span className="day-number" style={{ color: hasEntries ? textColor : undefined }}>
                {day.getDate()}
            </span>
            {isBirthDay && (
                <span className="birth-marker" aria-hidden="true">
                    👶
                </span>
            )}

            <div className={`day-tooltip ${tooltipSide}`} aria-hidden="true">
                <div className="tooltip-header">{dateLabel}</div>
                {isBirthDay && <div className="tooltip-birth">👶 {t.birthDate}</div>}
                {hasEntries && (
                    <div className="tooltip-entries">
                        {shown.map((entry) => (
                            <div
                                key={`${entry.parentIndex}-${entry.type}`}
                                className="tooltip-entry"
                            >
                                <div
                                    className="tooltip-color-bar"
                                    style={{ backgroundColor: colorOf(entry) }}
                                />
                                <div className="tooltip-entry-content">
                                    <span className="tooltip-name">{entry.parentName}</span>
                                    <span className="tooltip-type">{entry.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
}
