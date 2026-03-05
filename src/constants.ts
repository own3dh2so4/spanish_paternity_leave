import type { ColorPalette, ColorPaletteId, LeaveMode, LeaveType } from './types';

// Leave duration constants (in weeks)
export const MANDATORY_WEEKS = 6;
export const FLEXIBLE_WEEKS = 11;
export const TOTAL_LEAVE_WEEKS = MANDATORY_WEEKS + FLEXIBLE_WEEKS;

// Childcare leave (permiso de cuidado del hijo hasta los 8 años)
export const CUIDADO_TOTAL_WEEKS = 8;
export const CUIDADO_PAID_WEEKS = 2;

// Lactancia constants
export const LACTANCIA_MAX_DAYS = 15;
export const LACTANCIA_HOURS_PER_DAY = 1;
export const WORK_HOURS_PER_DAY = 8;
export const BABY_LACTANCIA_MONTHS = 9;

// Leave types
export const LEAVE_TYPES: Record<string, LeaveType> = {
    MANDATORY: 'mandatory',
    FLEXIBLE: 'flexible',
    LACTANCIA: 'lactancia',
    CUIDADO: 'cuidado',
    EXTRA: 'extra',
};

// Leave modes
export const LEAVE_MODES: Record<string, LeaveMode> = {
    TOGETHER: 'together',
    OPTIMIZED: 'optimized',
};

// Color palettes for parents to choose from
export const COLOR_PALETTES: Record<ColorPaletteId, ColorPalette> = {
    indigo: {
        id: 'indigo',
        name: 'Indigo',
        mandatory: '#4F46E5',
        flexible: '#818CF8',
        lactancia: '#C7D2FE',
        cuidado: '#10B981',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        accent: '#4F46E5',
    },
    pink: {
        id: 'pink',
        name: 'Pink',
        mandatory: '#DB2777',
        flexible: '#F472B6',
        lactancia: '#FBCFE8',
        cuidado: '#10B981',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #DB2777, #9333EA)',
        accent: '#DB2777',
    },
    teal: {
        id: 'teal',
        name: 'Teal',
        mandatory: '#0D9488',
        flexible: '#2DD4BF',
        lactancia: '#99F6E4',
        cuidado: '#A78BFA',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #0D9488, #2563EB)',
        accent: '#0D9488',
    },
    amber: {
        id: 'amber',
        name: 'Amber',
        mandatory: '#D97706',
        flexible: '#FBBF24',
        lactancia: '#FDE68A',
        cuidado: '#10B981',
        extra: '#38BDF8',
        gradient: 'linear-gradient(135deg, #D97706, #EA580C)',
        accent: '#D97706',
    },
    rose: {
        id: 'rose',
        name: 'Rose',
        mandatory: '#E11D48',
        flexible: '#FB7185',
        lactancia: '#FECDD3',
        cuidado: '#10B981',
        extra: '#FB923C',
        gradient: 'linear-gradient(135deg, #E11D48, #9F1239)',
        accent: '#E11D48',
    },
};

// Overlap color when both parents have leave on the same day
export const OVERLAP_COLOR = '#F59E0B';

// Wizard steps
export const WIZARD_STEPS = [
    { id: 'dueDate', label: 'Due Date' },
    { id: 'parentCount', label: 'Parents' },
    { id: 'names', label: 'Names' },
    { id: 'leaveMode', label: 'Leave Mode' },
    { id: 'firstParent', label: 'Who Starts' },
    { id: 'cuidado', label: 'Childcare' },
];

// Day and month names for calendar rendering
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

// localStorage key
export const STORAGE_KEY = 'paternity_leave_data';
