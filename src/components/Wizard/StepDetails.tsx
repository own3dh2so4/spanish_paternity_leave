import {
    MAX_ANTICIPATED_WEEKS,
    MAX_BABIES,
    MAX_CONVENIO_DAYS,
    MAX_VACATION_DAYS,
    REGIMES,
    REGIME_RULES,
} from '../../constants';
import { useLanguage } from '../../i18n/LanguageContext';
import type { ExtraDurationUnit, Regime } from '../../types';
import { defaultConvenioDays, getLeaveAllowance } from '../../utils/leaveLaw';

interface Props {
    parentCount: 1 | 2;
    dueDate: string;
    names: string[];
    babies: number;
    onChangeBabies: (n: number) => void;
    disability: boolean;
    onChangeDisability: (v: boolean) => void;
    biologicalMother: number | null;
    onChangeBiologicalMother: (idx: number | null) => void;
    anticipatedWeeks: number;
    onChangeAnticipatedWeeks: (n: number) => void;
    regimes: Regime[];
    onChangeRegimes: (regimes: Regime[]) => void;
    convenioDays: number[];
    onChangeConvenioDays: (days: number[]) => void;
    useExtraWeeks: boolean[];
    onChangeUseExtraWeeks: (values: boolean[]) => void;
    vacationDays: number[];
    onChangeVacationDays: (days: number[]) => void;
    vacationUnit: ExtraDurationUnit[];
    onChangeVacationUnit: (units: ExtraDurationUnit[]) => void;
}

interface ChipOption<T> {
    value: T;
    label: string;
    testId: string;
}

