import { LEAVE_MODES, LEAVE_TYPES, REGIME_RULES, WORK_HOURS_PER_DAY } from '../constants';
import type { ComputedParentSchedule, ComputedPeriod, LeaveType, WizardInput } from '../types';
import {
    addDays,
    addMonths,
    addWorkingDays,
    countWorkingDays,
    formatDateKey,
    parseLocalDate,
} from './dates';
import {
    getAnticipatedWeeks,
    getGestationLeaveWeeks,
    getLeaveAllowance,
    getRegime,
} from './leaveLaw';

/**
 * One hour per working day between the return to work and the month the right
 * ends, accumulated into full days. Employers differ, so this is an estimate.
 */
export function calculateLactanciaDays(
    returnToWork: Date,
    birthDate: Date,
    untilMonths: number = REGIME_RULES.et.lactanciaMonths,
): number {
    const limit = addMonths(birthDate, untilMonths);
    if (returnToWork >= limit) return 0;
    return Math.floor(countWorkingDays(returnToWork, limit) / WORK_HOURS_PER_DAY);
}

function makePeriod(
    type: LeaveType,
    start: Date,
    end: Date,
    days: number | null = null,
): ComputedPeriod {
    return { type, startDate: formatDateKey(start), endDate: formatDateKey(end), days };
}

function buildParent(
    input: WizardInput,
    parentIndex: number,
    flexibleStartFloor?: Date,
): { schedule: ComputedParentSchedule; returnDate: Date } {
    const birth = parseLocalDate(input.dueDate);
    const regime = getRegime(input, parentIndex);
    const rules = REGIME_RULES[regime];
    const allowance = getLeaveAllowance(input);
    const anticipatedWeeks = getAnticipatedWeeks(input, parentIndex);
    const gestationWeeks = getGestationLeaveWeeks(input, parentIndex);
    const convenioDays = Math.max(0, Math.round(input.convenioDays?.[parentIndex] ?? 0));
    const periods: ComputedPeriod[] = [];

    if (gestationWeeks > 0) {
        periods.push(makePeriod(LEAVE_TYPES.GESTATION, addDays(birth, -7 * gestationWeeks), birth));
    }
    if (anticipatedWeeks > 0) {
        periods.push(
            makePeriod(LEAVE_TYPES.ANTICIPATED, addDays(birth, -7 * anticipatedWeeks), birth),
        );
    }

    const mandatoryEnd = addDays(birth, 7 * allowance.mandatoryWeeks);
    periods.push(makePeriod(LEAVE_TYPES.MANDATORY, birth, mandatoryEnd));

    const flexibleWeeks = allowance.flexibleWeeks - anticipatedWeeks;
    const flexibleStart =
        flexibleStartFloor && flexibleStartFloor > mandatoryEnd ? flexibleStartFloor : mandatoryEnd;
    const flexibleEnd = addDays(flexibleStart, 7 * flexibleWeeks);
    if (flexibleWeeks > 0) {
        periods.push(makePeriod(LEAVE_TYPES.FLEXIBLE, flexibleStart, flexibleEnd));
    }

    let cursor = flexibleEnd;
    if (convenioDays > 0) {
        const convenioEnd = addDays(cursor, convenioDays);
        periods.push(makePeriod(LEAVE_TYPES.CONVENIO, cursor, convenioEnd));
        cursor = convenioEnd;
    }

    if (rules.lactanciaFixedNaturalDays !== null) {
        const lactanciaEnd = addDays(cursor, rules.lactanciaFixedNaturalDays * input.babies);
        periods.push(makePeriod(LEAVE_TYPES.LACTANCIA, cursor, lactanciaEnd, null));
        cursor = lactanciaEnd;
    } else {
        const lactanciaDays = calculateLactanciaDays(flexibleEnd, birth, rules.lactanciaMonths);
        if (lactanciaDays > 0) {
            const lactanciaEnd = addWorkingDays(cursor, lactanciaDays);
            periods.push(makePeriod(LEAVE_TYPES.LACTANCIA, cursor, lactanciaEnd, lactanciaDays));
            cursor = lactanciaEnd;
        }
    }

    const cuidadoEnd = addDays(cursor, 7 * allowance.extraUntil8Weeks);
    periods.push(makePeriod(LEAVE_TYPES.CUIDADO, cursor, cuidadoEnd));

    return {
        schedule: {
            name: input.names[parentIndex],
            colorId: input.colors[parentIndex],
            regime,
            allowance,
            periods,
        },
        returnDate: cuidadoEnd,
    };
}

export function calculateLeaveSchedule(input: WizardInput): ComputedParentSchedule[] {
    const count = input.names.length;

    if (count === 2 && input.leaveMode === LEAVE_MODES.OPTIMIZED) {
        const firstIdx = input.firstParent === 1 ? 1 : 0;
        const secondIdx = firstIdx === 0 ? 1 : 0;
        const first = buildParent(input, firstIdx);
        const second = buildParent(input, secondIdx, first.returnDate);
        const result: ComputedParentSchedule[] = [];
        result[firstIdx] = first.schedule;
        result[secondIdx] = second.schedule;
        return result;
    }

    return Array.from({ length: count }, (_, i) => buildParent(input, i).schedule);
}
