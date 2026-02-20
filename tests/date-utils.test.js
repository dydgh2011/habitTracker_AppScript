import { describe, it, expect } from 'vitest';
import {
    getDaysInMonth,
    isWeekend,
    isToday,
    getWeekNumber,
    toDateId,
    parseDateId,
    formatDateLong,
    getDayName,
    toMonthId
} from '../js/utils/date-utils.js';

describe('Date Utilities', () => {
    describe('getDaysInMonth', () => {
        it('should return correct days for standard months', () => {
            expect(getDaysInMonth(2026, 1)).toBe(31); // Jan
            expect(getDaysInMonth(2026, 4)).toBe(30); // Apr
        });

        it('should account for leap years', () => {
            expect(getDaysInMonth(2024, 2)).toBe(29); // Leap year Feb
            expect(getDaysInMonth(2026, 2)).toBe(28); // Standard year Feb
        });
    });

    describe('isWeekend', () => {
        it('should return true for Saturdays and Sundays', () => {
            expect(isWeekend(2026, 2, 21)).toBe(true); // Sat
            expect(isWeekend(2026, 2, 22)).toBe(true); // Sun
        });

        it('should return false for weekdays', () => {
            expect(isWeekend(2026, 2, 20)).toBe(false); // Fri
            expect(isWeekend(2026, 2, 16)).toBe(false); // Mon
        });
    });

    describe('getWeekNumber', () => {
        it('should return correct ISO week number', () => {
            expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1); // Jan 1st 2026 (week 1)
            expect(getWeekNumber(new Date(2023, 11, 31))).toBe(52); // Dec 31st 2023
        });
    });

    describe('toMonthId and toDateId', () => {
        it('should format date ID correctly with padding', () => {
            expect(toDateId(2026, 2, 5)).toBe('2026-02-05');
            expect(toDateId(2026, 12, 15)).toBe('2026-12-15');
        });

        it('should format month ID correctly with padding', () => {
            expect(toMonthId(2026, 2)).toBe('2026-02');
            expect(toMonthId(2026, 10)).toBe('2026-10');
        });
    });

    describe('parseDateId', () => {
        it('should extract correct components from a date ID', () => {
            expect(parseDateId('2026-02-05')).toEqual({ year: 2026, month: 2, day: 5 });
        });
    });

    describe('formatDateLong', () => {
        it('should stringify dates gracefully', () => {
            expect(formatDateLong(2026, 2, 5)).toBe('February 5, 2026');
            expect(formatDateLong(2024, 1, 1)).toBe('January 1, 2024');
        });
    });

    describe('getDayName', () => {
        it('should return correct literal day name', () => {
            // Jan 1 2026 was a Thursday
            expect(getDayName(2026, 1, 1)).toBe('Thursday');
            // Feb 22 2026 is a Sunday
            expect(getDayName(2026, 2, 22)).toBe('Sunday');
        });
    });

});
