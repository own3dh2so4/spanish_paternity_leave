import { useState } from 'react';
import ProgressBar from './ProgressBar';
import StepDueDate from './StepDueDate';
import StepParentCount from './StepParentCount';
import StepNames from './StepNames';
import StepDetails from './StepDetails';
import StepLeaveMode from './StepLeaveMode';
import StepFirstParent from './StepFirstParent';
import { LEAVE_MODES, WIZARD_DATA_VERSION } from '../../constants';
import type { ColorPaletteId, LeaveMode, Regime, WizardData, WizardInput } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import HeaderControls from '../HeaderControls';
import './Wizard.css';

interface Props {
    onComplete: (data: WizardInput) => void;
    initialData: WizardData | null;
    invalidShareLink?: boolean;
}

type StepId = 'dueDate' | 'parentCount' | 'names' | 'details' | 'leaveMode' | 'firstParent';

export default function Wizard({ onComplete, initialData, invalidShareLink = false }: Props) {
    const { t, lang, setLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    const [step, setStep] = useState(0);
    const [dueDate, setDueDate] = useState(initialData?.dueDate ?? '');
    const [parentCount, setParentCount] = useState<1 | 2>(initialData?.parentCount ?? 2);
    const [names, setNames] = useState<string[]>(() => padTo2(initialData?.names ?? [], ''));
    const [colors, setColors] = useState<ColorPaletteId[]>(
        initialData?.colors && initialData.colors.length === 2
            ? initialData.colors
            : [
                  initialData?.colors?.[0] ?? 'indigo',
                  initialData?.colors?.[0] === 'pink' ? 'indigo' : 'pink',
              ],
    );
    const [leaveMode, setLeaveMode] = useState<LeaveMode>(
        initialData?.leaveMode ?? LEAVE_MODES.TOGETHER,
    );
    const [chosenFirstParent, setChosenFirstParent] = useState<number | null>(
        initialData?.leaveMode === LEAVE_MODES.OPTIMIZED ? initialData.firstParent : null,
    );
    const [babies, setBabies] = useState(initialData?.babies ?? 1);
    const [disability, setDisability] = useState(initialData?.disability ?? false);
    const [biologicalMother, setBiologicalMother] = useState<number | null>(
        initialData?.biologicalMother ?? null,
    );
    const [anticipatedWeeks, setAnticipatedWeeks] = useState(initialData?.anticipatedWeeks ?? 0);
    const [regimes, setRegimes] = useState<Regime[]>(() =>
        padTo2(initialData?.regimes ?? [], 'et'),
    );
    const [convenioDays, setConvenioDays] = useState<number[]>(() =>
        padTo2(initialData?.convenioDays ?? [], 0),
    );
    const [useExtraWeeks, setUseExtraWeeks] = useState<boolean[]>(() =>
        padTo2(initialData?.useExtraWeeks ?? [], true),
    );

    const motherIndex =
        biologicalMother !== null && biologicalMother < parentCount ? biologicalMother : null;
    const firstParent = chosenFirstParent ?? motherIndex ?? 0;

    const allSteps: { id: StepId; label: string }[] = [
        { id: 'dueDate', label: t.stepDueDate },
        { id: 'parentCount', label: t.stepParents },
        { id: 'names', label: t.stepNames },
        { id: 'details', label: t.stepDetails },
        { id: 'leaveMode', label: t.stepLeaveMode },
        { id: 'firstParent', label: t.stepWhoStarts },
    ];

    const visibleSteps = allSteps.filter((s) => {
        if (s.id === 'leaveMode') return parentCount === 2;
        if (s.id === 'firstParent') return parentCount === 2 && leaveMode === LEAVE_MODES.OPTIMIZED;
        return true;
    });
    const totalSteps = visibleSteps.length;
    const currentStepId = visibleSteps[Math.min(step, totalSteps - 1)]?.id;

    const canProceed = (): boolean => {
        switch (currentStepId) {
            case 'dueDate':
                return dueDate !== '';
            case 'names':
                return names.slice(0, parentCount).every((n) => n.trim() !== '');
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (step < totalSteps - 1) setStep(step + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleSubmit = () => {
        const effectiveMode = parentCount === 2 ? leaveMode : LEAVE_MODES.TOGETHER;
        const mother = motherIndex;
        onComplete({
            version: WIZARD_DATA_VERSION,
            dueDate,
            parentCount,
            names: names.slice(0, parentCount).map((n) => n.trim()),
            colors: colors.slice(0, parentCount),
            regimes: regimes.slice(0, parentCount),
            convenioDays: convenioDays.slice(0, parentCount).map((d) => Math.max(0, Math.round(d))),
            useExtraWeeks: useExtraWeeks.slice(0, parentCount),
            leaveMode: effectiveMode,
            firstParent: effectiveMode === LEAVE_MODES.OPTIMIZED ? firstParent : 0,
            babies,
            disability,
            biologicalMother: mother,
            anticipatedWeeks: mother === null ? 0 : anticipatedWeeks,
        });
    };

    const renderStep = () => {
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
            case 'details':
                return (
                    <StepDetails
                        parentCount={parentCount}
                        names={names.slice(0, parentCount)}
                        babies={babies}
                        onChangeBabies={setBabies}
                        disability={disability}
                        onChangeDisability={setDisability}
                        biologicalMother={biologicalMother}
                        onChangeBiologicalMother={setBiologicalMother}
                        anticipatedWeeks={anticipatedWeeks}
                        onChangeAnticipatedWeeks={setAnticipatedWeeks}
                        regimes={regimes.slice(0, parentCount)}
                        onChangeRegimes={(next) => setRegimes(padTo2(next, 'et'))}
                        convenioDays={convenioDays.slice(0, parentCount)}
                        onChangeConvenioDays={(next) => setConvenioDays(padTo2(next, 0))}
                        useExtraWeeks={useExtraWeeks.slice(0, parentCount)}
                        onChangeUseExtraWeeks={(next) => setUseExtraWeeks(padTo2(next, true))}
                    />
                );
            case 'leaveMode':
                return <StepLeaveMode value={leaveMode} onChange={setLeaveMode} />;
            case 'firstParent':
                return (
                    <StepFirstParent
                        value={firstParent}
                        onChange={setChosenFirstParent}
                        parentNames={names.slice(0, parentCount)}
                        colors={colors}
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
                    <HeaderControls
                        lang={lang}
                        theme={theme}
                        t={t}
                        onToggleLang={() => setLang(lang === 'en' ? 'es' : 'en')}
                        onToggleTheme={toggleTheme}
                    />
                    <h1>{t.wizardTitle}</h1>
                    <p className="wizard-subtitle">{t.wizardSubtitle}</p>
                </div>

                {invalidShareLink && (
                    <p className="wizard-notice wizard-notice--error" role="alert">
                        {t.invalidShareLink}
                    </p>
                )}
                {initialData && (
                    <p className="wizard-notice" role="status">
                        {t.editWarning}
                    </p>
                )}

                <ProgressBar currentStep={step} steps={visibleSteps} />

                <div className="wizard-body">{renderStep()}</div>

                <div className="wizard-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleBack}
                        disabled={step === 0}
                        data-testid="wizard-back-btn"
                    >
                        {t.back}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleNext}
                        disabled={!canProceed()}
                        data-testid="wizard-next-btn"
                    >
                        {step === totalSteps - 1 ? t.calculate : t.next}
                    </button>
                </div>
            </div>
        </div>
    );
}

function padTo2<T>(arr: T[], fill: T): T[] {
    return [arr[0] ?? fill, arr[1] ?? fill];
}
