/**
 * Schedule Utils — Determines if a field is active on a given date
 *
 * Schedule types:
 *   - "everyday" or absent: field shows every day (default)
 *   - "weekdays": field shows on specific days of the week (0=Sun..6=Sat)
 *   - "interval": field shows every N days from a start date
 *   - "dates": field shows on explicit dates (YYYY-MM-DD strings)
 */

/**
 * Check if a field's schedule applies to a given date.
 * @param {Object|undefined} schedule - The field's schedule definition
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {number} day
 * @returns {boolean}
 */
export function isFieldScheduledForDate(schedule, year, month, day) {
    if (!schedule || !schedule.type || schedule.type === 'everyday') {
        return true;
    }

    const date = new Date(year, month - 1, day);

    if (schedule.type === 'weekdays') {
        const dayOfWeek = date.getDay();
        return Array.isArray(schedule.days) && schedule.days.includes(dayOfWeek);
    }

    if (schedule.type === 'interval') {
        if (!schedule.startDate || !schedule.every || schedule.every < 1) return true;
        const start = new Date(schedule.startDate);
        const diffMs = date.getTime() - start.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays % schedule.every === 0;
    }

    if (schedule.type === 'dates') {
        if (!Array.isArray(schedule.dates)) return true;
        const dateId = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return schedule.dates.includes(dateId);
    }

    return true;
}

/**
 * Get a human-readable description of a schedule.
 * @param {Object|undefined} schedule
 * @returns {string}
 */
export function describeSchedule(schedule) {
    if (!schedule || !schedule.type || schedule.type === 'everyday') {
        return 'Every day';
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (schedule.type === 'weekdays' && Array.isArray(schedule.days)) {
        if (schedule.days.length === 0) return 'No days selected';
        if (schedule.days.length === 7) return 'Every day';
        const sorted = [...schedule.days].sort((a, b) => a - b);
        return sorted.map(d => dayNames[d]).join(', ');
    }

    if (schedule.type === 'interval') {
        if (schedule.every === 1) return 'Every day';
        return `Every ${schedule.every} days`;
    }

    if (schedule.type === 'dates') {
        if (!Array.isArray(schedule.dates) || schedule.dates.length === 0) return 'No dates';
        return `${schedule.dates.length} specific date${schedule.dates.length > 1 ? 's' : ''}`;
    }

    return 'Every day';
}
