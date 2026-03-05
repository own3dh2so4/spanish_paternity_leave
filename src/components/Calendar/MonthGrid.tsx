import DayCell from './DayCell';
import { DAY_NAMES, MONTH_NAMES } from '../../constants';
import { formatDateKey } from '../../utils/leaveCalculator';
import type { ColorPalette, DateMap } from '../../types';

interface Props {
    year: number;
    month: number;
    dateMap: DateMap;
    birthDateKey: string;
    parentColors: ColorPalette[];
}

export default function MonthGrid({ year, month, dateMap, birthDateKey, parentColors }: Props) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // ISO week: Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const today = new Date();
    const todayKey = formatDateKey(today);

    const cells: (Date | null)[] = [];

    for (let i = 0; i < startDow; i++) {
        cells.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
        cells.push(new Date(year, month, d));
    }

    return (
        <div className="month-grid">
            <h3 className="month-title">
                {MONTH_NAMES[month]} {year}
            </h3>
            <div className="day-names">
                {DAY_NAMES.map((name) => (
                    <div key={name} className="day-name">
                        {name}
                    </div>
                ))}
            </div>
            <div className="days-grid">
                {cells.map((day, index) => {
                    if (!day) {
                        return <DayCell key={`empty-${index}`} day={null} />;
                    }
                    const dateKey = formatDateKey(day);
                    return (
                        <DayCell
                            key={dateKey}
                            day={day}
                            dateKey={dateKey}
                            entries={dateMap[dateKey] ?? null}
                            isToday={dateKey === todayKey}
                            birthDateKey={birthDateKey}
                            parentColors={parentColors}
                        />
                    );
                })}
            </div>
        </div>
    );
}
