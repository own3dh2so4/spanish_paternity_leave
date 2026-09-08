import { LEAVE_TYPES } from '../../constants';
import type { ColorPalette, ComputedParentSchedule, LeaveType } from '../../types';
import type { TranslationKeys } from '../../i18n/en';

interface Props {
    displayOrder: number[];
    schedule: ComputedParentSchedule[];
    activeColors: ColorPalette[];
    hiddenParents: Set<number>;
    t: TranslationKeys;
}

export default function CalendarLegend({
    displayOrder,
    schedule,
    activeColors,
    hiddenParents,
    t,
}: Props) {
    return (
        <div className="calendar-legend">
            <div className="legend-sections">
                <div className="legend-section">
                    <div className="legend-title">{t.birthDate}</div>
                    <div className="legend-items">
                        <div className="legend-item">
                            <div className="legend-color birthday-legend">👶</div>
                            <span>{t.birthDate}</span>
                        </div>
                    </div>
                </div>
                {displayOrder.map((idx) => {
                    const parent = schedule[idx];
                    const color = activeColors[idx];
                    if (!parent || !color || hiddenParents.has(idx)) return null;
                    const hasType = (type: LeaveType) =>
                        parent.periods.some((p) => !p.isExtra && p.type === type);
                    const hasExtra = () => parent.periods.some((p) => p.isExtra);
                    const items: { color: string; label: string }[] = [
                        { color: color.mandatory, label: t.parentMandatory(parent.name) },
                        { color: color.flexible, label: t.parentFlexible(parent.name) },
                    ];
                    if (hasType(LEAVE_TYPES.CONVENIO))
                        items.push({ color: color.convenio, label: t.parentConvenio(parent.name) });
                    if (hasType(LEAVE_TYPES.CUIDADO))
                        items.push({
                            color: color.cuidado,
                            label: t.parentExtraUntil8(parent.name),
                        });
                    if (hasType(LEAVE_TYPES.LACTANCIA))
                        items.push({
                            color: color.lactancia,
                            label: t.parentLactancia(parent.name),
                        });
                    if (hasExtra())
                        items.push({ color: color.extra, label: t.parentExtra(parent.name) });
                    return (
                        <div key={idx} className="legend-section">
                            <div className="legend-title">{parent.name}</div>
                            <div className="legend-items">
                                {items.map((item) => (
                                    <div key={item.label} className="legend-item">
                                        <div
                                            className="legend-color"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
