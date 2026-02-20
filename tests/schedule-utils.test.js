import { describe, it, expect } from 'vitest';
import { isFieldScheduledForDate, describeSchedule } from '../js/utils/schedule-utils.js';

describe('Schedule Utilities', () => {

    describe('isFieldScheduledForDate()', () => {
        const year = 2026;
        const month = 2; // February

        it('should default to true for missing or "everyday" schedules', () => {
            expect(isFieldScheduledForDate(undefined, year, month, 15)).toBe(true);
            expect(isFieldScheduledForDate({ type: 'everyday' }, year, month, 15)).toBe(true);
            expect(isFieldScheduledForDate({}, year, month, 15)).toBe(true);
        });

        it('should correctly filter "weekdays" schedules', () => {
            // Feb 15, 2026 is a Sunday (0)
            // Feb 16, 2026 is a Monday (1)
            const mwfSchedule = { type: 'weekdays', days: [1, 3, 5] };

            expect(isFieldScheduledForDate(mwfSchedule, year, month, 15)).toBe(false); // Sunday
            expect(isFieldScheduledForDate(mwfSchedule, year, month, 16)).toBe(true);  // Monday
            expect(isFieldScheduledForDate(mwfSchedule, year, month, 17)).toBe(false); // Tuesday
            expect(isFieldScheduledForDate(mwfSchedule, year, month, 18)).toBe(true);  // Wednesday
        });

        it('should correctly filter "interval" schedules', () => {
            // Start Date: Feb 1, 2026. Every 3 days.
            // Active on: Feb 1, Feb 4, Feb 7, Dec 10...
            const intervalSchedule = { type: 'interval', startDate: '2026-02-01', every: 3 };

            expect(isFieldScheduledForDate(intervalSchedule, year, month, 1)).toBe(true);
            expect(isFieldScheduledForDate(intervalSchedule, year, month, 2)).toBe(false);
            expect(isFieldScheduledForDate(intervalSchedule, year, month, 3)).toBe(false);
            expect(isFieldScheduledForDate(intervalSchedule, year, month, 4)).toBe(true);

            // Should be false for dates BEFORE the start date
            expect(isFieldScheduledForDate(intervalSchedule, 2026, 1, 31)).toBe(false);

            // Defaults to true if interval data is malformed
            expect(isFieldScheduledForDate({ type: 'interval' }, year, month, 1)).toBe(true);
        });

        it('should correctly filter explicit "dates" schedules', () => {
            const datesSchedule = { type: 'dates', dates: ['2026-02-14', '2026-02-28'] };

            expect(isFieldScheduledForDate(datesSchedule, year, month, 14)).toBe(true);
            expect(isFieldScheduledForDate(datesSchedule, year, month, 28)).toBe(true);
            expect(isFieldScheduledForDate(datesSchedule, year, month, 15)).toBe(false);

            // Defers to true if completely malformed structure
            expect(isFieldScheduledForDate({ type: 'dates' }, year, month, 15)).toBe(true);
        });
    });

    describe('describeSchedule()', () => {
        it('should describe everyday schedules', () => {
            expect(describeSchedule({ type: 'everyday' })).toBe('Every day');
            expect(describeSchedule(undefined)).toBe('Every day');
        });

        it('should describe weekdays schedules', () => {
            expect(describeSchedule({ type: 'weekdays', days: [1, 3, 5] })).toBe('Mon, Wed, Fri');
            expect(describeSchedule({ type: 'weekdays', days: [0, 6] })).toBe('Sun, Sat');
            expect(describeSchedule({ type: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day');
            expect(describeSchedule({ type: 'weekdays', days: [] })).toBe('No days selected');
        });

        it('should describe interval schedules', () => {
            expect(describeSchedule({ type: 'interval', every: 3 })).toBe('Every 3 days');
            expect(describeSchedule({ type: 'interval', every: 1 })).toBe('Every day');
        });

        it('should describe explicit dates schedules', () => {
            expect(describeSchedule({ type: 'dates', dates: ['2026-02-10', '2026-02-15'] })).toBe('2 specific dates');
            expect(describeSchedule({ type: 'dates', dates: ['2026-02-10'] })).toBe('1 specific date');
            expect(describeSchedule({ type: 'dates', dates: [] })).toBe('No dates');
        });
    });

});
