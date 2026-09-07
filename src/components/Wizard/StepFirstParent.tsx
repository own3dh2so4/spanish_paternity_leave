import { paletteFor } from '../../constants';
import type { ColorPaletteId } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
    value: number;
    onChange: (index: number) => void;
    parentNames: string[];
    colors: ColorPaletteId[];
}

export default function StepFirstParent({ value, onChange, parentNames, colors }: Props) {
    const { t } = useLanguage();
    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">🏁</div>
            <h2>{t.firstParentTitle}</h2>
            <p className="step-description">{t.firstParentDescription}</p>
            <div className="toggle-group" role="radiogroup" aria-label={t.firstParentTitle}>
                {parentNames.map((name, index) => {
                    const palette = paletteFor(colors[index], index);
                    const isFirst = value === index;
                    return (
                        <button
                            key={index}
                            type="button"
                            role="radio"
                            aria-checked={isFirst}
                            className={`toggle-btn ${isFirst ? 'active' : ''}`}
                            onClick={() => onChange(index)}
                            style={isFirst ? { borderColor: palette.accent } : {}}
                            data-testid={`first-parent-btn-${index}`}
                        >
                            <div
                                className="toggle-avatar"
                                style={{ background: palette.gradient }}
                                aria-hidden="true"
                            >
                                {(name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="toggle-label">{name}</span>
                            <span className="toggle-hint">
                                {isFirst ? t.hintFirstParent : t.hintSecondParent}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
