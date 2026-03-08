export type LeaveMode = 'together' | 'optimized';
export type LeaveType = 'mandatory' | 'flexible' | 'lactancia' | 'cuidado' | 'extra';
export type ColorPaletteId = 'indigo' | 'pink' | 'teal' | 'amber' | 'rose';
export type EditUnit = 'days' | 'weeks' | 'months';

/** Color tokens for a single parent palette. Indexed by LeaveType for convenience. */
export interface ColorPalette extends Record<LeaveType, string> {
    id: ColorPaletteId;
    name: string;
    gradient: string;
    accent: string;
}

export interface LeavePeriod {
    type: LeaveType;
    startDate: Date;
    endDate: Date;
    parentIndex: number;
    parentName: string;
    days: number | null;
}

export interface ParentSchedule {
    name: string;
    periods: LeavePeriod[];
    returnDate: Date;
}

export interface ScheduleResult {
    parents: ParentSchedule[];
    calendarStart: Date;
    calendarEnd: Date;
}

export interface LactanciaResult {
    days: number;
    startDate: Date;
    endDate: Date;
}

export interface DateMapEntry {
    type: LeaveType;
    parentIndex: number;
    parentName: string;
    /** Populated for 'extra' type entries — stores the user-defined item name. */
    customName?: string;
}

/** A user-added planning item (vacation, unpaid leave, etc.) for a specific parent. */
export interface ExtraLeaveItem {
    id: string;
    name: string;
    /** Raw value as entered by the user. */
    durationValue: number;
    /** Unit of the raw value. Stored so we can display it back in the same unit. */
    durationUnit: 'days' | 'weeks';
    /**
     * Optional ISO date (YYYY-MM-DD) to override the auto-cascaded start date.
     * Only applied when it falls after the previous period's end (no overlap).
     */
    startDate?: string;
    /**
     * The preset key used when this item was created (e.g. 'vacation', 'flexible-extra').
     * Used to identify periods that count against a leave-type quota.
     */
    presetKey?: string;
}

/** ISO date string → leave entries for that day */
export type DateMap = Record<string, DateMapEntry[]>;

export interface CustomDuration {
    value: number;
    unit: EditUnit;
}

/** A period's custom duration can be a legacy number (days) or the new {value, unit} object. */
export type CustomDurationValue = number | CustomDuration;
export type CustomDurationsForParent = Partial<Record<LeaveType, CustomDurationValue>>;
export type CustomDurations = Record<number, CustomDurationsForParent>;

/** Custom start dates per parent per period type (ISO YYYY-MM-DD strings). */
export type CustomStartDatesForParent = Partial<Record<LeaveType, string>>;
export type CustomStartDates = Record<number, CustomStartDatesForParent>;

/**
 * A single leave period with concrete ISO date boundaries.
 * This is the canonical representation used by the calendar after the wizard.
 * All date arithmetic is done before the calendar renders; the calendar only reads these.
 */
export interface ComputedPeriod {
    type: LeaveType;
    /** ISO date string YYYY-MM-DD (local time) — inclusive start */
    startDate: string;
    /** ISO date string YYYY-MM-DD (local time) — exclusive end */
    endDate: string;
    /** Working-day count for lactancia; null for all other period types. */
    days: number | null;
    // Extra-period metadata (only present when type === 'extra')
    isExtra?: true;
    extraId?: string;
    extraName?: string;
    /** Original preset key used when the item was created (e.g. 'vacation', 'flexible-extra'). */
    extraPresetKey?: string;
    durationValue?: number;
    durationUnit?: 'days' | 'weeks';
}

/** Full leave schedule for one parent, computed from WizardData. */
export interface ComputedParentSchedule {
    name: string;
    colorId: ColorPaletteId;
    /** Mandatory period first, then non-mandatory in display order. */
    periods: ComputedPeriod[];
}

/** Data persisted to localStorage and passed to CalendarView. */
export interface WizardData {
    dueDate: string;
    parentCount: 1 | 2;
    names: string[];
    colors: ColorPaletteId[];
    leaveMode: LeaveMode;
    firstParent: number;
    lactanciaFirst?: boolean[];
    /**
     * Pre-computed concrete schedule. When present, the calendar renders this
     * directly and never re-runs leave-law formulas. Absent only in legacy data.
     */
    schedule?: ComputedParentSchedule[];
    // Legacy wizard-state fields — kept optional for backwards compatibility with
    // existing localStorage data that lacks `schedule`.
    customDurations?: CustomDurations;
    customStartDates?: CustomStartDates;
    /** Weeks of childcare leave (up to age 8) per parent. null = not opted in. */
    cuidadoWeeks?: (number | null)[];
    /** User-added planning items per parent (vacation, unpaid leave, etc.). */
    extraPeriods?: ExtraLeaveItem[][];
    /**
     * Per-parent explicit ordering of all non-mandatory periods.
     * Values are either a LeaveType string ('flexible', 'lactancia', 'cuidado')
     * or an extra item ID ('ep-…'). Mandatory is always first and not listed here.
     * When absent the default order derived from lactanciaFirst is used.
     */
    periodOrder?: string[][];
}
