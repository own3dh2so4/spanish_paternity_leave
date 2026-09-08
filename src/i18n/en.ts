export interface TranslationKeys {
    documentTitle: string;
    wizardTitle: string;
    wizardSubtitle: string;
    back: string;
    next: string;
    calculate: string;
    editWarning: string;
    invalidShareLink: string;

    stepDueDate: string;
    stepParents: string;
    stepNames: string;
    stepDetails: string;
    stepLeaveMode: string;
    stepWhoStarts: string;

    dueDateTitle: string;
    dueDateDescription: string;
    dueDatePlaceholder: string;
    oldRegimeWarning: string;

    parentCountTitle: string;
    parentCountTwo: string;
    parentCountTwoDesc: (weeks: number) => string;
    parentCountSingle: string;
    parentCountSingleDesc: (weeks: number) => string;

    namesTitle: string;
    namesDescription: string;
    namePlaceholder: (n: number) => string;
    colorOption: (name: string) => string;

    detailsTitle: string;
    detailsDescription: string;
    babiesLabel: string;
    babiesOption: (n: number) => string;
    disabilityLabel: string;
    disabilityHint: string;
    motherLabel: string;
    motherHint: string;
    motherNone: string;
    anticipatedLabel: string;
    anticipatedHint: string;
    allowanceSummary: (mandatory: number, flexible: number, extra: number) => string;

    leaveModeTitle: string;
    leaveModeDescription: string;
    modeTogether: string;
    modeTogetherDesc: string;
    modeOptimized: string;
    modeOptimizedDesc: string;

    firstParentTitle: string;
    firstParentDescription: string;
    hintFirstParent: string;
    hintSecondParent: string;

    scheduleTitle: string;
    dueDate: string;
    mode: string;
    modeLabelTogether: string;
    modeLabelOptimized: string;
    btnEdit: string;
    btnReset: string;
    btnResetCustom: string;
    resetTooltip: string;
    resetCustomTooltip: string;
    btnAddPeriod: string;
    add: string;
    cancel: string;
    btnShare: string;
    shareSuccess: string;
    shareError: string;
    legalDisclaimer: string;

    requiredByLaw: string;
    requiredByLawTooltip: string;
    anticipatedBadge: string;
    anticipatedTooltip: string;
    dragToReorder: string;
    moveEarlier: string;
    moveLater: string;
    clickToEdit: string;
    clickToEditStartDate: string;
    remove: string;
    warnAfterFirstBirthday: string;
    warnAfterEighthBirthday: string;
    lactanciaEstimateHint: string;

    workTimeline: string;
    stopsWorking: string;
    returnsToWork: string;
    returnsToWorkFinal: string;

    periodNamePlaceholder: string;

    anticipatedLeave: (weeks: number) => string;
    mandatoryLeave: (weeks: number) => string;
    flexibleLeave: (weeks: number) => string;
    extraUntil8Leave: (weeks: number) => string;
    accumulatedLactancia: (val: number | string, unit: string) => string;
    extraPeriod: string;
    flexibleExtraLabel: (weeks: number) => string;
    flexibleExtraOption: (remaining: number) => string;

    birthDate: string;
    today: string;
    parentMandatory: (name: string) => string;
    parentFlexible: (name: string) => string;
    parentLactancia: (name: string) => string;
    parentExtraUntil8: (name: string) => string;
    parentExtra: (name: string) => string;

    hideParent: string;
    showParent: string;

    datePickerLocale: string;

    tooltipChangeDueDate: string;
    tooltipSwitchLang: string;
    tooltipSwitchTheme: (theme: string) => string;

    unitDays: string;
    unitWeeksShort: string;
    unitMonths: string;

    presetVacation: string;
    presetParental: string;
    presetUnpaid: string;
    presetCustom: string;

    yes: string;
    no: string;

    errorTitle: string;
    errorReset: string;

    regimeLabel: string;
    regimeOption: (regime: string) => string;
    regimeHint: (regime: string) => string;
    convenioDaysLabel: string;
    convenioDaysHint: string;
    extraWeeksLabel: (weeks: number) => string;
    extraWeeksHint: string;
    anticipatedNotAvailable: string;
    gestationLeave: (weeks: number) => string;
    gestationBadge: string;
    gestationTooltip: string;
    convenioLeave: (days: number) => string;
    accumulatedLactanciaNatural: (days: number) => string;
    lactanciaEstimateHintPublic: string;
    parentConvenio: (name: string) => string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const en: TranslationKeys = {
    documentTitle: 'Parental Leave Planner (Spain)',
    wizardTitle: '🇪🇸 Parental Leave Planner',
    wizardSubtitle: 'Plan your Spanish birth and childcare leave',
    back: '← Back',
    next: 'Next →',
    calculate: 'Calculate →',
    editWarning: 'Recalculating will discard any manual changes you made in the calendar.',
    invalidShareLink:
        'The shared link is not valid or was created with an older version of the planner.',

    stepDueDate: 'Due date',
    stepParents: 'Family',
    stepNames: 'Names',
    stepDetails: 'Details',
    stepLeaveMode: 'Leave mode',
    stepWhoStarts: 'Who starts',

    dueDateTitle: "What's the due date?",
    dueDateDescription:
        'Enter the expected due date, or the actual birth date if the baby is already born. You can change it later from the calendar.',
    dueDatePlaceholder: 'Select a date…',
    oldRegimeWarning:
        'Births before 31 July 2025 fall under the previous rules (16 weeks). This planner only models the current regime.',

    parentCountTitle: 'What kind of family?',
    parentCountTwo: 'Two parents',
    parentCountTwoDesc: (weeks) => `${weeks} weeks each`,
    parentCountSingle: 'Single-parent family',
    parentCountSingleDesc: (weeks) => `One parent, ${weeks} weeks in total`,

    namesTitle: "What are the parents' names?",
    namesDescription: 'Enter a name and pick a colour for each parent.',
    namePlaceholder: (n) => `Parent ${n} name`,
    colorOption: (name) => `${name} colour`,

    detailsTitle: 'A few details',
    detailsDescription:
        'These affect the number of weeks. The defaults cover the most common case.',
    babiesLabel: 'Babies',
    babiesOption: (n) => (n === 1 ? 'One' : n === 2 ? 'Twins' : 'Triplets'),
    disabilityLabel: 'Child with a disability',
    disabilityHint: 'Adds one extra week per parent (two for a single parent).',
    motherLabel: 'Biological mother',
    motherHint: 'Only the biological mother may start part of her leave before the birth.',
    motherNone: 'None / not applicable',
    anticipatedLabel: 'Weeks taken before the due date',
    anticipatedHint: 'Up to 4 flexible weeks may be taken before the expected due date.',
    allowanceSummary: (mandatory, flexible, extra) =>
        `Per parent: ${mandatory} mandatory + ${flexible} flexible weeks (until 12 months) + ${extra} weeks until age 8 = ${mandatory + flexible + extra} weeks.`,

    leaveModeTitle: 'How do you want to organise the leave?',
    leaveModeDescription:
        'Take the leave at the same time, or stagger it so that one parent is always at home.',
    modeTogether: 'Together',
    modeTogetherDesc:
        "Both parents take all their leave at the same time. You'll be home together but return to work sooner.",
    modeOptimized: 'Staggered',
    modeOptimizedDesc:
        'After the 6 mandatory weeks, one parent continues while the other returns to work and takes their weeks later. Maximises time with the baby.',

    firstParentTitle: 'Who continues after the mandatory weeks?',
    firstParentDescription:
        'The other parent returns to work after the 6 mandatory weeks and takes the remaining leave once the first parent goes back.',
    hintFirstParent: '🏠 Stays home first',
    hintSecondParent: '🏢 Returns to work, takes leave later',

    scheduleTitle: '🗓️ Leave schedule',
    dueDate: 'Due date',
    mode: 'Mode',
    modeLabelTogether: 'Together',
    modeLabelOptimized: 'Staggered',
    btnEdit: '✏️ Edit',
    btnReset: '↺ Reset',
    btnResetCustom: '↺ Reset',
    resetTooltip: 'Start over',
    resetCustomTooltip: 'Reset this parent to the standard schedule',
    btnAddPeriod: '+ Add period',
    add: 'Add',
    cancel: 'Cancel',
    btnShare: '🔗 Share',
    shareSuccess: 'Link copied to clipboard!',
    shareError: 'Could not copy the link',
    legalDisclaimer:
        'Planning tool based on art. 48.4 of the Spanish Workers’ Statute (as amended by RDL 9/2025). It is not legal advice: confirm dates with your employer and the INSS.',

    requiredByLaw: '🔒 Required by law',
    requiredByLawTooltip:
        'Six uninterrupted full-time weeks starting on the birth date. Cannot be changed.',
    anticipatedBadge: 'Before the birth',
    anticipatedTooltip:
        'Flexible weeks the biological mother takes before the expected due date. Change it from the wizard.',
    dragToReorder: 'Drag to reorder',
    moveEarlier: 'Move earlier',
    moveLater: 'Move later',
    clickToEdit: 'Edit duration',
    clickToEditStartDate: 'Edit start date',
    remove: 'Remove',
    warnAfterFirstBirthday: 'Flexible weeks must be used before the child turns 12 months.',
    warnAfterEighthBirthday: 'These weeks must be used before the child turns 8.',
    lactanciaEstimateHint:
        'Estimate: one hour per working day until 9 months, accumulated into full days. Your collective agreement may differ.',

    workTimeline: '🏢 Work timeline',
    stopsWorking: 'Stops working',
    returnsToWork: 'Returns to work',
    returnsToWorkFinal: 'Returns to work (final)',

    periodNamePlaceholder: 'Period name…',

    anticipatedLeave: (weeks) => `Before the birth (${weeks} ${plural(weeks, 'week', 'weeks')})`,
    mandatoryLeave: (weeks) => `Mandatory leave (${weeks} weeks)`,
    flexibleLeave: (weeks) => `Flexible leave (${weeks} ${plural(weeks, 'week', 'weeks')})`,
    extraUntil8Leave: (weeks) =>
        `Extra weeks until age 8 (${weeks} ${plural(weeks, 'week', 'weeks')})`,
    accumulatedLactancia: (val, unit) => {
        const n = Number(val);
        if (unit === 'weeks') return `Accumulated lactancia (${val} ${plural(n, 'week', 'weeks')})`;
        if (unit === 'months')
            return `Accumulated lactancia (${val} ${plural(n, 'month', 'months')})`;
        return `Accumulated lactancia (${val} ${plural(n, 'day', 'days')})`;
    },
    extraPeriod: 'Extra period',
    flexibleExtraLabel: (weeks) =>
        `📅 Flexible leave, extra block (${weeks} ${plural(weeks, 'week', 'weeks')})`,
    flexibleExtraOption: (remaining) =>
        `📅 Flexible leave (${remaining} ${plural(remaining, 'week', 'weeks')} left)`,

    birthDate: 'Birth date',
    today: 'Today',
    parentMandatory: (name) => `${name} — Mandatory`,
    parentFlexible: (name) => `${name} — Flexible`,
    parentLactancia: (name) => `${name} — Lactancia`,
    parentExtraUntil8: (name) => `${name} — Weeks until age 8`,
    parentExtra: (name) => `${name} — Extra periods`,

    hideParent: 'Hide this parent',
    showParent: 'Show this parent',

    datePickerLocale: 'en-GB',

    tooltipChangeDueDate: 'Change due date',
    tooltipSwitchLang: 'Cambiar a español',
    tooltipSwitchTheme: (theme) => `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`,

    unitDays: 'days',
    unitWeeksShort: 'weeks',
    unitMonths: 'months',

    presetVacation: 'Holidays',
    presetParental: 'Parental leave (unpaid, up to 8 weeks)',
    presetUnpaid: 'Unpaid leave',
    presetCustom: 'Custom',

    yes: 'Yes',
    no: 'No',

    errorTitle: 'Something went wrong',
    errorReset: 'Reset the application',

    regimeLabel: 'Employment regime',
    regimeOption: (regime) =>
        regime === 'et'
            ? 'Private sector (Estatuto de los Trabajadores)'
            : regime === 'ebep'
              ? 'Public employee (EBEP)'
              : 'SERMAS (Madrid health service)',
    regimeHint: (regime) =>
        regime === 'et'
            ? 'Lactancia until 9 months. Your collective agreement may add paid days: enter them below.'
            : regime === 'ebep'
              ? 'Lactancia until 12 months. No weeks can be taken before the birth.'
              : 'SERMAS pact: paid leave from week 37, 10 extra paid days for the biological mother and 30 calendar days of accumulated lactancia (until 12 months).',
    convenioDaysLabel: 'Extra paid days from your employer or agreement',
    convenioDaysHint: 'Calendar days added right after the birth leave. Leave 0 if none.',
    extraWeeksLabel: (weeks) =>
        `Take the ${weeks} paid ${plural(weeks, 'week', 'weeks')} until age 8 now?`,
    extraWeeksHint:
        'They are paid and you may keep them for any time until the child turns 8. Choose No to leave them off the calendar.',
    anticipatedNotAvailable: 'Public employees cannot start the leave before the birth.',
    gestationLeave: (weeks) =>
        `Paid leave before the birth (${weeks} ${plural(weeks, 'week', 'weeks')})`,
    gestationBadge: 'From week 37',
    gestationTooltip:
        'SERMAS paid leave from pregnancy week 37 (35 for multiple births) plus the special sick leave from week 39. Does not use up any leave weeks.',
    convenioLeave: (days) => `Extra paid days (${days} ${plural(days, 'day', 'days')})`,
    accumulatedLactanciaNatural: (days) =>
        `Accumulated lactancia (${days} calendar ${plural(days, 'day', 'days')})`,
    lactanciaEstimateHintPublic:
        'Estimate: one hour per working day until 12 months, accumulated into full days. Check your administration’s rule.',
    parentConvenio: (name) => `${name} — Extra paid days`,
};
