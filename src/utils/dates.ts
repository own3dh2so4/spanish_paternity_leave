import type { Language } from '../i18n/LanguageContext';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function parseLocalDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

export function addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

export function isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6;
}

export function countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    while (current < endDate) {
        if (isWeekday(current)) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}

export function addWorkingDays(startDate: Date, workingDays: number): Date {
    let count = 0;
    const current = new Date(startDate);
    while (count < workingDays) {
        current.setDate(current.getDate() + 1);
        if (isWeekday(current)) count++;
    }
    return current;
}

/**
 * Whole calendar days between two local dates. Math.round absorbs the ±1 h DST
 * skew that raw millisecond subtraction would otherwise introduce.
 */
export function daysBetween(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function todayIso(): string {
    return formatDateKey(new Date());
}

const DISPLAY_LOCALES: Record<Language, string> = { en: 'en-GB', es: 'es-ES' };

export function formatDisplayDate(date: Date, lang: Language): string {
    return date.toLocaleDateString(DISPLAY_LOCALES[lang], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatMonthTitle(year: number, month: number, lang: Language): string {
    const label = new Date(year, month, 1).toLocaleDateString(DISPLAY_LOCALES[lang], {
        month: 'long',
        year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Monday-first weekday abbreviations for the given language. */
export function weekdayNames(lang: Language): string[] {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
        const label = addDays(monday, i).toLocaleDateString(DISPLAY_LOCALES[lang], {
            weekday: 'short',
        });
        const clean = label.replace('.', '');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    });
}
