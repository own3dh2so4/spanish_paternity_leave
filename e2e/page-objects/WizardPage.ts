import { expect, type Locator, type Page } from '@playwright/test';
import { upcomingDueDate } from '../utils/dueDate';

export type LeaveMode = 'together' | 'optimized';
export type Regime = 'et' | 'ebep' | 'sermas';

export interface DetailsOptions {
    babies?: 1 | 2 | 3;
    disability?: boolean;
    mother?: 0 | 1 | null;
    anticipatedWeeks?: 0 | 1 | 2 | 3 | 4;
}

export interface WizardOptions {
    dueDate?: string;
    parentCount?: 1 | 2;
    names: string[];
    details?: DetailsOptions;
    regimes?: Regime[];
    convenioDays?: number[];
    useExtraWeeks?: boolean[];
    leaveMode?: LeaveMode;
    firstParent?: 0 | 1;
}

export class WizardPage {
    readonly page: Page;
    readonly nextBtn: Locator;
    readonly backBtn: Locator;
    readonly dueDateInput: Locator;
    readonly allowanceSummary: Locator;

    constructor(page: Page) {
        this.page = page;
        this.nextBtn = page.getByTestId('wizard-next-btn');
        this.backBtn = page.getByTestId('wizard-back-btn');
        this.dueDateInput = page.getByTestId('due-date-container').locator('input');
        this.allowanceSummary = page.getByTestId('allowance-summary');
    }

    async goto() {
        // Relative, so a baseURL with a path (a preview build, GitHub Pages)
        // is honoured instead of jumping to the domain root.
        await this.page.goto('./');
        await expect(this.nextBtn).toBeVisible();
    }

    async next() {
        await this.nextBtn.click();
    }

    async submit() {
        await expect(this.nextBtn).toHaveText(/Calculate/);
        await this.nextBtn.click();
        await expect(this.nextBtn).toBeHidden();
    }

    async fillDueDate(dateText: string = upcomingDueDate()) {
        await this.dueDateInput.fill(dateText);
        await this.dueDateInput.press('Enter');
        await expect(this.dueDateInput).toHaveValue(dateText);
        await expect(this.nextBtn).toBeEnabled();
    }

    async chooseParentCount(count: 1 | 2) {
        await this.page.getByTestId(`parent-count-btn-${count}`).click();
    }

    async fillNames(names: string[]) {
        for (let i = 0; i < names.length; i++) {
            await this.page.getByTestId(`parent-name-input-${i}`).fill(names[i]);
        }
    }

    async setDetails({ babies, disability, mother, anticipatedWeeks }: DetailsOptions) {
        if (babies !== undefined) await this.page.getByTestId(`babies-btn-${babies}`).click();
        if (disability !== undefined) {
            await this.page.getByTestId(`disability-btn-${disability ? 'yes' : 'no'}`).click();
        }
        if (mother !== undefined) {
            await this.page
                .getByTestId(mother === null ? 'mother-btn-none' : `mother-btn-${mother}`)
                .click();
        }
        if (anticipatedWeeks !== undefined) {
            await this.page.getByTestId(`anticipated-btn-${anticipatedWeeks}`).click();
        }
    }

    parentField(parentIndex: number): Locator {
        return this.page.getByTestId(`parent-field-${parentIndex}`);
    }

    regimeButton(parentIndex: number, regime: Regime): Locator {
        return this.page.getByTestId(`regime-btn-${parentIndex}-${regime}`);
    }

    extraWeeksButton(parentIndex: number, use: boolean): Locator {
        return this.page.getByTestId(`extra-weeks-btn-${parentIndex}-${use ? 'yes' : 'no'}`);
    }

    extraWeeksGroup(parentIndex: number): Locator {
        return this.parentField(parentIndex).getByRole('radiogroup', { name: /until age 8/ });
    }

    convenioDaysInput(parentIndex: number): Locator {
        return this.page.getByTestId(`convenio-days-${parentIndex}`);
    }

    async setRegime(parentIndex: number, regime: Regime) {
        await this.regimeButton(parentIndex, regime).click();
        await expect(this.regimeButton(parentIndex, regime)).toHaveAttribute(
            'aria-checked',
            'true',
        );
    }

    async setConvenioDays(parentIndex: number, days: number) {
        await this.convenioDaysInput(parentIndex).fill(String(days));
    }

    async setUseExtraWeeks(parentIndex: number, use: boolean) {
        await this.extraWeeksButton(parentIndex, use).click();
        await expect(this.extraWeeksButton(parentIndex, use)).toHaveAttribute(
            'aria-checked',
            'true',
        );
    }

    async chooseLeaveMode(mode: LeaveMode) {
        await this.page.getByTestId(`mode-${mode}-btn`).click();
    }

    async chooseFirstParent(index: 0 | 1) {
        await this.page.getByTestId(`first-parent-btn-${index}`).click();
    }

    async complete(options: WizardOptions) {
        const parentCount = options.parentCount ?? (options.names.length as 1 | 2);
        await this.fillDueDate(options.dueDate);
        await this.next();
        await this.chooseParentCount(parentCount);
        await this.next();
        await this.fillNames(options.names);
        await this.next();
        if (options.details) await this.setDetails(options.details);
        for (const [i, regime] of (options.regimes ?? []).entries()) {
            await this.setRegime(i, regime);
        }
        for (const [i, days] of (options.convenioDays ?? []).entries()) {
            await this.setConvenioDays(i, days);
        }
        for (const [i, use] of (options.useExtraWeeks ?? []).entries()) {
            await this.setUseExtraWeeks(i, use);
        }
        if (parentCount === 1) {
            await this.submit();
            return;
        }
        await this.next();
        const mode = options.leaveMode ?? 'together';
        await this.chooseLeaveMode(mode);
        if (mode === 'together') {
            await this.submit();
            return;
        }
        await this.next();
        await this.chooseFirstParent(options.firstParent ?? 0);
        await this.submit();
    }
}
