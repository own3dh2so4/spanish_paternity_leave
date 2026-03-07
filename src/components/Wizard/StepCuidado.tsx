import { COLOR_PALETTES, CUIDADO_TOTAL_WEEKS, CUIDADO_PAID_WEEKS } from '../../constants';
import type { ColorPaletteId } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
    parentCount: number;
    names: string[];
    colors: ColorPaletteId[];
    values: (number | null)[];
    onChange: (values: (number | null)[]) => void;
}

export default function StepCuidado({ parentCount, names, colors, values, onChange }: Props) {
    const { t } = useLanguage();

    const handleToggle = (i: number, active: boolean) => {
        const updated = [...values];
        updated[i] = active ? CUIDADO_PAID_WEEKS : null;
        onChange(updated);
    };

    const handleWeeks = (i: number, weeks: number) => {
        const updated = [...values];
        updated[i] = weeks;
        onChange(updated);
    };

    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">🧒</div>
            <h2>{t.cuidadoTitle}</h2>
            <p className="step-description">{t.cuidadoDescription}</p>

            <div className="cuidado-info-box">
                <div className="cuidado-info-row">
                    <span className="cuidado-paid-badge">{CUIDADO_PAID_WEEKS}w paid</span>
                    <span>{t.cuidadoWeeksHint(CUIDADO_PAID_WEEKS)}</span>
                </div>
                <div className="cuidado-info-row">
                    <span className="cuidado-unpaid-badge">
                        +{CUIDADO_TOTAL_WEEKS - CUIDADO_PAID_WEEKS}w unpaid
                    </span>
                    <span>{t.cuidadoMax(CUIDADO_TOTAL_WEEKS)}</span>
                </div>
            </div>

            <div className="cuidado-parent-cards">
                {Array.from({ length: parentCount }).map((_, i) => {
                    const isActive = values[i] !== null;
                    const weeks = values[i] ?? CUIDADO_PAID_WEEKS;
                    const accent = COLOR_PALETTES[colors[i]]?.accent ?? '#818CF8';

                    return (
                        <div
                            key={i}
                            className={`cuidado-parent-card ${isActive ? 'active' : ''}`}
                            style={isActive ? { borderColor: `${accent}60` } : undefined}
                        >
                            <div className="cuidado-toggle-row">
                                <span className="cuidado-parent-name" style={{ color: accent }}>
                                    {names[i] || t.namePlaceholder(i + 1)}
                                </span>
                                <button
                                    type="button"
                                    className={`cuidado-toggle ${isActive ? 'on' : 'off'}`}
                                    onClick={() => handleToggle(i, !isActive)}
                                >
                                    {isActive ? 'Yes' : 'No'}
                                </button>
                            </div>

                            {isActive && (
                                <div className="cuidado-weeks-section">
                                    <p className="cuidado-weeks-label">{t.cuidadoWeeks}</p>
                                    <div className="cuidado-week-picker">
                                        {Array.from({ length: CUIDADO_TOTAL_WEEKS }, (_, w) => w + 1).map(
                                            (w) => (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    className={`cuidado-week-btn ${w <= CUIDADO_PAID_WEEKS ? 'paid' : 'unpaid'} ${weeks === w ? 'selected' : ''}`}
                                                    onClick={() => handleWeeks(i, w)}
                                                    title={
                                                        w <= CUIDADO_PAID_WEEKS
                                                            ? `Week ${w} – paid`
                                                            : `Week ${w} – unpaid`
                                                    }
                                                >
                                                    {w}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                    <p className="cuidado-breakdown">
                                        {weeks <= CUIDADO_PAID_WEEKS
                                            ? `${weeks} week${weeks !== 1 ? 's' : ''} — fully paid`
                                            : `${CUIDADO_PAID_WEEKS} weeks paid + ${weeks - CUIDADO_PAID_WEEKS} week${weeks - CUIDADO_PAID_WEEKS !== 1 ? 's' : ''} unpaid`}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
