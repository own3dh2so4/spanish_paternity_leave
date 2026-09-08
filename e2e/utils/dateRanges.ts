export interface DateRange {
    start: number;
    end: number;
}

const MONTHS: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
};

const DISPLAY_DATE = String.raw`\w{3},? (\d{1,2}) (\w{3,5}) (\d{4})`;
const DISPLAY_RANGE_RE = new RegExp(`${DISPLAY_DATE}\\s*→\\s*${DISPLAY_DATE}`, 'g');

export function parseDisplayDate(day: string, month: string, year: string): number {
    const m = MONTHS[month.slice(0, 3).toLowerCase()];
    if (!m) throw new Error(`Unknown month name: ${month}`);
    return Number(year) * 10000 + m * 100 + Number(day);
}

export function extractDateRanges(text: string): DateRange[] {
    const ranges: DateRange[] = [];
    for (const m of text.matchAll(DISPLAY_RANGE_RE)) {
        ranges.push({
            start: parseDisplayDate(m[1], m[2], m[3]),
            end: parseDisplayDate(m[4], m[5], m[6]),
        });
    }
    return ranges;
}

/**
 * Calendar days from `from` to `to`, both encoded as yyyymmdd numbers. The e2e
 * workspace cannot import the app's own date helpers, so this reads the rendered
 * labels back instead.
 */
export function daysBetween(from: number, to: number): number {
    const asDate = (n: number) =>
        Date.UTC(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100);
    return (asDate(to) - asDate(from)) / 86400000;
}

export function rangesOverlap(a: DateRange, b: DateRange): boolean {
    return a.start < b.end && b.start < a.end;
}

export function findOverlap(as: DateRange[], bs: DateRange[]): [DateRange, DateRange] | null {
    for (const a of as) {
        for (const b of bs) {
            if (rangesOverlap(a, b)) return [a, b];
        }
    }
    return null;
}
