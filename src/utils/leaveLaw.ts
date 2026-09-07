import {
    CHILD_EIGHTH_BIRTHDAY_YEARS,
    CHILD_FIRST_BIRTHDAY_MONTHS,
    EXTENSION_WEEKS,
    EXTRA_WEEKS_UNTIL_8,
    FLEXIBLE_WEEKS,
    LEAVE_TYPES,
    MANDATORY_WEEKS,
    MAX_ANTICIPATED_WEEKS,
    NEW_REGIME_START,
    REGIME_RULES,
} from '../constants';
import type {
    ComputedParentSchedule,
    ComputedPeriod,
    LeaveAllowance,
    Regime,
    WizardInput,
} from '../types';
import { addMonths, addYears, daysBetween, formatDateKey, parseLocalDate } from './dates';

type AllowanceInput = Pick<WizardInput, 'parentCount' | 'babies' | 'disability'>;

export function isSingleParent(input: Pick<WizardInput, 'parentCount'>): boolean {
    return input.parentCount === 1;
}

export function getLeaveAllowance(input: AllowanceInput): LeaveAllowance {
    const family = isSingleParent(input) ? 'single' : 'couple';
    const extraChildren = Math.max(0, input.babies - 1);
    const extensions = extraChildren + (input.disability ? 1 : 0);
    return {
        mandatoryWeeks: MANDATORY_WEEKS,
        flexibleWeeks: FLEXIBLE_WEEKS[family] + extensions * EXTENSION_WEEKS[family],
        extraUntil8Weeks: EXTRA_WEEKS_UNTIL_8[family],
    };
}

export function getRegime(input: Pick<WizardInput, 'regimes'>, parentIndex: number): Regime {
    return input.regimes?.[parentIndex] ?? 'et';
}

export function isBiologicalMother(
    input: Pick<WizardInput, 'biologicalMother'>,
    parentIndex: number,
): boolean {
    return input.biologicalMother === parentIndex;
}

export function getAnticipatedWeeks(
    input: Pick<WizardInput, 'biologicalMother' | 'anticipatedWeeks' | 'regimes'>,
    parentIndex: number,
): number {
    if (!isBiologicalMother(input, parentIndex)) return 0;
    if (!REGIME_RULES[getRegime(input, parentIndex)].anticipationAllowed) return 0;
    return Math.min(MAX_ANTICIPATED_WEEKS, Math.max(0, Math.round(input.anticipatedWeeks)));
}

/** Weeks of paid pre-birth leave (SERMAS: from week 37, or 35 for multiple births). */
export function getGestationLeaveWeeks(
    input: Pick<WizardInput, 'biologicalMother' | 'regimes' | 'babies'>,
    parentIndex: number,
): number {
    if (!isBiologicalMother(input, parentIndex)) return 0;
    const rule = REGIME_RULES[getRegime(input, parentIndex)].gestationLeaveWeeks;
    return input.babies > 1 ? rule.multiple : rule.single;
}

/** Default paid employer days after the leave for a parent under the given regime. */
export function defaultConvenioDays(regime: Regime, isMother: boolean): number {
    return isMother ? REGIME_RULES[regime].motherConvenioDays : 0;
}

export function isFixedPeriod(period: Pick<ComputedPeriod, 'type'>): boolean {
    return (
        period.type === LEAVE_TYPES.MANDATORY ||
        period.type === LEAVE_TYPES.ANTICIPATED ||
        period.type === LEAVE_TYPES.GESTATION
    );
}

export function isBeforeNewRegime(dueDate: string): boolean {
    return dueDate < NEW_REGIME_START;
}

export function firstBirthday(dueDate: string): string {
    return formatDateKey(addMonths(parseLocalDate(dueDate), CHILD_FIRST_BIRTHDAY_MONTHS));
}

export function eighthBirthday(dueDate: string): string {
    return formatDateKey(addYears(parseLocalDate(dueDate), CHILD_EIGHTH_BIRTHDAY_YEARS));
}

export type PeriodWarning = 'afterFirstBirthday' | 'afterEighthBirthday';

function countsAsFlexible(period: ComputedPeriod): boolean {
    return (
        period.type === LEAVE_TYPES.FLEXIBLE ||
        (period.type === LEAVE_TYPES.EXTRA && period.extraPresetKey === 'flexible-extra')
    );
}

/** The last leave day is endDate − 1, so a period is late when endDate > birthday. */
export function getPeriodWarning(period: ComputedPeriod, dueDate: string): PeriodWarning | null {
    if (countsAsFlexible(period) && period.endDate > firstBirthday(dueDate)) {
        return 'afterFirstBirthday';
    }
    if (period.type === LEAVE_TYPES.CUIDADO && period.endDate > eighthBirthday(dueDate)) {
        return 'afterEighthBirthday';
    }
    return null;
}

function periodWeeks(period: ComputedPeriod): number {
    if (period.isExtra && period.durationValue !== undefined) {
        return period.durationUnit === 'weeks'
            ? period.durationValue
            : Math.ceil(period.durationValue / 7);
    }
    return Math.round(
        daysBetween(parseLocalDate(period.startDate), parseLocalDate(period.endDate)) / 7,
    );
}

/** Flexible weeks the parent has not yet placed on the calendar (main + extra + anticipated). */
export function getRemainingFlexWeeks(parent: ComputedParentSchedule): number {
    const used = parent.periods
        .filter((p) => countsAsFlexible(p) || p.type === LEAVE_TYPES.ANTICIPATED)
        .reduce((sum, p) => sum + periodWeeks(p), 0);
    return Math.max(0, parent.allowance.flexibleWeeks - used);
}

/** Statutory ceiling (in weeks) when resizing a period; undefined = no legal cap. */
export function getMaxWeeksFor(
    parent: ComputedParentSchedule,
    period: ComputedPeriod,
): number | undefined {
    if (countsAsFlexible(period)) {
        return getRemainingFlexWeeks(parent) + periodWeeks(period);
    }
    if (period.type === LEAVE_TYPES.CUIDADO) return parent.allowance.extraUntil8Weeks;
    return undefined;
}
