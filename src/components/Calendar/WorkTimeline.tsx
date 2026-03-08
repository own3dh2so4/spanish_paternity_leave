import type { ComputedPeriod } from '../../types';
import type { TranslationKeys } from '../../i18n/en';
import { formatDisplayDate } from '../../utils/leaveCalculator';
import { parseLocalDate } from '../../utils/calendarHelpers';

interface Props {
    periods: ComputedPeriod[];
    t: TranslationKeys;
}

interface TimeBlock {
    start: Date;
    end: Date;
}

/**
 * Merges overlapping or contiguous date ranges into a minimal list of blocks.
 */
function mergeTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
    if (blocks.length === 0) return [];
    const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: TimeBlock[] = [];
    let current = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
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

export default function WorkTimeline({ periods, t }: Props) {
    const allLeave: TimeBlock[] = periods.map((p) => ({
        start: parseLocalDate(p.startDate),
        end: parseLocalDate(p.endDate),
    }));

    const merged = mergeTimeBlocks(allLeave);

    return (
        <div className="return-date">
            <span className="return-label">{t.workTimeline}</span>
            <div className="return-value">
                {merged.length === 0 ? null : (
                    <ul className="work-timeline-list">
                        {merged.map((block, i) => (
                            <li
                                key={`${block.start.getTime()}-${block.end.getTime()}`}
                                className="work-timeline-item"
                            >
                                <div className="work-timeline-dot" />
                                <div className="work-timeline-content">
                                    <div className="work-timeline-row">
                                        <span className="work-timeline-label">
                                            {t.stopsWorking}
                                        </span>
                                        <span className="work-timeline-date">
                                            {formatDisplayDate(block.start)}
                                        </span>
                                    </div>
                                    <div className="work-timeline-row">
                                        <span className="work-timeline-label">
                                            {i === merged.length - 1
                                                ? t.returnsToWorkFinal
                                                : t.returnsToWork}
                                        </span>
                                        <span className="work-timeline-date">
                                            {formatDisplayDate(block.end)}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
