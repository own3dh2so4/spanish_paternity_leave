import { test, expect, type Page } from '@playwright/test';
import { WizardPage } from '../page-objects/WizardPage';
import { CalendarPage } from '../page-objects/CalendarPage';

async function openDetailsStep(page: Page, names: string[]): Promise<WizardPage> {
    const wizard = new WizardPage(page);
    await wizard.goto();
    await wizard.fillDueDate();
    await wizard.next();
    await wizard.chooseParentCount(names.length as 1 | 2);
    await wizard.next();
    await wizard.fillNames(names);
    await wizard.next();
    await expect(page.getByTestId('parent-field-0')).toBeVisible();
    return wizard;
}

test.describe('Employment regimes', () => {
    test('SERMAS biological mother gets gestation leave, 10 paid days and 30 calendar days of lactancia', async ({
        page,
    }) => {
        const wizard = await openDetailsStep(page, ['Marta', 'David']);
        const calendar = new CalendarPage(page);

        await wizard.setDetails({ mother: 0 });
        await expect(page.getByTestId('anticipated-btn-0')).toBeVisible();
        await expect(wizard.convenioDaysInput(0)).toHaveValue('0');

        await wizard.setRegime(0, 'sermas');
        await expect(wizard.convenioDaysInput(0)).toHaveValue('10');
        await expect(wizard.convenioDaysInput(1)).toHaveValue('0');
        await expect(page.getByTestId('anticipated-unavailable')).toBeVisible();
        await expect(page.getByTestId('anticipated-btn-0')).toHaveCount(0);

        await wizard.next();
        await wizard.chooseLeaveMode('together');
        await wizard.submit();
        await calendar.expectLoaded();

        expect(await calendar.rowOrder(0)).toEqual([
            'gestation',
            'mandatory',
            'flexible',
            'convenio',
            'lactancia',
            'cuidado',
        ]);
        await expect(calendar.row(0, 'gestation')).toContainText(
            'Paid leave before the birth (4 weeks)',
        );
        await expect(calendar.row(0, 'convenio')).toContainText('Extra paid days (10 days)');
        await expect(calendar.row(0, 'lactancia')).toContainText(
            'Accumulated lactancia (30 calendar days)',
        );
        await expect(calendar.row(0, 'flexible')).toContainText('Flexible leave (11 weeks)');

        const gestation = await calendar.rangeOf(0, 'gestation');
        const mandatory = await calendar.rangeOf(0, 'mandatory');
        const flexible = await calendar.rangeOf(0, 'flexible');
        const convenio = await calendar.rangeOf(0, 'convenio');
        const lactancia = await calendar.rangeOf(0, 'lactancia');
        expect(gestation.end).toBe(mandatory.start);
        expect(convenio.start).toBe(flexible.end);
        expect(lactancia.start).toBe(convenio.end);

        await expect(calendar.row(1, 'gestation')).toHaveCount(0);
        await expect(calendar.row(1, 'convenio')).toHaveCount(0);
        await expect(calendar.row(1, 'lactancia')).toContainText(
            /Accumulated lactancia \(\d+ days\)/,
        );
        await expect(calendar.row(1, 'lactancia')).not.toContainText('calendar days');
    });

    test('EBEP biological mother cannot anticipate weeks and gets no gestation leave', async ({
        page,
    }) => {
        const wizard = await openDetailsStep(page, ['Marta', 'David']);
        const calendar = new CalendarPage(page);

        await wizard.setDetails({ mother: 0 });
        await wizard.setRegime(0, 'ebep');

        await expect(page.getByTestId('anticipated-unavailable')).toBeVisible();
        await expect(page.getByTestId('anticipated-btn-0')).toHaveCount(0);
        await expect(wizard.convenioDaysInput(0)).toHaveValue('0');

        await wizard.setRegime(0, 'et');
        await expect(page.getByTestId('anticipated-btn-0')).toBeVisible();
        await expect(page.getByTestId('anticipated-unavailable')).toHaveCount(0);
        await wizard.setRegime(0, 'ebep');

        await wizard.next();
        await wizard.chooseLeaveMode('together');
        await wizard.submit();
        await calendar.expectLoaded();

        expect(await calendar.rowOrder(0)).toEqual([
            'mandatory',
            'flexible',
            'lactancia',
            'cuidado',
        ]);
        await expect(calendar.row(0, 'gestation')).toHaveCount(0);
        await expect(calendar.row(0, 'convenio')).toHaveCount(0);
        await expect(calendar.row(0, 'anticipated')).toHaveCount(0);
        await expect(calendar.row(0, 'lactancia')).toContainText(
            /Accumulated lactancia \(\d+ days\)/,
        );
        await expect(calendar.row(0, 'lactancia')).not.toContainText('calendar days');
    });

    test('extra paid days entered manually add a convenio row for a private-sector parent', async ({
        page,
    }) => {
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

        await expect(calendar.row(0, 'convenio')).toHaveCount(0);
        await expect(calendar.row(1, 'convenio')).toContainText('Extra paid days (5 days)');
        expect(await calendar.rowOrder(1)).toEqual([
            'mandatory',
            'flexible',
            'convenio',
            'lactancia',
            'cuidado',
        ]);

        const flexible = await calendar.rangeOf(1, 'flexible');
        const convenio = await calendar.rangeOf(1, 'convenio');
        expect(convenio.start).toBe(flexible.end);
    });
});
