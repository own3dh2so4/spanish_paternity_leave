import { LEAVE_TYPES } from '../../constants';
import type { ColorPalette, ComputedParentSchedule } from '../../types';
import type { TranslationKeys } from '../../i18n/en';

interface Props {
    displayOrder: number[];
    effectiveSchedule: ComputedParentSchedule[];
    activeColors: ColorPalette[];
    hiddenParents: Set<number>;
    t: TranslationKeys;
}

export default function CalendarLegend({
    displayOrder,
    effectiveSchedule,
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
                {displayOrder.map((realIdx) => {
                    if (hiddenParents.has(realIdx)) return null;
                    const parent = effectiveSchedule[realIdx];
                    if (!parent) return null;
                    const activeColor = activeColors[realIdx];
                    const hasLactancia = parent.periods.some(
                        (p) => !p.isExtra && p.type === LEAVE_TYPES.LACTANCIA,
                    );
                    const hasCuidado = parent.periods.some(
                        (p) => !p.isExtra && p.type === LEAVE_TYPES.CUIDADO,
                    );
                    const hasExtra = parent.periods.some((p) => p.isExtra);
                    return (
                        <div key={parent.name} className="legend-section">
                            <div className="legend-title">{parent.name}</div>
                            <div className="legend-items">
                                <div className="legend-item">
                                    <div
                                        className="legend-color"
                                        style={{ backgroundColor: activeColor.mandatory }}
                                    />
                                    <span>{t.parentMandatory(parent.name)}</span>
                                </div>
                                <div className="legend-item">
                                    <div
                                        className="legend-color"
                                        style={{ backgroundColor: activeColor.flexible }}
                                    />
                                    <span>{t.parentFlexible(parent.name)}</span>
                                </div>
                                {hasLactancia && (
                                    <div className="legend-item">
                                        <div
                                            className="legend-color"
                                            style={{
                                                backgroundColor: activeColor.lactancia,
                                            }}
                                        />
                                        <span>{t.parentLactancia(parent.name)}</span>
                                    </div>
                                )}
                                {hasCuidado && (
                                    <div className="legend-item">
                                        <div
                                            className="legend-color"
                                            style={{
                                                backgroundColor: activeColor.cuidado,
                                            }}
                                        />
                                        <span>{t.parentChildcare(parent.name)}</span>
                                    </div>
                                )}
                                {hasExtra && (
                                    <div className="legend-item">
                                        <div
                                            className="legend-color"
                                            style={{ backgroundColor: activeColor.extra }}
                                        />
                                        <span>{t.parentExtra(parent.name)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
