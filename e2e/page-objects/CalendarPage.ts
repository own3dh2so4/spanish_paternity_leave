import { expect, type Locator, type Page } from '@playwright/test';
import { extractDateRanges, type DateRange } from '../utils/dragAndDrop';

export type PeriodType =
    | 'gestation'
    | 'anticipated'
    | 'mandatory'
    | 'flexible'
    | 'convenio'
    | 'lactancia'
    | 'cuidado'
    | 'vacation'
    | 'parental'
    | 'unpaid'
    | 'custom'
    | 'flexible-extra';

export type ExtraPreset = 'vacation' | 'parental' | 'unpaid' | 'custom' | 'flexible-extra';

const FIXED_TYPES: PeriodType[] = ['gestation', 'anticipated', 'mandatory'];

export class CalendarPage {
    readonly page: Page;
    readonly title: Locator;
    readonly modeLabel: Locator;
    readonly editBtn: Locator;
    readonly resetBtn: Locator;
    readonly shareBtn: Locator;
    readonly langToggle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.title = page.getByRole('heading', { level: 1 });
        this.modeLabel = page.getByTestId('mode-label');
        this.editBtn = page.getByTestId('edit-btn');
        this.resetBtn = page.getByTestId('reset-btn');
        this.shareBtn = page.getByTestId('share-btn');
        this.langToggle = page.getByTestId('lang-toggle');
    }

    card(index: number): Locator {
        return this.page.getByTestId(`summary-card-${index}`);
    }

    cardFor(parentName: string): Locator {
        return this.page.locator('.summary-card', { hasText: parentName });
    }

    row(cardIndex: number, type: PeriodType): Locator {
        return this.card(cardIndex).getByTestId(`period-row-${type}`);
    }

    dragHandle(cardIndex: number, type: PeriodType): Locator {
        return this.card(cardIndex).getByTestId(`drag-handle-${type}`);
    }

    visibilityToggle(cardIndex: number): Locator {
        return this.card(cardIndex).locator('.btn-toggle-parent');
    }

    async expectLoaded() {
        await expect(this.title).toContainText('Leave schedule');
    }

    /** Period types in the order the card renders them, e.g. ['mandatory','flexible','lactancia','cuidado']. */
    async rowOrder(cardIndex: number): Promise<string[]> {
        const rows = this.card(cardIndex).locator('[data-testid^="period-row-"]');
        const ids = await rows.evaluateAll((els) =>
            els.map((el) => el.getAttribute('data-testid') ?? ''),
        );
        return ids.map((id) => id.replace('period-row-', ''));
    }

    async rangeOf(cardIndex: number, type: PeriodType): Promise<DateRange> {
        const text = (await this.row(cardIndex, type).textContent()) ?? '';
        const ranges = extractDateRanges(text);
        expect(ranges, `no date range found in ${type} row: "${text}"`).toHaveLength(1);
        return ranges[0];
    }

    async periodRanges(
        cardIndex: number,
        { includeFixed = true }: { includeFixed?: boolean } = {},
    ): Promise<DateRange[]> {
        const rows = this.card(cardIndex).locator('[data-testid^="period-row-"]');
        const count = await rows.count();
        const ranges: DateRange[] = [];
        for (let i = 0; i < count; i++) {
            const row = rows.nth(i);
            const type = ((await row.getAttribute('data-testid')) ?? '').replace(
                'period-row-',
                '',
            ) as PeriodType;
            if (!includeFixed && FIXED_TYPES.includes(type)) continue;
            ranges.push(...extractDateRanges((await row.textContent()) ?? ''));
        }
        return ranges;
    }

    async setDuration(cardIndex: number, type: PeriodType, value: number, unit?: string) {
        const row = this.row(cardIndex, type);
        await row.getByRole('button', { name: 'Edit duration' }).click();
        const input = row.getByRole('spinbutton');
        await expect(input).toBeVisible();
        await input.fill(String(value));
        if (unit) await row.locator('select').selectOption(unit);
        await input.press('Enter');
        await expect(input).toBeHidden();
    }

    async moveEarlier(cardIndex: number, type: PeriodType) {
        await this.row(cardIndex, type).getByRole('button', { name: 'Move earlier' }).click();
    }

    async moveLater(cardIndex: number, type: PeriodType) {
        await this.row(cardIndex, type).getByRole('button', { name: 'Move later' }).click();
    }

    async addExtraPeriod(cardIndex: number, preset: ExtraPreset, value?: number) {
        const card = this.card(cardIndex);
        await card.getByTestId('add-period-btn').click();
        const form = card.getByTestId('add-extra-form');
        await expect(form).toBeVisible();
        await form.locator('select').first().selectOption(preset);
        if (value !== undefined) await form.getByRole('spinbutton').fill(String(value));
        await form.getByTestId('add-extra-confirm').click();
        await expect(form).toBeHidden();
    }

    async toggleParentVisibility(cardIndex: number) {
        await this.visibilityToggle(cardIndex).click();
    }

    async clickEdit() {
        await this.editBtn.click();
    }

    async clickReset() {
        await this.resetBtn.click();
    }

    async toggleLanguage() {
        await this.langToggle.click();
    }
}
