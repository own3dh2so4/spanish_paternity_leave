import { WIZARD_DATA_VERSION } from './constants';
import type { WizardData, WizardInput } from './types';
import { withSchedule } from './utils/calendarHelpers';

export const DUE_DATE = '2026-10-01';

export function makeInput(overrides: Partial<WizardInput> = {}): WizardInput {
    const parentCount = overrides.parentCount ?? 2;
    return {
        version: WIZARD_DATA_VERSION,
        dueDate: DUE_DATE,
        parentCount,
        names: parentCount === 1 ? ['Ana'] : ['Ana', 'Luis'],
        colors: parentCount === 1 ? ['indigo'] : ['indigo', 'pink'],
        regimes: parentCount === 1 ? ['et'] : ['et', 'et'],
        convenioDays: parentCount === 1 ? [0] : [0, 0],
        useExtraWeeks: parentCount === 1 ? [true] : [true, true],
        leaveMode: 'together',
        firstParent: 0,
        babies: 1,
        disability: false,
        biologicalMother: null,
        anticipatedWeeks: 0,
        ...overrides,
    };
}

export function makeData(overrides: Partial<WizardInput> = {}): WizardData {
    return withSchedule(makeInput(overrides));
}
