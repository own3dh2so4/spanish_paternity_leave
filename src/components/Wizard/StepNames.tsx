import { COLOR_PALETTES } from '../../constants';
import type { ColorPaletteId } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
    parentCount: number;
    names: string[];
    onChangeNames: (names: string[]) => void;
    colors: ColorPaletteId[];
    onChangeColors: (colors: ColorPaletteId[]) => void;
}

export default function StepNames({
    parentCount,
    names,
    onChangeNames,
    colors,
    onChangeColors,
}: Props) {
    const { t } = useLanguage();

    const handleNameChange = (index: number, value: string) => {
        const updated = [...names];
        updated[index] = value;
        onChangeNames(updated);
    };

    const handleColorChange = (index: number, colorId: ColorPaletteId) => {
        const updated = [...colors];
        const takenBy = updated.findIndex((c, i) => c === colorId && i !== index);
        if (takenBy !== -1) updated[takenBy] = updated[index];
        updated[index] = colorId;
        onChangeColors(updated);
    };

    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">✏️</div>
            <h2>{t.namesTitle}</h2>
            <p className="step-description">{t.namesDescription}</p>
            <div className="names-group">
                {Array.from({ length: parentCount }).map((_, i) => (
                    <div key={i} className="input-group">
                        <label htmlFor={`parent-name-${i}`}>{t.namePlaceholder(i + 1)}</label>
                        <input
                            type="text"
                            id={`parent-name-${i}`}
                            value={names[i] || ''}
                            maxLength={40}
                            onChange={(e) => handleNameChange(i, e.target.value)}
                            placeholder={t.namePlaceholder(i + 1)}
                            className="text-input"
                            autoFocus={i === 0}
                            data-testid={`parent-name-input-${i}`}
                        />
                        <div
                            className="color-picker"
                            role="radiogroup"
                            aria-label={t.colorOption(names[i] || t.namePlaceholder(i + 1))}
                        >
                            {Object.values(COLOR_PALETTES).map((palette) => {
                                const selected = colors[i] === palette.id;
                                return (
                                    <button
                                        key={palette.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        aria-label={palette.name}
                                        title={palette.name}
                                        className={`color-swatch ${selected ? 'selected' : ''}`}
                                        onClick={() => handleColorChange(i, palette.id)}
                                        style={{
                                            background: palette.accent,
                                            outlineColor: selected ? palette.accent : 'transparent',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
