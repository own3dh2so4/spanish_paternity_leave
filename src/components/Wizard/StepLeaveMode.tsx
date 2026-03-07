import { LEAVE_MODES } from '../../constants';
import type { LeaveMode } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
    value: LeaveMode;
    onChange: (mode: LeaveMode) => void;
}

export default function StepLeaveMode({ value, onChange }: Props) {
    const { t } = useLanguage();
    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">⚙️</div>
            <h2>{t.leaveModeTitle}</h2>
            <p className="step-description">{t.leaveModeDescription}</p>
            <div className="mode-cards">
                <button
                    type="button"
                    className={`mode-card ${value === LEAVE_MODES.TOGETHER ? 'active' : ''}`}
                    onClick={() => onChange(LEAVE_MODES.TOGETHER)}
                >
                    <div className="mode-card-icon">🤝</div>
                    <h3>{t.modeTogether}</h3>
                    <p>{t.modeTogetherDesc}</p>
                    <div className="mode-card-timeline">
                        <div className="timeline-bar together-bar-1" />
                        <div className="timeline-bar together-bar-2" />
                    </div>
                </button>
                <button
                    type="button"
                    className={`mode-card ${value === LEAVE_MODES.OPTIMIZED ? 'active' : ''}`}
                    onClick={() => onChange(LEAVE_MODES.OPTIMIZED)}
                >
                    <div className="mode-card-icon">📐</div>
                    <h3>{t.modeOptimized}</h3>
                    <p>{t.modeOptimizedDesc}</p>
                    <div className="mode-card-timeline">
                        <div className="timeline-bar optimized-bar-1" />
                        <div className="timeline-bar optimized-bar-2" />
                    </div>
                </button>
            </div>
        </div>
    );
}
