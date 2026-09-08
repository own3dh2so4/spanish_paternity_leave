import { expect, test } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

test.describe('Plan persistence', () => {
    test('a plan with extra paid days survives a reload', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['Alex', 'Sam'],
            regimes: ['et', 'et'],
            convenioDays: [0, 5],
            leaveMode: 'together',
        });
        await calendar.expectLoaded();
        const before = await calendar.rowOrder(1);

        await page.reload();

        await calendar.expectLoaded();
        await expect(calendar.row(1, 'convenio')).toContainText('Extra paid days (5 days)');
        expect(await calendar.rowOrder(1)).toEqual(before);
    });

    test('a SERMAS gestation plan survives a reload', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['Alex', 'Sam'],
            regimes: ['sermas', 'sermas'],
            details: { mother: 0 },
            leaveMode: 'together',
        });
        await calendar.expectLoaded();
        const before = await calendar.rowOrder(0);

        await page.reload();

        await calendar.expectLoaded();
        await expect(calendar.row(0, 'gestation')).toHaveCount(1);
        expect(await calendar.rowOrder(0)).toEqual(before);
    });

    test('a share link for a plan with extra paid days opens the same plan', async ({
        page,
        context,
    }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({
            names: ['Alex', 'Sam'],
            regimes: ['et', 'et'],
            convenioDays: [0, 5],
            leaveMode: 'together',
        });
        await calendar.expectLoaded();
        const before = await calendar.rowOrder(1);

        await calendar.shareBtn.click();
        const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
        expect(shareUrl).toContain('share=');

        const recipient = await context.newPage();
        await recipient.goto(shareUrl);
        const recipientCalendar = new CalendarPage(recipient);

        await recipientCalendar.expectLoaded();
        await expect(recipient.getByRole('alert')).toHaveCount(0);
        await expect(recipientCalendar.row(1, 'convenio')).toContainText(
            'Extra paid days (5 days)',
        );
        expect(await recipientCalendar.rowOrder(1)).toEqual(before);
    });
});
