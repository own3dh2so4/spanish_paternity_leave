// Shape of all translation strings.
// Using an interface (not `typeof en`) so that Spanish can use different string values.
export interface TranslationKeys {
    // ── Wizard ────────────────────────────────────────────────────────────
    wizardTitle: string;
    wizardSubtitle: string;
    back: string;
    next: string;
    calculate: string;

    // Step labels
    stepDueDate: string;
    stepParents: string;
    stepNames: string;
    stepLeaveMode: string;
    stepWhoStarts: string;
    stepChildcare: string;

    // StepDueDate
    dueDateTitle: string;
    dueDateDescription: string;
    dueDatePlaceholder: string;
    dueDateLabel: string;

    // StepParentCount
    parentCountTitle: string;
    parentCountOne: string;
    parentCountTwo: string;

    // StepNames
    namesTitle: string;
    namesDescription: string;
    namePlaceholder: (n: number) => string;
    colorLabel: string;

    // StepLeaveMode
    leaveModeTitle: string;
    leaveModeDescription: string;
    modeTogether: string;
    modeTogetherDesc: string;
    modeOptimized: string;
    modeOptimizedDesc: string;

    // StepFirstParent
    firstParentTitle: string;
    firstParentDescription: string;

    // StepCuidado
    cuidadoTitle: string;
    cuidadoDescription: string;
    cuidadoCheck: (name: string) => string;
    cuidadoWeeks: string;
    cuidadoWeeksHint: (paid: number) => string;
    cuidadoMax: (max: number) => string;

    // ── Calendar ──────────────────────────────────────────────────────────
    scheduleTitle: string;
    dueDate: string;
    mode: string;
    modeLabelTogether: string;
    modeLabelOptimized: string;
    btnEdit: string;
    btnReset: string;
    btnPrint: string;
    btnResetCustom: string;
    resetTooltip: string;
    resetCustomTooltip: string;
    btnAddPeriod: string;
    add: string;
    cancel: string;
    btnShare: string;
    shareSuccess: string;
    shareError: string;

    // Summary card
    requiredByLaw: string;
    requiredByLawTooltip: string;
    dragToReorder: string;
    clickToEdit: string;
    clickToEditStartDate: string;
    shifted: string;
    custom: string;
    remove: string;

    // Work timeline
    workTimeline: string;
    stopsWorking: string;
    returnsToWork: string;
    returnsToWorkFinal: string;
    returnsToWorkOn: string;

    // Add-period form
    periodNamePlaceholder: string;

    // Leave type labels
    mandatoryLeave: (weeks: number) => string;
    flexibleLeave: (weeks: number) => string;
    accumulatedLactancia: (val: number | string, unit: string) => string;
    childcareLeavePaidUnpaid: (paid: number, unpaid: number) => string;
    childcareLeavePaid: (weeks: number) => string;
    childcareLeave: string;
    extraPeriod: string;
    flexibleExtra: (rem: number) => string;

    // Legend
    legend: string;
    birthDate: string;
    parentMandatory: (name: string) => string;
    parentFlexible: (name: string) => string;
    parentLactancia: (name: string) => string;
    parentChildcare: (name: string) => string;
    parentExtra: (name: string) => string;

    // Hide parent toggle
    hideParent: string;
    showParent: string;

    // Datepicker locale
    datePickerLocale: string;
}

