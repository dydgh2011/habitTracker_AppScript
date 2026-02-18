// Global configuration — ported from the original Apps Script CONFIG

export const YEAR = 2026;

export const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const COLORS = {
    // UI — organic warm tones
    weekend: '#f7f4f0',
    today: '#fdf6e3',
    header: '#4a82b4',
    headerText: '#ffffff',
    dailyGoalsBg: '#edf5f0',
    monthlyGoalsBg: '#faf0ee',
    lightGray: '#f7f4f0',
    monthlyGoalCheckbox: '#fdf6e3',

    // Charts — refined palette
    chartGreen: '#3d8b5e',
    chartBlue: '#4a82b4',
    chartRed: '#c2544a',
    chartYellow: '#c49a3c',
    chartOrange: '#d07a4a',
    chartPurple: '#7d6baa',

    // Heatmaps — refined gradients
    greenHeatmap: { min: '#f0eeeb', mid: '#8ec4a0', max: '#2d7a47' },
    redHeatmap: { min: '#faf0ee', mid: '#dfa090', max: '#993e34' }
};

// Chart color palette — assigned in order to series
export const CHART_PALETTE = [
    COLORS.chartGreen,
    COLORS.chartBlue,
    COLORS.chartRed,
    COLORS.chartYellow,
    COLORS.chartOrange,
    COLORS.chartPurple
];

// Database names
export const DB_NAME = 'habitTracker';
export const FIREBASE_CONFIG_KEY = 'firebaseConfig';
