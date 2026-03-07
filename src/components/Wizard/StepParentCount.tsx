import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
    value: number;
    onChange: (count: 1 | 2) => void;
}

export default function StepParentCount({ value, onChange }: Props) {
    const { t } = useLanguage();
    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">👨‍👩‍👧</div>
            <h2>{t.parentCountTitle}</h2>
            <div className="toggle-group">
                <button
                    type="button"
                    className={`toggle-btn ${value === 1 ? 'active' : ''}`}
                    onClick={() => onChange(1)}
                >
                    <span className="toggle-icon">👤</span>
                    <span className="toggle-label">{t.parentCountOne}</span>
                </button>
                <button
                    type="button"
                    className={`toggle-btn ${value === 2 ? 'active' : ''}`}
                    onClick={() => onChange(2)}
                >
                    <span className="toggle-icon">👥</span>
                    <span className="toggle-label">{t.parentCountTwo}</span>
                </button>
            </div>
        </div>
    );
}