export const en: TranslationKeys = {
    // ── Wizard ────────────────────────────────────────────────────────────
    wizardTitle: '🇪🇸 Paternity Leave Planner',
    wizardSubtitle: 'Plan your Spanish paternity/maternity leave',
    back: '← Back',
    next: 'Next →',
    calculate: 'Calculate →',

    // Step labels
    stepDueDate: 'Due Date',
    stepParents: 'Parents',
    stepNames: 'Names',
    stepLeaveMode: 'Leave Mode',
    stepWhoStarts: 'Who Starts',
    stepChildcare: 'Childcare',

    // StepDueDate
    dueDateTitle: "What's the due date?",
    dueDateDescription: "Enter the baby's expected due date. You can update it later from the calendar view.",
    dueDatePlaceholder: 'Select a date…',
    dueDateLabel: 'Due date',

    // StepParentCount
    parentCountTitle: 'How many parents are planning leave?',
    parentCountOne: '1 parent',
    parentCountTwo: '2 parents',

    // StepNames
    namesTitle: 'What are the parents\' names?',
    namesDescription: 'Enter names and choose a color for each parent.',
    namePlaceholder: (n: number) => `Parent ${n} name`,
    colorLabel: 'Color',

    // StepLeaveMode
    leaveModeTitle: 'How do you want to organize the leave?',
    leaveModeDescription: 'Choose whether both parents take leave at the same time, or stagger it to maximize total coverage.',
    modeTogether: 'Together',
    modeTogetherDesc: "Both parents take all leave simultaneously. You'll both be home at the same time but return to work sooner.",
    modeOptimized: 'Optimized',
    modeOptimizedDesc: 'Stagger the flexible leave so one parent is always home. Maximizes total time with the baby.',

    // StepFirstParent
    firstParentTitle: 'Who takes flexible leave first?',
    firstParentDescription: 'In optimized mode, one parent finishes mandatory leave and begins flexible leave while the other is still on mandatory leave.',

    // StepCuidado
    cuidadoTitle: 'Childcare leave (optional)',
    cuidadoDescription: 'Spanish law grants up to 8 weeks of childcare leave per parent (permiso de cuidado del hijo) for children up to 8 years old. The first 2 weeks are paid.',
    cuidadoCheck: (name: string) => `${name} will take childcare leave`,
    cuidadoWeeks: 'Weeks',
    cuidadoWeeksHint: (paid: number) => `First ${paid} weeks are paid, the rest are unpaid.`,
    cuidadoMax: (max: number) => `Maximum ${max} weeks`,

    // ── Calendar ──────────────────────────────────────────────────────────
    scheduleTitle: '🗓️ Leave Schedule',
    dueDate: 'Due date',
    mode: 'Mode',
    modeLabelTogether: 'Together',
    modeLabelOptimized: 'Optimized',
    btnEdit: '✏️ Edit',
    btnReset: '↺ Reset',
    btnPrint: '🖨️ Print',
    btnResetCustom: '↺ Reset',
    resetTooltip: 'Start over',
    resetCustomTooltip: 'Reset to standard leave days',
    btnAddPeriod: '+ Add period',
    add: 'Add',
    cancel: 'Cancel',
    btnShare: '🔗 Share',
    shareSuccess: 'URL copied to clipboard!',
    shareError: 'Failed to copy URL',

    // Summary card
    requiredByLaw: '🔒 Required by law',
    requiredByLawTooltip: 'This leave is mandatory under Spanish law and cannot be modified',
    dragToReorder: 'Drag to reorder',
    clickToEdit: 'Click to edit',
    clickToEditStartDate: 'Click to edit start date',
    shifted: 'shifted',
    custom: 'custom',
    remove: 'Remove',

    // Work timeline
    workTimeline: '🏢 Work timeline',
    stopsWorking: 'Stops working',
    returnsToWork: 'Returns to work',
    returnsToWorkFinal: 'Returns to work (final)',
    returnsToWorkOn: 'Returns to work on',

    // Add-period form
    periodNamePlaceholder: 'Period name…',

    // Leave type labels
    mandatoryLeave: (weeks: number) => `Mandatory Leave (${weeks} weeks)`,
    flexibleLeave: (weeks: number) => `Flexible Leave (${weeks} weeks)`,
    accumulatedLactancia: (val: number | string, unit: string) => {
        const isSingular = Number(val) === 1;
        if (unit === 'days') return `Accumulated Lactancia (${val} day${isSingular ? '' : 's'})`;
        if (unit === 'weeks') return `Accumulated Lactancia (${val} week${isSingular ? '' : 's'})`;
        return `Accumulated Lactancia (${val} month${isSingular ? '' : 's'})`;
    },
    childcareLeavePaidUnpaid: (paid: number, unpaid: number) => `Childcare Leave (${paid}w paid + ${unpaid}w unpaid)`,
    childcareLeavePaid: (weeks: number) => `Childcare Leave (${weeks} week${weeks !== 1 ? 's' : ''} paid)`,
    childcareLeave: 'Childcare Leave',
    extraPeriod: 'Extra period',
    flexibleExtra: (rem: number) => `📅 Flexible Leave (${rem}w remaining)`,

    // Legend
    legend: 'Legend',
    birthDate: 'Birth date',
    parentMandatory: (name: string) => `${name} — Mandatory`,
    parentFlexible: (name: string) => `${name} — Flexible`,
    parentLactancia: (name: string) => `${name} — Lactancia`,
    parentChildcare: (name: string) => `${name} — Childcare`,
    parentExtra: (name: string) => `${name} — Extra periods`,

    // Hide parent toggle
    hideParent: 'Hide parent data',
    showParent: 'Show parent data',

    // Datepicker locale
    datePickerLocale: 'en-GB',
};
