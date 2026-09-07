import { useState } from 'react';
import { LEAVE_TYPES } from '../../constants';
import type { ColorPalette, DateMapEntry } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';

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

const LOCALES: Record<Language, string> = { en: 'en-GB', es: 'es-ES' };

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
    const hasEntries = shown.length > 0 && !!parentColors;

    const style: React.CSSProperties = {};
    let textColor: string | undefined;
    if (hasEntries && parentColors) {
        if (shown.length > 1) {
            const c1 = parentColors[shown[0].parentIndex][shown[0].type];
            const c2 = parentColors[shown[1].parentIndex][shown[1].type];
            style.background = `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
            textColor = 'white';
        } else {
            style.backgroundColor = parentColors[shown[0].parentIndex][shown[0].type];
            textColor = shown[0].type === LEAVE_TYPES.LACTANCIA ? 'var(--text-primary)' : 'white';
        }
    }

    const dateLabel = day.toLocaleDateString(LOCALES[lang], {
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

            {
                <div className={`day-tooltip ${tooltipSide}`} aria-hidden="true">
                    <div className="tooltip-header">{dateLabel}</div>
                    {isBirthDay && <div className="tooltip-birth">👶 {t.birthDate}</div>}
                    {hasEntries && parentColors && (
                        <div className="tooltip-entries">
                            {shown.map((entry) => (
                                <div
                                    key={`${entry.parentIndex}-${entry.type}`}
                                    className="tooltip-entry"
                                >
                                    <div
                                        className="tooltip-color-bar"
                                        style={{
                                            backgroundColor:
                                                parentColors[entry.parentIndex][entry.type],
                                        }}
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
            }
        </button>
    );
}
