import { COLOR_PALETTES } from '../../constants';
import type { ColorPaletteId } from '../../types';

interface Props {
    value: number;
    onChange: (index: number) => void;
    parentNames: string[];
    colors: ColorPaletteId[];
}

export default function StepFirstParent({ value, onChange, parentNames, colors }: Props) {
    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">🏁</div>
            <h2>Who stays home first after birth?</h2>
            <p className="step-description">
                In optimized mode both parents take the mandatory 6 weeks together. After that,{' '}
                <strong>one parent stays home and takes their flexible leave right away</strong>,
                while the other goes back to work temporarily and takes their flexible leave later —
                keeping someone home for as long as possible.
            </p>
            <div className="toggle-group">
                {parentNames.map((name, index) => {
                    const activeColor = colors?.[index]
                        ? COLOR_PALETTES[colors[index]]
                        : Object.values(COLOR_PALETTES)[index % 5];

                    const isFirst = value === index;
                    const hint = isFirst
                        ? '🏠 Stays home first — takes flexible leave right after mandatory'
                        : '🏢 Returns to work after mandatory, takes flexible leave later';

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
