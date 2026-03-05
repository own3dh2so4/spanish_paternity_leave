import './Wizard.css';

interface Props {
    currentStep: number;
    totalSteps: number;
    stepLabels: string[];
}

export default function ProgressBar({ currentStep, totalSteps, stepLabels }: Props) {
    return (
        <div className="progress-bar">
            {stepLabels.map((label, index) => (
                <div
                    key={label}
                    className={`progress-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                >
                    <div className="step-indicator">
                        {index < currentStep ? (
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <span>{index + 1}</span>
                        )}
                    </div>
                    <span className="step-label">{label}</span>
                    {index < totalSteps - 1 && <div className="step-connector" />}
                </div>
            ))}
        </div>
    );
}
