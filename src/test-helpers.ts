import type { ComputedParentSchedule, ComputedPeriod, LeaveType } from './types';

/**
 * Narrowing accessors for tests. A fixture that does not hold what the test
 * asks for is a broken test, so these throw a named error instead of pushing a
 * non-null assertion to every call site.
 */
export function at<T>(items: readonly T[], index: number, what = 'item'): T {
    const item = items[index];
    if (item === undefined)
        throw new Error(`No ${what} at index ${index} (length ${items.length})`);
    return item;
}

export function parentAt(
    schedule: readonly ComputedParentSchedule[],
    index: number,
): ComputedParentSchedule {
    return at(schedule, index, 'parent');
}

export function periodOf(parent: ComputedParentSchedule, type: LeaveType): ComputedPeriod {
    const period = parent.periods.find((p) => p.type === type);
    if (!period) throw new Error(`Parent "${parent.name}" has no ${type} period`);
    return period;
}

export function extraOf(parent: ComputedParentSchedule): ComputedPeriod {
    const extra = parent.periods.find((p) => p.isExtra);
    if (!extra) throw new Error(`Parent "${parent.name}" has no extra period`);
    return extra;
}

export function lastOf<T>(items: readonly T[], what = 'item'): T {
    return at(items, items.length - 1, what);
}

/** Default for a destructuring that must not come up empty: `const [x = missing('x')] = xs`. */
export function missing(what = 'value'): never {
    throw new Error(`Expected a ${what}`);
}
