import type { TranslationKeys } from './en';

export const es: TranslationKeys = {
    // ── Wizard ──────────────────────────────────────────────────────────────
    wizardTitle: '🇪🇸 Planificador de Baja Parental',
    wizardSubtitle: 'Planifica tu baja por paternidad/maternidad en España',
    back: '← Atrás',
    next: 'Siguiente →',
    calculate: 'Calcular →',

    // Step labels
    stepDueDate: 'Fecha parto',
    stepParents: 'Progenitores',
    stepNames: 'Nombres',
    stepLeaveMode: 'Modo de baja',
    stepWhoStarts: 'Quién empieza',
    stepChildcare: 'Cuidado hijo',

    // StepDueDate
    dueDateTitle: '¿Cuál es la fecha prevista de parto?',
    dueDateDescription: 'Introduce la fecha de parto prevista. Puedes modificarla más tarde desde la vista del calendario.',
    dueDatePlaceholder: 'Selecciona una fecha…',
    dueDateLabel: 'Fecha de parto',

    // StepParentCount
    parentCountTitle: '¿Cuántos progenitores van a disfrutar la baja?',
    parentCountOne: '1 progenitor',
    parentCountTwo: '2 progenitores',

    // StepNames
    namesTitle: '¿Cómo se llaman los progenitores?',
    namesDescription: 'Introduce los nombres y elige un color para cada progenitor.',
    namePlaceholder: (n: number) => `Nombre progenitor ${n}`,
    colorLabel: 'Color',

    // StepLeaveMode
    leaveModeTitle: '¿Cómo queréis organizar la baja?',
    leaveModeDescription: 'Elige si ambos progenitores disfrutan la baja al mismo tiempo o la escalonan para maximizar la cobertura total.',
    modeTogether: 'Juntos',
    modeTogetherDesc: 'Ambos progenitores disfrutan toda la baja al mismo tiempo. Estaréis en casa a la vez pero volveréis al trabajo antes.',
    modeOptimized: 'Optimizado',
    modeOptimizedDesc: 'Escalonar la baja flexible para que siempre haya un progenitor en casa. Maximiza el tiempo total con el bebé.',

    // StepFirstParent
    firstParentTitle: '¿Quién empieza primero la baja flexible?',
    firstParentDescription: 'En el modo optimizado, un progenitor termina la baja obligatoria y comienza la baja flexible mientras el otro todavía está en la baja obligatoria.',

    // StepCuidado
    cuidadoTitle: 'Permiso de cuidado del hijo (opcional)',
    cuidadoDescription: 'La ley española reconoce hasta 8 semanas de permiso de cuidado del hijo por progenitor para menores de 8 años. Las primeras 2 semanas son retribuidas.',
    cuidadoCheck: (name: string) => `${name} disfrutará del permiso de cuidado`,
    cuidadoWeeks: 'Semanas',
    cuidadoWeeksHint: (paid: number) => `Las primeras ${paid} semanas son retribuidas, el resto no.`,
    cuidadoMax: (max: number) => `Máximo ${max} semanas`,

    // ── Calendar ─────────────────────────────────────────────────────────────
    scheduleTitle: '🗓️ Calendario de bajas',
    dueDate: 'Fecha de parto',
    mode: 'Modo',
    modeLabelTogether: 'Juntos',
    modeLabelOptimized: 'Optimizado',
    btnEdit: '✏️ Editar',
    btnReset: '↺ Reiniciar',
    btnPrint: '🖨️ Imprimir',
    btnResetCustom: '↺ Reiniciar',
    resetTooltip: 'Empezar de nuevo',
    resetCustomTooltip: 'Restablecer días de baja estándar',
    btnAddPeriod: '+ Añadir período',
    add: 'Añadir',
    cancel: 'Cancelar',
    btnShare: '🔗 Compartir',
    shareSuccess: '¡Enlace copiado al portapapeles!',
    shareError: 'Error al copiar el enlace',

    // Summary card
    requiredByLaw: '🔒 Obligatorio por ley',
    requiredByLawTooltip: 'Esta baja es obligatoria por ley española y no puede modificarse',
    dragToReorder: 'Arrastra para reordenar',
    clickToEdit: 'Clic para editar',
    clickToEditStartDate: 'Clic para editar la fecha de inicio',
    shifted: 'desplazado',
    custom: 'personalizado',
    remove: 'Eliminar',

    // Work timeline
    workTimeline: '🏢 Calendario laboral',
    stopsWorking: 'Deja de trabajar',
    returnsToWork: 'Vuelta al trabajo',
    returnsToWorkFinal: 'Vuelta al trabajo (definitiva)',
    returnsToWorkOn: 'Vuelta al trabajo el',

    // Add-period form
    periodNamePlaceholder: 'Nombre del período…',

    // Leave type labels
    mandatoryLeave: (weeks: number) => `Baja obligatoria (${weeks} semanas)`,
    flexibleLeave: (weeks: number) => `Baja flexible (${weeks} semanas)`,
    accumulatedLactancia: (val: number | string, unit: string) => `Lactancia acumulada (${val} ${unit === 'days' ? 'días' : unit === 'weeks' ? 'semanas' : 'meses'})`,
    childcareLeavePaidUnpaid: (paid: number, unpaid: number) => `Permiso de cuidado (${paid} sem. retribuidas + ${unpaid} sem. no retribuidas)`,
    childcareLeavePaid: (weeks: number) => `Permiso de cuidado (${weeks} semana${weeks !== 1 ? 's' : ''} retribuida${weeks !== 1 ? 's' : ''})`,
    childcareLeave: 'Permiso de cuidado del hijo',
    extraPeriod: 'Período adicional',
    flexibleExtra: (rem: number) => `📅 Baja flexible (quedan ${rem} sem.)`,

    // Legend
    legend: 'Leyenda',
    birthDate: 'Fecha de nacimiento',
    parentMandatory: (name: string) => `${name} — Obligatoria`,
    parentFlexible: (name: string) => `${name} — Flexible`,
    parentLactancia: (name: string) => `${name} — Lactancia`,
    parentChildcare: (name: string) => `${name} — Cuidado hijo`,
    parentExtra: (name: string) => `${name} — Períodos adicionales`,

    // Hide parent toggle
    hideParent: 'Ocultar datos del progenitor',
    showParent: 'Mostrar datos del progenitor',

    // Datepicker locale
    datePickerLocale: 'es',
};
