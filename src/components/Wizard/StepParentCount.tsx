import { useLanguage } from '../../i18n/LanguageContext';
import { getLeaveAllowance } from '../../utils/leaveLaw';

interface Props {
    value: number;
    onChange: (count: 1 | 2) => void;
    dueDate: string;
}

function totalWeeks(parentCount: 1 | 2, dueDate: string): number {
    const a = getLeaveAllowance({
        parentCount,
        babies: 1,
        disability: false,
        dueDate: dueDate || undefined,
    });
    return a.mandatoryWeeks + a.flexibleWeeks + a.extraUntil8Weeks;
}

export default function StepParentCount({ value, onChange, dueDate }: Props) {
    const { t } = useLanguage();
    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">👨‍👩‍👧</div>
            <h2>{t.parentCountTitle}</h2>
            <div className="toggle-group" role="radiogroup" aria-label={t.parentCountTitle}>
                <button
                    type="button"
                    role="radio"
                    aria-checked={value === 2}
                    className={`toggle-btn ${value === 2 ? 'active' : ''}`}
                    onClick={() => onChange(2)}
                    data-testid="parent-count-btn-2"
                >
                    <span className="toggle-icon" aria-hidden="true">
                        👥
                    </span>
                    <span className="toggle-label">{t.parentCountTwo}</span>
                    <span className="toggle-hint">
                        {t.parentCountTwoDesc(totalWeeks(2, dueDate))}
                    </span>
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={value === 1}
                    className={`toggle-btn ${value === 1 ? 'active' : ''}`}
                    onClick={() => onChange(1)}
                    data-testid="parent-count-btn-1"
                >
                    <span className="toggle-icon" aria-hidden="true">
                        👤
                    </span>
                    <span className="toggle-label">{t.parentCountSingle}</span>
                    <span className="toggle-hint">
                        {t.parentCountSingleDesc(totalWeeks(1, dueDate))}
                    </span>
                </button>
            </div>
        </div>
    );
}
