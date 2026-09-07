import { test, expect } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

test.describe('Language toggle', () => {
    test('wizard starts in English and switches to Spanish without losing state', async ({
        page,
    }) => {
        const wizard = new WizardPage(page);
        const heading = page.getByRole('heading', { level: 1 });
        const langToggle = page.getByTestId('lang-toggle');

        await wizard.goto();
        await expect(heading).toContainText('Parental Leave Planner');
        await expect(langToggle).toHaveText('🇪🇸 ES');

        await wizard.fillDueDate();
        await wizard.next();
        await expect(page.getByTestId('parent-count-btn-2')).toContainText('Two parents');

        await langToggle.click();

        await expect(heading).toContainText('Planificador de Permiso Parental');
        await expect(langToggle).toHaveText('🇬🇧 EN');
        await expect(page.getByTestId('parent-count-btn-2')).toContainText('Dos progenitores');
        await expect(wizard.nextBtn).toHaveText('Siguiente →');
    });

    test('calendar labels switch to Spanish and back', async ({ page }) => {
        const wizard = new WizardPage(page);
        const calendar = new CalendarPage(page);

        await wizard.goto();
        await wizard.complete({ names: ['Alex', 'Sam'], leaveMode: 'together' });
        await calendar.expectLoaded();

        await expect(calendar.row(0, 'mandatory')).toContainText('Mandatory leave (6 weeks)');
        await expect(calendar.modeLabel).toHaveText('Together');

        await calendar.toggleLanguage();
        await expect(calendar.row(0, 'mandatory')).toContainText('Permiso obligatorio (6 semanas)');
        await expect(calendar.modeLabel).toHaveText('Juntos');
        await expect(calendar.langToggle).toHaveText('🇬🇧 EN');

        await calendar.toggleLanguage();
        await expect(calendar.row(0, 'mandatory')).toContainText('Mandatory leave (6 weeks)');
        await expect(calendar.modeLabel).toHaveText('Together');
        await expect(calendar.langToggle).toHaveText('🇪🇸 ES');
    });
});
