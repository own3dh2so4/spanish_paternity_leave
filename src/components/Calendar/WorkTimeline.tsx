import type { ComputedPeriod } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import type { Language } from '../../i18n/LanguageContext';
import { formatDisplayDate, parseLocalDate } from '../../utils/dates';

interface Props {
    periods: ComputedPeriod[];
    lang: Language;
    t: TranslationKeys;
}

interface TimeBlock {
    start: Date;
    end: Date;
}

export function mergeTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
    const [earliest, ...rest] = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
    if (!earliest) return [];

    const merged: TimeBlock[] = [];
    let current: TimeBlock = { ...earliest };
    for (const next of rest) {
        if (next.start <= current.end) {
            if (next.end > current.end) current.end = new Date(next.end);
        } else {
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);
    return merged;
}

export default function WorkTimeline({ periods, lang, t }: Props) {
    const merged = mergeTimeBlocks(
        periods.map((p) => ({
            start: parseLocalDate(p.startDate),
            end: parseLocalDate(p.endDate),
        })),
    );
    if (merged.length === 0) return null;

    return (
        <div className="return-date">
            <span className="return-label">{t.workTimeline}</span>
            <div className="return-value">
                <ul className="work-timeline-list">
                    {merged.map((block, i) => (
                        <li
                            key={`${block.start.getTime()}-${block.end.getTime()}`}
                            className="work-timeline-item"
                        >
                            <div className="work-timeline-dot" />
                            <div className="work-timeline-content">
                                <div className="work-timeline-row">
                                    <span className="work-timeline-label">{t.stopsWorking}</span>
                                    <span className="work-timeline-date">
                                        {formatDisplayDate(block.start, lang)}
                                    </span>
                                </div>
                                <div className="work-timeline-row">
                                    <span className="work-timeline-label">
                                        {i === merged.length - 1
                                            ? t.returnsToWorkFinal
                                            : t.returnsToWork}
                                    </span>
                                    <span className="work-timeline-date">
                                        {formatDisplayDate(block.end, lang)}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
