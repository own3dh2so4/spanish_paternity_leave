import type { TranslationKeys } from './en';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const es: TranslationKeys = {
    documentTitle: 'Planificador de Permiso Parental (España)',
    wizardTitle: '🇪🇸 Planificador de Permiso Parental',
    wizardSubtitle: 'Planifica el permiso por nacimiento y cuidado de menor',
    back: '← Atrás',
    next: 'Siguiente →',
    calculate: 'Calcular →',
    editWarning: 'Al recalcular se perderán los ajustes manuales que hayas hecho en el calendario.',
    invalidShareLink:
        'El enlace compartido no es válido o se creó con una versión anterior del planificador.',

    stepDueDate: 'Fecha parto',
    stepParents: 'Familia',
    stepNames: 'Nombres',
    stepDetails: 'Detalles',
    stepLeaveMode: 'Modo',
    stepWhoStarts: 'Quién sigue',

    dueDateTitle: '¿Cuál es la fecha prevista de parto?',
    dueDateDescription:
        'Introduce la fecha prevista de parto o, si el bebé ya ha nacido, la fecha de nacimiento. Podrás cambiarla desde el calendario.',
    dueDatePlaceholder: 'Selecciona una fecha…',
    oldRegimeWarning:
        'Los nacimientos anteriores al 31 de julio de 2025 se rigen por la normativa anterior (16 semanas). Este planificador sólo modela el régimen vigente.',

    parentCountTitle: '¿Qué tipo de familia sois?',
    parentCountTwo: 'Dos progenitores',
    parentCountTwoDesc: (weeks) => `${weeks} semanas cada uno`,
    parentCountSingle: 'Familia monoparental',
    parentCountSingleDesc: (weeks) => `Una única persona progenitora, ${weeks} semanas en total`,

    namesTitle: '¿Cómo os llamáis?',
    namesDescription: 'Introduce un nombre y elige un color para cada progenitor.',
    namePlaceholder: (n) => `Nombre del progenitor ${n}`,
    colorOption: (name) => `Color ${name}`,

    detailsTitle: 'Algunos detalles',
    detailsDescription:
        'Afectan al número de semanas. Los valores por defecto cubren el caso más habitual.',
    babiesLabel: 'Bebés',
    babiesOption: (n) => (n === 1 ? 'Uno' : n === 2 ? 'Gemelos' : 'Trillizos'),
    disabilityLabel: 'Hijo con discapacidad',
    disabilityHint: 'Añade una semana más por progenitor (dos en familias monoparentales).',
    motherLabel: 'Madre biológica',
    motherHint: 'Sólo la madre biológica puede empezar parte de su permiso antes del parto.',
    motherNone: 'Ninguna / no aplica',
    anticipatedLabel: 'Semanas antes de la fecha prevista de parto',
    anticipatedHint:
        'Puede adelantar hasta 4 semanas flexibles antes de la fecha prevista de parto.',
    allowanceSummary: (mandatory, flexible, extra) =>
        `Por progenitor: ${mandatory} semanas obligatorias + ${flexible} flexibles (hasta los 12 meses) + ${extra} hasta los 8 años = ${mandatory + flexible + extra} semanas.`,

    leaveModeTitle: '¿Cómo queréis organizar el permiso?',
    leaveModeDescription:
        'Disfrutarlo a la vez o escalonarlo para que siempre haya un progenitor en casa.',
    modeTogether: 'Juntos',
    modeTogetherDesc:
        'Ambos disfrutan todo el permiso al mismo tiempo. Estaréis en casa a la vez, pero volveréis antes al trabajo.',
    modeOptimized: 'Escalonado',
    modeOptimizedDesc:
        'Tras las 6 semanas obligatorias, uno continúa y el otro vuelve al trabajo y toma sus semanas más tarde. Maximiza el tiempo con el bebé.',

    firstParentTitle: '¿Quién continúa tras las semanas obligatorias?',
    firstParentDescription:
        'El otro progenitor vuelve al trabajo tras las 6 semanas obligatorias y disfruta el resto cuando el primero se reincorpora.',
    hintFirstParent: '🏠 Se queda en casa primero',
    hintSecondParent: '🏢 Vuelve al trabajo, disfruta el permiso después',

    scheduleTitle: '🗓️ Calendario del permiso',
    dueDate: 'Fecha de parto',
    mode: 'Modo',
    modeLabelTogether: 'Juntos',
    modeLabelOptimized: 'Escalonado',
    btnEdit: '✏️ Editar',
    btnReset: '↺ Reiniciar',
    btnResetCustom: '↺ Reiniciar',
    resetTooltip: 'Empezar de nuevo',
    resetCustomTooltip: 'Restablecer el calendario estándar de este progenitor',
    btnAddPeriod: '+ Añadir período',
    add: 'Añadir',
    cancel: 'Cancelar',
    btnShare: '🔗 Compartir',
    shareSuccess: '¡Enlace copiado al portapapeles!',
    shareError: 'No se pudo copiar el enlace',
    legalDisclaimer:
        'Herramienta de planificación basada en el art. 48.4 del Estatuto de los Trabajadores (RDL 9/2025). No es asesoramiento legal: confirma las fechas con tu empresa y con el INSS.',

    requiredByLaw: '🔒 Obligatorio por ley',
    requiredByLawTooltip:
        'Seis semanas ininterrumpidas a jornada completa desde el día del parto. No se pueden modificar.',
    anticipatedBadge: 'Antes del parto',
    anticipatedTooltip:
        'Semanas flexibles que la madre biológica adelanta antes de la fecha prevista de parto. Se cambian desde el asistente.',
    dragToReorder: 'Arrastra para reordenar',
    moveEarlier: 'Adelantar',
    moveLater: 'Retrasar',
    clickToEdit: 'Editar duración',
    clickToEditStartDate: 'Editar fecha de inicio',
    remove: 'Eliminar',
    warnAfterFirstBirthday:
        'Las semanas flexibles deben disfrutarse antes de que el menor cumpla 12 meses.',
    warnAfterEighthBirthday: 'Estas semanas deben disfrutarse antes de que el menor cumpla 8 años.',
    lactanciaEstimateHint:
        'Estimación: una hora por día laborable hasta los 9 meses, acumulada en jornadas completas. Tu convenio puede establecer otra cosa.',

    workTimeline: '🏢 Calendario laboral',
    stopsWorking: 'Deja de trabajar',
    returnsToWork: 'Vuelve al trabajo',
    returnsToWorkFinal: 'Vuelve al trabajo (definitiva)',

    periodNamePlaceholder: 'Nombre del período…',

    anticipatedLeave: (weeks) => `Antes del parto (${weeks} ${plural(weeks, 'semana', 'semanas')})`,
    mandatoryLeave: (weeks) => `Permiso obligatorio (${weeks} semanas)`,
    flexibleLeave: (weeks) => `Permiso flexible (${weeks} ${plural(weeks, 'semana', 'semanas')})`,
    extraUntil8Leave: (weeks) =>
        `Semanas adicionales hasta los 8 años (${weeks} ${plural(weeks, 'semana', 'semanas')})`,
    accumulatedLactancia: (val, unit) => {
        const n = Number(val);
        if (unit === 'weeks')
            return `Lactancia acumulada (${val} ${plural(n, 'semana', 'semanas')})`;
        if (unit === 'months') return `Lactancia acumulada (${val} ${plural(n, 'mes', 'meses')})`;
        return `Lactancia acumulada (${val} ${plural(n, 'día', 'días')})`;
    },
    extraPeriod: 'Período adicional',
    flexibleExtraLabel: (weeks) =>
        `📅 Permiso flexible, bloque adicional (${weeks} ${plural(weeks, 'semana', 'semanas')})`,
    flexibleExtraOption: (remaining) =>
        `📅 Permiso flexible (quedan ${remaining} ${plural(remaining, 'semana', 'semanas')})`,

    birthDate: 'Fecha de nacimiento',
    today: 'Hoy',
    parentMandatory: (name) => `${name} — Obligatorio`,
    parentFlexible: (name) => `${name} — Flexible`,
    parentLactancia: (name) => `${name} — Lactancia`,
    parentExtraUntil8: (name) => `${name} — Semanas hasta los 8 años`,
    parentExtra: (name) => `${name} — Períodos adicionales`,

    hideParent: 'Ocultar este progenitor',
    showParent: 'Mostrar este progenitor',

    datePickerLocale: 'es',

    tooltipChangeDueDate: 'Cambiar la fecha de parto',
    tooltipSwitchLang: 'Switch to English',
    tooltipSwitchTheme: (theme) => `Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`,

    unitDays: 'días',
    unitWeeksShort: 'sem.',
    unitMonths: 'meses',

    presetVacation: 'Vacaciones',
    presetParental: 'Permiso parental (no retribuido, hasta 8 semanas)',
    presetUnpaid: 'Permiso no retribuido',
    presetCustom: 'Personalizado',

    yes: 'Sí',
    no: 'No',

    errorTitle: 'Algo ha salido mal',
    errorReset: 'Reiniciar la aplicación',

    regimeLabel: 'Régimen laboral',
    regimeOption: (regime) =>
        regime === 'et'
            ? 'Empresa privada (Estatuto de los Trabajadores)'
            : regime === 'ebep'
              ? 'Empleado público (EBEP)'
              : 'SERMAS (Servicio Madrileño de Salud)',
    regimeHint: (regime) =>
        regime === 'et'
            ? 'Lactancia hasta los 9 meses. Si tu convenio añade días retribuidos, indícalos abajo.'
            : regime === 'ebep'
              ? 'Lactancia hasta los 12 meses. No se pueden adelantar semanas antes del parto.'
              : 'Pacto SERMAS: permiso retribuido desde la semana 37, 10 días retribuidos adicionales para la madre biológica y 30 días naturales de lactancia acumulada (hasta los 12 meses).',
    convenioDaysLabel: 'Días retribuidos adicionales de tu empresa o convenio',
    convenioDaysHint:
        'Días naturales que se añaden justo después del permiso de nacimiento. Deja 0 si no tienes.',
    extraWeeksLabel: (weeks) =>
        `¿Disfrutar ahora las ${weeks} ${plural(weeks, 'semana', 'semanas')} retribuidas hasta los 8 años?`,
    extraWeeksHint:
        'Son retribuidas y puedes reservarlas para cualquier momento hasta que el menor cumpla 8 años. Elige No para no añadirlas al calendario.',
    anticipatedNotAvailable: 'Los empleados públicos no pueden iniciar el permiso antes del parto.',
    gestationLeave: (weeks) =>
        `Permiso retribuido antes del parto (${weeks} ${plural(weeks, 'semana', 'semanas')})`,
    gestationBadge: 'Desde la semana 37',
    gestationTooltip:
        'Permiso retribuido del SERMAS desde la semana 37 de gestación (35 en parto múltiple) más la IT especial desde la semana 39. No consume semanas del permiso.',
    convenioLeave: (days) =>
        `Días retribuidos adicionales (${days} ${plural(days, 'día', 'días')})`,
    accumulatedLactanciaNatural: (days) =>
        `Lactancia acumulada (${days} ${plural(days, 'día natural', 'días naturales')})`,
    lactanciaEstimateHintPublic:
        'Estimación: una hora por día laborable hasta los 12 meses, acumulada en jornadas completas. Comprueba la regla de tu administración.',
    parentConvenio: (name) => `${name} — Días retribuidos adicionales`,
};
