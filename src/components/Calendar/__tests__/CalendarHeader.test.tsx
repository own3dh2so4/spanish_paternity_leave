import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(cleanup);
import CalendarHeader from '../CalendarHeader';
import type { WizardData } from '../../../types';
import type { TranslationKeys } from '../../../i18n/en';

const stubT: TranslationKeys = {
    scheduleTitle: 'Schedule',
    dueDate: 'Due date',
    mode: 'Mode',
    modeLabelTogether: 'Together',
    modeLabelOptimized: 'Optimized',
    btnEdit: 'Edit',
    btnReset: 'Reset',
    btnShare: 'Share',
    btnPrint: 'Print',
    btnResetCustom: 'Reset custom',
    resetTooltip: 'Reset tooltip',
    resetCustomTooltip: 'Reset custom tooltip',
    btnAddPeriod: 'Add period',
    add: 'Add',
    cancel: 'Cancel',
    shareSuccess: 'Copied!',
    shareError: 'Error',
    requiredByLaw: 'Required',
    requiredByLawTooltip: 'Required tooltip',
    dragToReorder: 'Drag',
    clickToEdit: 'Click to edit',
    clickToEditStartDate: 'Edit start',
    shifted: 'Shifted',
    custom: 'Custom',
    remove: 'Remove',
    workTimeline: 'Timeline',
    stopsWorking: 'Stops',
    returnsToWork: 'Returns',
    returnsToWorkFinal: 'Returns (final)',
    returnsToWorkOn: 'Returns on',
    periodNamePlaceholder: 'Name',
    mandatoryLeave: (w: number) => `Mandatory ${w}w`,
    flexibleLeave: (w: number) => `Flexible ${w}w`,
    accumulatedLactancia: (v: number | string, u: string) => `Lactancia ${v}${u}`,
    childcareLeavePaidUnpaid: (p: number, u: number) => `Childcare ${p}+${u}w`,
    childcareLeavePaid: (w: number) => `Childcare ${w}w`,
    childcareLeave: 'Childcare',
    extraPeriod: 'Extra',
    flexibleExtra: (r: number) => `Flex extra (${r}w left)`,
    legend: 'Legend',
    birthDate: 'Birth date',
    parentMandatory: (n: string) => `${n} mandatory`,
    parentFlexible: (n: string) => `${n} flexible`,
    parentLactancia: (n: string) => `${n} lactancia`,
    parentChildcare: (n: string) => `${n} childcare`,
    parentExtra: (n: string) => `${n} extra`,
    hideParent: 'Hide',
    showParent: 'Show',
    datePickerLocale: 'en-GB',
    // Wizard strings (not used in CalendarHeader but required by the interface)
    wizardTitle: '',
    wizardSubtitle: '',
    back: '',
    next: '',
    calculate: '',
    stepDueDate: '',
    stepParents: '',
    stepNames: '',
    stepLeaveMode: '',
    stepWhoStarts: '',
    stepChildcare: '',
    dueDateTitle: '',
    dueDateDescription: '',
    dueDatePlaceholder: '',
    dueDateLabel: '',
    parentCountTitle: '',
    parentCountOne: '',
    parentCountTwo: '',
    namesTitle: '',
    namesDescription: '',
    namePlaceholder: () => '',
    colorLabel: '',
    leaveModeTitle: '',
    leaveModeDescription: '',
    modeTogether: '',
    modeTogetherDesc: '',
    modeOptimized: '',
    modeOptimizedDesc: '',
    firstParentTitle: '',
    firstParentDescription: '',
    cuidadoTitle: '',
    cuidadoDescription: '',
    cuidadoCheck: () => '',
    cuidadoWeeks: '',
    cuidadoWeeksHint: () => '',
    cuidadoMax: () => '',
};

const baseData: WizardData = {
    dueDate: '2026-04-01',
    parentCount: 1,
    names: ['Parent A'],
    colors: ['indigo'],
    leaveMode: 'together',
    firstParent: 0,
};

function renderHeader(overrides: Partial<React.ComponentProps<typeof CalendarHeader>> = {}) {
    const props = {
        data: baseData,
        lang: 'en',
        theme: 'light',
        t: stubT,
        onEdit: vi.fn(),
        onReset: vi.fn(),
        onShare: vi.fn(),
        onDueDateChange: vi.fn(),
        onToggleLang: vi.fn(),
        onToggleTheme: vi.fn(),
        ...overrides,
    };
    return render(<CalendarHeader {...props} />);
}

describe('CalendarHeader', () => {
    it('renders the schedule title', () => {
        renderHeader();
        expect(screen.getByText('Schedule')).toBeInTheDocument();
    });

    it('calls onEdit when the Edit button is clicked', () => {
        const onEdit = vi.fn();
        renderHeader({ onEdit });
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(onEdit).toHaveBeenCalledOnce();
    });

    it('calls onReset when the Reset button is clicked', () => {
        const onReset = vi.fn();
        renderHeader({ onReset });
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(onReset).toHaveBeenCalledOnce();
    });

    it('calls onShare when the Share button is clicked', () => {
        const onShare = vi.fn();
        renderHeader({ onShare });
        fireEvent.click(screen.getByRole('button', { name: 'Share' }));
        expect(onShare).toHaveBeenCalledOnce();
    });

    it('calls onToggleLang when the language button is clicked', () => {
        const onToggleLang = vi.fn();
        renderHeader({ onToggleLang });
        fireEvent.click(screen.getByTitle('Switch to Spanish'));
        expect(onToggleLang).toHaveBeenCalledOnce();
    });

    it('calls onToggleTheme when the theme button is clicked', () => {
        const onToggleTheme = vi.fn();
        renderHeader({ onToggleTheme });
        fireEvent.click(screen.getByTitle('Switch to dark mode'));
        expect(onToggleTheme).toHaveBeenCalledOnce();
    });

    it('shows mode label for 2 parents in together mode', () => {
        renderHeader({
            data: { ...baseData, parentCount: 2, names: ['A', 'B'] },
        });
        expect(screen.getByText('Together')).toBeInTheDocument();
    });

    it('shows optimized mode label when leaveMode is optimized', () => {
        renderHeader({
            data: {
                ...baseData,
                parentCount: 2,
                names: ['A', 'B'],
                leaveMode: 'optimized',
            },
        });
        expect(screen.getByText('Optimized')).toBeInTheDocument();
    });

    it('does not show mode label for 1 parent', () => {
        renderHeader();
        expect(screen.queryByText('Mode')).not.toBeInTheDocument();
    });
});
