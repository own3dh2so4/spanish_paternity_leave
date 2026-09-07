import './Wizard.css';

interface Props {
    currentStep: number;
    steps: { id: string; label: string }[];
}

export default function ProgressBar({ currentStep, steps }: Props) {
    return (
        <ol className="progress-bar">
            {steps.map((s, index) => (
                <li
                    key={s.id}
                    aria-current={index === currentStep ? 'step' : undefined}
                    className={`progress-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                >
                    <div className="step-indicator" aria-hidden="true">
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
                    <span className="step-label">{s.label}</span>
                    {index < steps.length - 1 && (
                        <div className="step-connector" aria-hidden="true" />
                    )}
                </li>
            ))}
        </ol>
    );
}
