import { useState } from 'react';
import ProgressBar from './ProgressBar';
import StepDueDate from './StepDueDate';
import StepParentCount from './StepParentCount';
import StepNames from './StepNames';
import StepLeaveMode from './StepLeaveMode';
import StepFirstParent from './StepFirstParent';
import StepCuidado from './StepCuidado';
import { WIZARD_STEPS, LEAVE_MODES } from '../../constants';
import type { ColorPaletteId, LeaveMode, WizardData } from '../../types';
import './Wizard.css';

interface Props {
    onComplete: (data: WizardData) => void;
    initialData: WizardData | null;
}

export default function Wizard({ onComplete, initialData }: Props) {
    const [step, setStep] = useState(0);
    const [dueDate, setDueDate] = useState(initialData?.dueDate ?? '');
    const [parentCount, setParentCount] = useState<1 | 2>(initialData?.parentCount ?? 1);
    const [names, setNames] = useState<string[]>(initialData?.names ?? ['', '']);
    const [colors, setColors] = useState<ColorPaletteId[]>(
        initialData?.colors ?? ['indigo', 'pink'],
    );
    const [leaveMode, setLeaveMode] = useState<LeaveMode>(
        initialData?.leaveMode ?? LEAVE_MODES.TOGETHER,
    );
    const [firstParent, setFirstParent] = useState(initialData?.firstParent ?? 0);
    const [cuidadoWeeks, setCuidadoWeeks] = useState<(number | null)[]>(
        initialData?.cuidadoWeeks ?? [null, null],
    );

    const getVisibleSteps = () => {
        if (parentCount === 1) {
            return WIZARD_STEPS.filter((s) => s.id !== 'leaveMode' && s.id !== 'firstParent');
        }
        if (leaveMode === LEAVE_MODES.TOGETHER) {
            return WIZARD_STEPS.filter((s) => s.id !== 'firstParent');
        }
        return WIZARD_STEPS;
    };

    const visibleSteps = getVisibleSteps();
    const totalSteps = visibleSteps.length;

    const canProceed = (): boolean => {
        const currentStepId = visibleSteps[step]?.id;
        switch (currentStepId) {
            case 'dueDate':
                return dueDate !== '';
            case 'parentCount':
                return parentCount === 1 || parentCount === 2;
            case 'names':
                return names.slice(0, parentCount).every((n) => n.trim() !== '');
            case 'leaveMode':
                return true; // leaveMode is always a valid value (typed as LeaveMode)
            case 'firstParent':
                return firstParent === 0 || firstParent === 1;
            case 'cuidado':
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleSubmit = () => {
        const data: WizardData = {
            dueDate,
            parentCount,
            names: names.slice(0, parentCount),
            colors: colors.slice(0, parentCount),
            leaveMode: parentCount === 2 ? leaveMode : LEAVE_MODES.TOGETHER,
            firstParent: leaveMode === LEAVE_MODES.OPTIMIZED ? firstParent : 0,
            cuidadoWeeks: cuidadoWeeks.slice(0, parentCount),
        };
        onComplete(data);
    };

    const renderStep = () => {
        const currentStepId = visibleSteps[step]?.id;
        switch (currentStepId) {
            case 'dueDate':
                return <StepDueDate value={dueDate} onChange={setDueDate} />;
            case 'parentCount':
                return <StepParentCount value={parentCount} onChange={setParentCount} />;
            case 'names':
                return (
                    <StepNames
                        parentCount={parentCount}
                        names={names}
                        onChangeNames={setNames}
                        colors={colors}
                        onChangeColors={setColors}
                    />
                );
            case 'leaveMode':
                return <StepLeaveMode value={leaveMode} onChange={setLeaveMode} />;
            case 'firstParent':
                return (
                    <StepFirstParent
                        value={firstParent}
                        onChange={setFirstParent}
                        parentNames={names.slice(0, parentCount)}
                        colors={colors}
                    />
                );
            case 'cuidado':
                return (
                    <StepCuidado
                        parentCount={parentCount}
                        names={names.slice(0, parentCount)}
                        colors={colors.slice(0, parentCount)}
                        values={cuidadoWeeks.slice(0, parentCount)}
                        onChange={setCuidadoWeeks}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="wizard-container">
            <div className="wizard-card">
                <div className="wizard-header">
                    <h1>🇪🇸 Paternity Leave Planner</h1>
                    <p className="wizard-subtitle">Plan your Spanish paternity/maternity leave</p>
                </div>

                <ProgressBar
                    currentStep={step}
                    totalSteps={totalSteps}
                    stepLabels={visibleSteps.map((s) => s.label)}
                />

                <div className="wizard-body">{renderStep()}</div>

                <div className="wizard-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleBack}
                        disabled={step === 0}
                    >
                        ← Back
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleNext}
                        disabled={!canProceed()}
                    >
                        {step === totalSteps - 1 ? 'Calculate →' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
