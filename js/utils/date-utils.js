import { YEAR, MONTHS, MONTH_FULL } from '../config.js';

/**
 * Get number of days in a given month (1-indexed month)
 */
export function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/**
 * Check if a date falls on a weekend (Saturday=6 or Sunday=0)
 */
export function isWeekend(year, month, day) {
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    return dow === 0 || dow === 6;
}

/**
 * Check if a date is today
 */
export function isToday(year, month, day) {
    const now = new Date();
    return now.getFullYear() === year && (now.getMonth() + 1) === month && now.getDate() === day;
}

/**
 * Get the ISO week number for a date
 */
export function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get the day of week (0=Sun, 6=Sat)
 */
export function getDayOfWeek(year, month, day) {
    return new Date(year, month - 1, day).getDay();
}

/**
 * Format a date as YYYY-MM-DD (used as document _id)
 */
export function toDateId(year, month, day) {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

/**
 * Parse a date ID back to {year, month, day}
 */
export function parseDateId(dateId) {
    const parts = dateId.split('-');
    return {
        year: parseInt(parts[0]),
        month: parseInt(parts[1]),
        day: parseInt(parts[2])
    };
}

/**
 * Format a date as "Month Day, Year" (e.g., "February 16, 2026")
 */
export function formatDateLong(year, month, day) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month - 1]} ${day}, ${year}`;
}

/**
 * Get day name (e.g., "Monday")
 */
export function getDayName(year, month, day) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(year, month - 1, day).getDay()];
}

/**
 * Get the month index (0-based) from a short/full month name or numeric string
 */
export function monthNameToIndex(name) {
    if (!name) return -1;
    const lower = name.toLowerCase();

    // Check short names (Jan, Feb...)
    const shortIdx = MONTHS.findIndex(m => m.toLowerCase() === lower);
    if (shortIdx >= 0) return shortIdx;

    // Check full names (January, February...)
    const fullIdx = MONTH_FULL.findIndex(m => m.toLowerCase() === lower);
    if (fullIdx >= 0) return fullIdx;

    // Try numeric string (1-12)
    const num = parseInt(name);
    if (!isNaN(num) && num >= 1 && num <= 12 && !name.includes('-')) {
        return num - 1;
    }

    return -1;
}

/**
 * Get all dates in a year as an array of {year, month, day} objects
 */
export function getAllDatesInYear(year) {
    const dates = [];
    for (let m = 1; m <= 12; m++) {
        const days = getDaysInMonth(year, m);
        for (let d = 1; d <= days; d++) {
            dates.push({ year, month: m, day: d });
        }
    }
    return dates;
}

/**
 * Get the column index for a day in the heatmap grid
 * Returns { row: dayOfWeek(0-6), col: weekIndex(0-52) }
 */
export function getHeatmapPosition(year, month, day) {
    const date = new Date(year, month - 1, day);
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((date - startOfYear) / 86400000);
    const startDay = startOfYear.getDay(); // day of week for Jan 1
    const adjustedDay = dayOfYear + startDay;
    return {
        row: date.getDay(),
        col: Math.floor(adjustedDay / 7)
    };
}

/**
 * Format month ID (e.g., "2026-02")
 */
export function toMonthId(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}
