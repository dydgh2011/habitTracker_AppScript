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
    // UI
    weekend: '#f8f9fa',
    today: '#fff3cd',
    header: '#1a73e8',
    headerText: '#ffffff',
    dailyGoalsBg: '#e8f5e9',
    monthlyGoalsBg: '#fce8e6',
    lightGray: '#f1f3f4',
    monthlyGoalCheckbox: '#fff2cc',

    // Charts
    chartGreen: '#34A853',
    chartBlue: '#4285F4',
    chartRed: '#EA4335',
    chartYellow: '#FBBC04',
    chartOrange: '#FF6D01',
    chartPurple: '#9C27B0',

    // Heatmaps
    greenHeatmap: { min: '#ebedf0', mid: '#9be9a8', max: '#216e39' },
    redHeatmap: { min: '#ffebee', mid: '#ef5350', max: '#b71c1c' }
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
export const MONGO_CONFIG_KEY = 'mongoConfig';