function Chips<T extends string | number | boolean | null>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: ChipOption<T>[];
    onChange: (v: T) => void;
}) {
    return (
        <div className="chip-group" role="radiogroup" aria-label={label}>
            {options.map((o) => (
                <button
                    key={String(o.value)}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    className={`chip ${value === o.value ? 'active' : ''}`}
                    onClick={() => onChange(o.value)}
                    data-testid={o.testId}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export default function StepDetails({
    parentCount,
    dueDate,
    names,
    babies,
    onChangeBabies,
    disability,
    onChangeDisability,
    biologicalMother,
    onChangeBiologicalMother,
    anticipatedWeeks,
    onChangeAnticipatedWeeks,
    regimes,
    onChangeRegimes,
    convenioDays,
    onChangeConvenioDays,
    useExtraWeeks,
    onChangeUseExtraWeeks,
    vacationDays,
    onChangeVacationDays,
    vacationUnit,
    onChangeVacationUnit,
}: Props) {
    const { t } = useLanguage();
    const allowance = getLeaveAllowance({ parentCount, babies, disability, dueDate });
    const motherIdx =
        biologicalMother !== null && biologicalMother < parentCount ? biologicalMother : null;
    const motherRegime = motherIdx !== null ? (regimes[motherIdx] ?? 'et') : 'et';
    const anticipationAllowed = REGIME_RULES[motherRegime].anticipationAllowed;
    const displayName = (i: number) => names[i] || t.namePlaceholder(i + 1);

    const setRegime = (i: number, regime: Regime) => {
        const nextRegimes = [...regimes];
        nextRegimes[i] = regime;
        onChangeRegimes(nextRegimes);
        const nextDays = [...convenioDays];
        nextDays[i] = defaultConvenioDays(regime, motherIdx === i);
        onChangeConvenioDays(nextDays);
    };

    const setMother = (idx: number | null) => {
        onChangeBiologicalMother(idx);
        const nextDays = names.map((_, i) => defaultConvenioDays(regimes[i] ?? 'et', idx === i));
        onChangeConvenioDays(nextDays);
    };

    const setUseExtraWeeks = (i: number, value: boolean) => {
        const next = [...useExtraWeeks];
        next[i] = value;
        onChangeUseExtraWeeks(next);
    };

    const setVacationDays = (i: number, raw: string) => {
        const n = Number.parseInt(raw, 10);
        const next = [...vacationDays];
        next[i] = Number.isFinite(n) ? Math.min(MAX_VACATION_DAYS, Math.max(0, n)) : 0;
        onChangeVacationDays(next);
    };

    const setVacationUnit = (i: number, unit: ExtraDurationUnit) => {
        const next = [...vacationUnit];
        next[i] = unit;
        onChangeVacationUnit(next);
    };

    const setConvenioDays = (i: number, raw: string) => {
        const n = Number.parseInt(raw, 10);
        const nextDays = [...convenioDays];
        nextDays[i] = Number.isFinite(n) ? Math.min(MAX_CONVENIO_DAYS, Math.max(0, n)) : 0;
        onChangeConvenioDays(nextDays);
    };

    return (
        <div className="wizard-step fade-in">
            <div className="step-icon">🧾</div>
            <h2>{t.detailsTitle}</h2>
            <p className="step-description">{t.detailsDescription}</p>

            <div className="details-grid">
                <fieldset className="details-field">
                    <legend>{t.babiesLabel}</legend>
                    <Chips
                        label={t.babiesLabel}
                        value={babies}
                        onChange={onChangeBabies}
                        options={Array.from({ length: MAX_BABIES }, (_, i) => i + 1).map((n) => ({
                            value: n,
                            label: t.babiesOption(n),
                            testId: `babies-btn-${n}`,
                        }))}
                    />
                </fieldset>

                <fieldset className="details-field">
                    <legend>{t.disabilityLabel}</legend>
                    <Chips
                        label={t.disabilityLabel}
                        value={disability}
                        onChange={onChangeDisability}
                        options={[
                            { value: false, label: t.no, testId: 'disability-btn-no' },
                            { value: true, label: t.yes, testId: 'disability-btn-yes' },
                        ]}
                    />
                    <p className="details-hint">{t.disabilityHint}</p>
                </fieldset>

                <fieldset className="details-field">
                    <legend>{t.motherLabel}</legend>
                    <Chips
                        label={t.motherLabel}
                        value={motherIdx}
                        onChange={setMother}
                        options={[
                            { value: null, label: t.motherNone, testId: 'mother-btn-none' },
                            ...names.map((_, i) => ({
                                value: i,
                                label: displayName(i),
                                testId: `mother-btn-${i}`,
                            })),
                        ]}
                    />
                    <p className="details-hint">{t.motherHint}</p>
                </fieldset>

                {names.map((_, i) => (
                    <fieldset className="details-field" key={i} data-testid={`parent-field-${i}`}>
                        <legend>{displayName(i)}</legend>
                        <p className="details-sublabel">{t.regimeLabel}</p>
                        <Chips
                            label={`${t.regimeLabel} ${displayName(i)}`}
                            value={regimes[i] ?? 'et'}
                            onChange={(r) => setRegime(i, r)}
                            options={REGIMES.map((r) => ({
                                value: r,
                                label: t.regimeOption(r),
                                testId: `regime-btn-${i}-${r}`,
                            }))}
                        />
                        <p className="details-hint">{t.regimeHint(regimes[i] ?? 'et')}</p>
                        <label className="details-inline-field">
                            <span>{t.convenioDaysLabel}</span>
                            <input
                                type="number"
                                min={0}
                                max={MAX_CONVENIO_DAYS}
                                step={1}
                                className="period-edit-input"
                                value={convenioDays[i] ?? 0}
                                onChange={(e) => setConvenioDays(i, e.target.value)}
                                data-testid={`convenio-days-${i}`}
                            />
                        </label>
                        <p className="details-hint">{t.convenioDaysHint}</p>
                        <label className="details-inline-field">
                            <span>{t.vacationDaysLabel}</span>
                            <input
                                type="number"
                                min={0}
                                max={MAX_VACATION_DAYS}
                                step={1}
                                className="period-edit-input"
                                value={vacationDays[i] ?? 0}
                                onChange={(e) => setVacationDays(i, e.target.value)}
                                data-testid={`vacation-days-${i}`}
                            />
                            <select
                                className="period-edit-unit-select"
                                aria-label={`${t.vacationDaysLabel} ${displayName(i)} — ${t.labelDurationUnit}`}
                                value={vacationUnit[i] ?? 'workdays'}
                                onChange={(e) =>
                                    setVacationUnit(i, e.target.value as ExtraDurationUnit)
                                }
                                data-testid={`vacation-unit-${i}`}
                            >
                                <option value="workdays">{t.unitWorkdays}</option>
                                <option value="days">{t.unitDays}</option>
                            </select>
                        </label>
                        <p className="details-hint">{t.vacationDaysHint}</p>

                        <p className="details-sublabel">
                            {t.extraWeeksLabel(allowance.extraUntil8Weeks)}
                        </p>
                        <Chips
                            label={`${t.extraWeeksLabel(allowance.extraUntil8Weeks)} ${displayName(i)}`}
                            value={useExtraWeeks[i] ?? true}
                            onChange={(v) => setUseExtraWeeks(i, v)}
                            options={[
                                { value: true, label: t.yes, testId: `extra-weeks-btn-${i}-yes` },
                                { value: false, label: t.no, testId: `extra-weeks-btn-${i}-no` },
                            ]}
                        />
                        <p className="details-hint">{t.extraWeeksHint}</p>
                    </fieldset>
                ))}

                {motherIdx !== null && (
                    <fieldset className="details-field">
                        <legend>{t.anticipatedLabel}</legend>
                        {anticipationAllowed ? (
                            <>
                                <Chips
                                    label={t.anticipatedLabel}
                                    value={anticipatedWeeks}
                                    onChange={onChangeAnticipatedWeeks}
                                    options={Array.from(
                                        { length: MAX_ANTICIPATED_WEEKS + 1 },
                                        (_, w) => ({
                                            value: w,
                                            label: String(w),
                                            testId: `anticipated-btn-${w}`,
                                        }),
                                    )}
                                />
                                <p className="details-hint">{t.anticipatedHint}</p>
                            </>
                        ) : (
                            <p className="details-hint" data-testid="anticipated-unavailable">
                                {t.anticipatedNotAvailable}
                            </p>
                        )}
                    </fieldset>
                )}
            </div>

            <p className="details-summary" data-testid="allowance-summary">
                {t.allowanceSummary(
                    allowance.mandatoryWeeks,
                    allowance.flexibleWeeks,
                    allowance.extraUntil8Weeks,
                )}
            </p>
        </div>
    );
}
