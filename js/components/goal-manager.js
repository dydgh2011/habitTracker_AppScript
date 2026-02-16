/**
 * Goal Manager — Handles daily and monthly goal checkbox logic
 */

import { countDailyGoals } from '../schema/schema-manager.js';

/**
 * Compute the daily goal completion rate (0.0 - 1.0)
 * @param {Object} dailyGoals - { "goal name": true/false, ... }
 * @param {Object} schema - The full schema
 * @returns {number} Completion rate from 0 to 1
 */
export function computeDailyCompletion(dailyGoals, schema) {
    const totalGoals = countDailyGoals(schema);
    if (totalGoals === 0) return 0;

    let checked = 0;
    for (const val of Object.values(dailyGoals || {})) {
        if (val === true) checked++;
    }

    return checked / totalGoals;
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
