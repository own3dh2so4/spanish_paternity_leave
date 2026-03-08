import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SummaryCard from '../SummaryCard';
import type {
    ColorPalette,
    ComputedParentSchedule,
} from '../../../types';
import type { TranslationKeys } from '../../../i18n/en';
import { COLOR_PALETTES } from '../../../constants';
import { MANDATORY_WEEKS, FLEXIBLE_WEEKS } from '../../../constants';

afterEach(cleanup);

const stubT = {
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
    resetTooltip: 'Reset',
    resetCustomTooltip: 'Reset custom',
    btnAddPeriod: 'Add period',
    add: 'Add',
    cancel: 'Cancel',
    shareSuccess: '',
    shareError: '',
    requiredByLaw: 'Required',
    requiredByLawTooltip: 'Required by law',
    dragToReorder: 'Drag',
    clickToEdit: 'Click to edit',
    clickToEditStartDate: 'Edit start',
    shifted: 'Shifted',
    custom: 'Custom',
    remove: 'Remove',
    workTimeline: 'Work Timeline',
    stopsWorking: 'Stops',
    returnsToWork: 'Returns',
    returnsToWorkFinal: 'Finally returns',
    returnsToWorkOn: 'Returns on',
    periodNamePlaceholder: 'Name',
    mandatoryLeave: (w: number) => `Mandatory ${w}w`,
    flexibleLeave: (w: number) => `Flexible ${w}w`,
    accumulatedLactancia: (v: number | string, u: string) => `Lactancia ${v}${u}`,
    childcareLeavePaidUnpaid: (p: number, u: number) => `Childcare ${p}+${u}w`,
    childcareLeavePaid: (w: number) => `Childcare ${w}w`,
    childcareLeave: 'Childcare',
    extraPeriod: 'Extra',
    flexibleExtra: (r: number) => `Flex extra (${r}w)`,
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
} as unknown as TranslationKeys;

const mandStart = '2026-04-01';
const mandEnd = `2026-${String(4 + MANDATORY_WEEKS > 12 ? 5 : 4 + MANDATORY_WEEKS).padStart(2, '0')}-01`;
// Simplified dates for testing
const parent: ComputedParentSchedule = {
    name: 'Alice',
    colorId: 'indigo',
    periods: [
        { type: 'mandatory', startDate: mandStart, endDate: mandEnd, days: null },
        {
            type: 'flexible',
            startDate: mandEnd,
            endDate: `2026-${String(Number(mandEnd.split('-')[1]) + Math.ceil(FLEXIBLE_WEEKS / 4)).padStart(2, '0')}-01`,
            days: null,
        },
    ],
};

const palette: ColorPalette = COLOR_PALETTES.indigo;

const noop = vi.fn();

function renderCard(
    overrides: Partial<React.ComponentProps<typeof SummaryCard>> = {},
) {
    return render(
        <SummaryCard
            parentIndex={0}
            parent={parent}
            activeColor={palette}
            isHidden={false}
            lang="en"
            t={stubT}
            onToggleVisibility={noop}
            onResetCustom={noop}
            editingPeriod={null}
            editValue=""
            editUnit="weeks"
            inputRef={{ current: null }}
            onStartEditing={noop}
            onCommitEdit={noop}
            onCancelEdit={noop}
            onEditValueChange={noop}
            onEditUnitChange={noop}
            draggingKey={null}
            dragOverKey={null}
            onDragStart={noop}
            onDragOver={noop}
            onDrop={noop}
            onDragEnd={noop}
            editingStartDate={null}
            editStartDateValue={null}
            minEditStartDate={null}
            onOpenStartDateEdit={noop}
            onCommitStartDate={noop}
            onCancelEditDate={noop}
            addingForParent={null}
            newPresetKey="vacation"
            newCustomName=""
            newDurationValue={2}
            newDurationUnit="weeks"
            onOpenAddForm={noop}
            onPresetChange={noop}
            onCustomNameChange={noop}
            onDurationValueChange={noop}
            onDurationUnitChange={noop}
            onConfirmAddExtra={noop}
            onCancelAddForm={noop}
            editingExtraDate={null}
            editExtraDateValue={null}
            minEditExtraDate={null}
            onOpenExtraDateEdit={noop}
            onCommitExtraStartDate={noop}
            onCancelExtraDateEdit={noop}
            onDeleteExtra={noop}
            {...overrides}
        />,
    );
}

describe('SummaryCard', () => {
    it("renders the parent's name", () => {
        renderCard();
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('renders the mandatory period label', () => {
        renderCard();
        // Mandatory label should include the correct number of weeks
        expect(
            screen.getByText(/Mandatory \d+w/),
        ).toBeInTheDocument();
    });

    it('shows the card body when not hidden', () => {
        renderCard({ isHidden: false });
        expect(
            document.querySelector('.summary-card-body--hidden'),
        ).not.toBeInTheDocument();
    });

    it('hides the card body when isHidden is true', () => {
        renderCard({ isHidden: true });
        expect(
            document.querySelector('.summary-card-body--hidden'),
        ).toBeInTheDocument();
    });

    it('always shows "Reset custom" button', () => {
        renderCard();
        expect(
            screen.getByRole('button', { name: 'Reset custom' }),
        ).toBeInTheDocument();
    });

    it('shows the Hide button with the correct title when visible', () => {
        renderCard({ isHidden: false });
        expect(screen.getByTitle('Hide')).toBeInTheDocument();
    });

    it('shows the Show button with the correct title when hidden', () => {
        renderCard({ isHidden: true });
        expect(screen.getByTitle('Show')).toBeInTheDocument();
    });

    it('shows the "Add period" button when no add form is open', () => {
        renderCard({ addingForParent: null });
        expect(
            screen.getByRole('button', { name: 'Add period' }),
        ).toBeInTheDocument();
    });

    it('shows the add-extra form when addingForParent matches this parentIndex', () => {
        renderCard({ addingForParent: 0 });
        expect(screen.getByTitle('Add')).toBeInTheDocument();
        expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    });

    it('calls onToggleVisibility when the toggle button is clicked', () => {
        const onToggleVisibility = vi.fn();
        renderCard({ onToggleVisibility });
        screen.getByTitle('Hide').click();
        expect(onToggleVisibility).toHaveBeenCalledWith(0);
    });

    it('calls onResetCustom when Reset custom is clicked', () => {
        const onResetCustom = vi.fn();
        renderCard({ onResetCustom });
        screen.getByRole('button', { name: 'Reset custom' }).click();
        expect(onResetCustom).toHaveBeenCalledWith(0);
    });
});
