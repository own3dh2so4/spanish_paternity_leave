import { COLOR_PALETTES } from '../../constants';
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
            <div className="toggle-group">
                {parentNames.map((name, index) => {
                    const activeColor = colors?.[index]
                        ? COLOR_PALETTES[colors[index]]
                        : Object.values(COLOR_PALETTES)[index % 5];

                    const isFirst = value === index;
                    const hint = isFirst
                        ? t.hintFirstParent
                        : t.hintSecondParent;

                    return (
                        <button
                            key={index}
                            type="button"
                            className={`toggle-btn ${isFirst ? 'active' : ''}`}
                            onClick={() => onChange(index)}
                            style={isFirst ? { borderColor: activeColor.accent } : {}}
                        >
                            <div
                                className="toggle-avatar"
                                style={{ background: activeColor.gradient }}
                            >
                                {name.charAt(0).toUpperCase()}
                            </div>
                            <span className="toggle-label">{name}</span>
                            <span className="toggle-hint">{hint}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
