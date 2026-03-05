import { useState } from 'react';
import { LEAVE_TYPES, MANDATORY_WEEKS, FLEXIBLE_WEEKS, CUIDADO_PAID_WEEKS } from '../../constants';
import type { ColorPalette, DateMapEntry } from '../../types';

interface Props {
    day: Date | null;
    dateKey?: string;
    entries?: DateMapEntry[] | null;
    isToday?: boolean;
    birthDateKey?: string;
    parentColors?: ColorPalette[];
}

export default function DayCell({ day, dateKey, entries, isToday, birthDateKey, parentColors }: Props) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!day) {
        return <div className="day-cell empty" />;
    }

    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const isBirthDay = dateKey === birthDateKey;

    let backgroundColor = 'transparent';
    let textColor = isWeekend ? 'var(--text-muted)' : 'var(--text-secondary)';

    if (entries && entries.length > 0 && parentColors) {
        if (entries.length > 1) {
            const c1 = parentColors[entries[0].parentIndex];
            const c2 = parentColors[entries[1].parentIndex];
            backgroundColor = `linear-gradient(135deg, ${c1[entries[0].type]} 50%, ${c2[entries[1].type]} 50%)`;
            textColor = 'white';
        } else {
            const entry = entries[0];
            const colors = parentColors[entry.parentIndex];
            backgroundColor = colors[entry.type];
            textColor = entry.type === LEAVE_TYPES.LACTANCIA ? 'var(--text-primary)' : 'white';
        }
    }

    const style: React.CSSProperties = {};
    if (backgroundColor.startsWith('linear')) {
        style.background = backgroundColor;
    } else {
        style.backgroundColor = backgroundColor;
    }

    const hasEntries = Boolean(entries && entries.length > 0);

    const dateLabel = day.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div
            className={`day-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${isBirthDay ? 'birthday' : ''} ${hasEntries ? 'has-leave' : ''}`}
            style={style}
            onMouseEnter={() => hasEntries && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span className="day-number" style={{ color: hasEntries ? textColor : undefined }}>
                {day.getDate()}
            </span>
            {isBirthDay && <span className="birth-marker">👶</span>}

            {showTooltip && hasEntries && entries && parentColors && (
                <div className="day-tooltip">
                    <div className="tooltip-header">{dateLabel}</div>
                    {isBirthDay && <div className="tooltip-birth">👶 Birth Date</div>}
                    <div className="tooltip-entries">
                        {entries.map((entry, idx) => (
                            <div key={idx} className="tooltip-entry">
                                <div
                                    className="tooltip-color-bar"
                                    style={{
                                        backgroundColor: parentColors[entry.parentIndex][entry.type],
                                    }}
                                />
                                <div className="tooltip-entry-content">
                                    <span className="tooltip-name">{entry.parentName}</span>
                                    <span className="tooltip-type">{formatType(entry)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatType(entry: DateMapEntry): string {
    if (entry.type === LEAVE_TYPES.EXTRA) {
        return entry.customName ?? 'Extra period';
    }
    switch (entry.type) {
        case LEAVE_TYPES.MANDATORY:
            return `Mandatory Leave (${MANDATORY_WEEKS} weeks)`;
        case LEAVE_TYPES.FLEXIBLE:
            return `Flexible Leave (${FLEXIBLE_WEEKS} weeks)`;
        case LEAVE_TYPES.LACTANCIA:
            return 'Accumulated Lactancia';
        case LEAVE_TYPES.CUIDADO:
            return `Childcare Leave (2 paid + ${(CUIDADO_PAID_WEEKS ?? 2) > 0 ? '' : ''}unpaid)`;
        default:
            return entry.type;
    }
}
