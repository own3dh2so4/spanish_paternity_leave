import {
    DEFAULT_PALETTE_ID,
    LEAVE_MODES,
    LEAVE_TYPES,
    REGIME_RULES,
    WORK_HOURS_PER_DAY,
} from '../constants';
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
    usesExtraWeeks,
} from './leaveLaw';

/**
 * One hour per working day (× babies for multiple births, art. 37.4 ET) between
 * the return to work and the month the right ends, accumulated into full days.
 * Employers differ, so this is an estimate.
 */
export function calculateLactanciaDays(
    returnToWork: Date,
    birthDate: Date,
    untilMonths: number = REGIME_RULES.et.lactanciaMonths,
    babies: number = 1,
): number {
    const limit = addMonths(birthDate, untilMonths);
    if (returnToWork >= limit) return 0;
    const hoursPerDay = Math.max(1, Math.round(babies));
    return Math.floor((countWorkingDays(returnToWork, limit) * hoursPerDay) / WORK_HOURS_PER_DAY);
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
    const convenioDays = Math.max(0, Math.round(input.convenioDays?.[parentIndex] ?? 0));
    const periods: ComputedPeriod[] = [];
    const extraWeeksOnly = allowance.mandatoryWeeks === 0 && allowance.flexibleWeeks === 0;

    const pushLactancia = (from: Date): Date => {
        if (rules.lactanciaFixedNaturalDays !== null) {
            const end = addDays(from, rules.lactanciaFixedNaturalDays * input.babies);
            periods.push(makePeriod(LEAVE_TYPES.LACTANCIA, from, end, null));
            return end;
        }
        const lactanciaDays = calculateLactanciaDays(
            from,
            birth,
            rules.lactanciaMonths,
            input.babies,
        );
        if (lactanciaDays === 0) return from;
        const end = addWorkingDays(from, lactanciaDays);
        periods.push(makePeriod(LEAVE_TYPES.LACTANCIA, from, end, lactanciaDays));
        return end;
    };

    let cursor = birth;

    if (!extraWeeksOnly) {
        const anticipatedWeeks = getAnticipatedWeeks(input, parentIndex);
        const gestationWeeks = getGestationLeaveWeeks(input, parentIndex);

        if (gestationWeeks > 0) {
            periods.push(
                makePeriod(LEAVE_TYPES.GESTATION, addDays(birth, -7 * gestationWeeks), birth),
            );
        }
        if (anticipatedWeeks > 0) {
            periods.push(
                makePeriod(LEAVE_TYPES.ANTICIPATED, addDays(birth, -7 * anticipatedWeeks), birth),
            );
        }

        const mandatoryEnd = addDays(birth, 7 * allowance.mandatoryWeeks);
        periods.push(makePeriod(LEAVE_TYPES.MANDATORY, birth, mandatoryEnd));

        const flexibleWeeks = Math.max(0, allowance.flexibleWeeks - anticipatedWeeks);
        const handover =
            flexibleStartFloor && flexibleStartFloor > mandatoryEnd
                ? flexibleStartFloor
                : mandatoryEnd;

        /**
         * The staggered parent whose block waits keeps working until the other one
         * finishes everything, and takes over starting with the lactancia. Accruing
         * from the handover instead of from after their flexible weeks is more days,
         * and it keeps the two of them from being off at the same time.
         */
        const lactanciaOnHandover = handover > mandatoryEnd;

        cursor = handover;
        if (lactanciaOnHandover) cursor = pushLactancia(cursor);

        const flexibleStart = cursor;
        const flexibleEnd = addDays(flexibleStart, 7 * flexibleWeeks);
        if (flexibleWeeks > 0) {
            periods.push(makePeriod(LEAVE_TYPES.FLEXIBLE, flexibleStart, flexibleEnd));
        }

        cursor = flexibleEnd;
        if (convenioDays > 0) {
            const convenioEnd = addDays(cursor, convenioDays);
            periods.push(makePeriod(LEAVE_TYPES.CONVENIO, cursor, convenioEnd));
            cursor = convenioEnd;
        }

        if (!lactanciaOnHandover) cursor = pushLactancia(cursor);
    }

    if (usesExtraWeeks(input, parentIndex) && allowance.extraUntil8Weeks > 0) {
        const cuidadoEnd = addDays(cursor, 7 * allowance.extraUntil8Weeks);
        periods.push(makePeriod(LEAVE_TYPES.CUIDADO, cursor, cuidadoEnd));
        cursor = cuidadoEnd;
    }

    const vacationDays = Math.max(0, Math.round(input.vacationDays?.[parentIndex] ?? 0));
    if (vacationDays > 0) {
        const inWorkdays = (input.vacationUnit?.[parentIndex] ?? 'workdays') === 'workdays';
        const vacationEnd = inWorkdays
            ? addWorkingDays(cursor, vacationDays)
            : addDays(cursor, vacationDays);
        periods.push({
            type: LEAVE_TYPES.EXTRA,
            startDate: formatDateKey(cursor),
            endDate: formatDateKey(vacationEnd),
            days: inWorkdays ? vacationDays : null,
            isExtra: true,
            extraId: `vacation-${parentIndex}`,
            extraPresetKey: 'vacation',
            durationValue: vacationDays,
            durationUnit: inWorkdays ? 'workdays' : 'days',
        });
        cursor = vacationEnd;
    }

    return {
        schedule: {
            name: input.names[parentIndex] ?? '',
            colorId: input.colors[parentIndex] ?? DEFAULT_PALETTE_ID,
            regime,
            allowance,
            periods,
        },
        returnDate: cursor,
    };
}

export function calculateLeaveSchedule(input: WizardInput): ComputedParentSchedule[] {
    const count = input.parentCount;

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
