import { useRef } from 'react';
import { COLOR_PALETTES } from '../../constants';
import type { ColorPaletteId } from '../../types';

interface Props {
    parentCount: number;
    names: string[];
    onChangeNames: (names: string[]) => void;
    colors: ColorPaletteId[];
    onChangeColors: (colors: ColorPaletteId[]) => void;
}

export default function StepNames({ parentCount, names, onChangeNames, colors, onChangeColors }: Props) {
    const nameRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleNameChange = (index: number, value: string) => {
        const updated = [...names];
        updated[index] = value;
        onChangeNames(updated);
    };

    const handleColorChange = (index: number, colorId: ColorPaletteId) => {
        const updated = [...colors];
        updated[index] = colorId;
        onChangeColors(updated);
    };

    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">✏️</div>
            <h2>{parentCount === 1 ? "What's your name?" : "What are the parents' names?"}</h2>
            <p className="step-description">
                {parentCount === 1
                    ? 'Enter your name and pick a color for your leave periods.'
                    : 'Enter names for both parents and pick their colors.'}
            </p>
            <div className="names-group">
                {Array.from({ length: parentCount }).map((_, i) => (
                    <div key={i} className="input-group">
                        <label htmlFor={`parent-name-${i}`}>
                            {parentCount === 1 ? 'Your Name' : `Parent ${i + 1}`}
                        </label>
                        <input
                            ref={(el) => {
                                nameRefs.current[i] = el;
                            }}
                            type="text"
                            id={`parent-name-${i}`}
                            value={names[i] || ''}
                            onChange={(e) => handleNameChange(i, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab' && !e.shiftKey && i < parentCount - 1) {
                                    e.preventDefault();
                                    nameRefs.current[i + 1]?.focus();
                                }
                            }}
                            placeholder="Enter name..."
                            className="text-input"
                            autoFocus={i === 0}
                        />
                        <div
                            className="color-picker"
                            style={{ display: 'flex', gap: '8px', marginTop: '12px' }}
                        >
                            {Object.values(COLOR_PALETTES).map((palette) => (
                                <button
                                    key={palette.id}
                                    type="button"
                                    onClick={() => handleColorChange(i, palette.id)}
                                    title={palette.name}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: palette.accent,
                                        border:
                                            colors[i] === palette.id
                                                ? '2px solid white'
                                                : '2px solid transparent',
                                        cursor: 'pointer',
                                        outline:
                                            colors[i] === palette.id
                                                ? `2px solid ${palette.accent}`
                                                : 'none',
                                        outlineOffset: '2px',
                                        transition: 'all 0.2s ease',
                                        padding: 0,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
