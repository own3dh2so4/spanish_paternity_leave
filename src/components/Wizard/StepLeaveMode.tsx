import { LEAVE_MODES } from '../../constants';
import type { LeaveMode } from '../../types';

interface Props {
    value: LeaveMode;
    onChange: (mode: LeaveMode) => void;
}

export default function StepLeaveMode({ value, onChange }: Props) {
    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">⚙️</div>
            <h2>How do you want to organize the leave?</h2>
            <p className="step-description">
                Choose whether both parents take leave at the same time, or stagger it to maximize
                total coverage.
            </p>
            <div className="mode-cards">
                <button
                    type="button"
                    className={`mode-card ${value === LEAVE_MODES.TOGETHER ? 'active' : ''}`}
                    onClick={() => onChange(LEAVE_MODES.TOGETHER)}
                >
                    <div className="mode-card-icon">🤝</div>
                    <h3>Together</h3>
                    <p>
                        Both parents take all leave simultaneously. You&apos;ll both be home at the
                        same time but return to work sooner.
                    </p>
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
                    <h3>Optimized</h3>
                    <p>
                        Stagger the flexible leave so one parent is always home. Maximizes total
                        time with the baby.
                    </p>
                    <div className="mode-card-timeline">
                        <div className="timeline-bar optimized-bar-1" />
                        <div className="timeline-bar optimized-bar-2" />
                    </div>
                </button>
            </div>
        </div>
    );
}
