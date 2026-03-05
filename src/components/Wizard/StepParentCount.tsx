interface Props {
    value: number;
    onChange: (count: 1 | 2) => void;
}

export default function StepParentCount({ value, onChange }: Props) {
    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">👨‍👩‍👧</div>
            <h2>How many parents will take leave?</h2>
            <p className="step-description">
                Select whether one or both parents will participate in the simulation.
            </p>
            <div className="toggle-group">
                <button
                    type="button"
                    className={`toggle-btn ${value === 1 ? 'active' : ''}`}
                    onClick={() => onChange(1)}
                >
                    <span className="toggle-icon">👤</span>
                    <span className="toggle-label">One Parent</span>
                </button>
                <button
                    type="button"
                    className={`toggle-btn ${value === 2 ? 'active' : ''}`}
                    onClick={() => onChange(2)}
                >
                    <span className="toggle-icon">👥</span>
                    <span className="toggle-label">Two Parents</span>
                </button>
            </div>
        </div>
    );
}
