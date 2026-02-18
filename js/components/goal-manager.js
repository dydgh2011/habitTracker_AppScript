/**
 * Goal Manager — Handles daily and monthly goal checkbox logic
 */

import { isFieldScheduledForDate } from '../utils/schedule-utils.js';

/**
 * Compute the daily goal completion rate (0.0 - 1.0)
 * Only counts goals that are scheduled for the given date.
 * @param {Object} dailyGoals - { "goal name": true/false, ... }
 * @param {Object} schema - The full schema
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {number} day
 * @returns {number} Completion rate from 0 to 1
 */
export function computeDailyCompletion(dailyGoals, schema, year, month, day) {
    const dailyGoalsDef = schema['Daily Goals'];
    if (!dailyGoalsDef) return 0;

    let totalGoals = 0;
    let checked = 0;

    for (const [goalName, goalDef] of Object.entries(dailyGoalsDef)) {
        if (!isFieldScheduledForDate(goalDef.schedule, year, month, day)) {
            continue;
        }
        totalGoals++;
        if (dailyGoals && dailyGoals[goalName] === true) {
            checked++;
        }
    }

    return totalGoals > 0 ? checked / totalGoals : 0;
}

/**
 * Compute the monthly goal completion rate (0.0 - 1.0)
 * @param {Object} goals - { "goal name": true/false, ... }
 * @returns {number} Completion rate from 0 to 1
 */
export function computeMonthlyCompletion(goals) {
    if (!goals) return 0;
    const entries = Object.values(goals);
    if (entries.length === 0) return 0;

    let checked = 0;
    for (const val of entries) {
        if (val === true) checked++;
    }

    return checked / entries.length;
}

/**
 * Create an empty daily goals object from the schema
 */
export function createEmptyDailyGoals(schema) {
    const goals = {};
    const dailyGoalsSection = schema['Daily Goals'];
    if (dailyGoalsSection) {
        for (const key of Object.keys(dailyGoalsSection)) {
            goals[key] = false;
        }
    }
    return goals;
}

/**
 * Create an empty monthly goals object from the schema
 */
export function createEmptyMonthlyGoals(schema) {
    const goals = {};
    const monthlyGoalsSection = schema['Monthly Goals'];
    if (monthlyGoalsSection) {
        for (const key of Object.keys(monthlyGoalsSection)) {
            goals[key] = false;
        }
    }
    return goals;
}

/**
 * Create an empty fields object for a day, based on the schema
 */
export function createEmptyFields(schema) {
    const fields = {};
    for (const [sectionName, section] of Object.entries(schema)) {
        if (sectionName === 'Daily Goals' || sectionName === 'Monthly Goals') continue;
        fields[sectionName] = {};
        for (const fieldName of Object.keys(section)) {
            fields[sectionName][fieldName] = null;
        }
    }
    return fields;
}
