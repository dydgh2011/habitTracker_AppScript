/**
 * Schema Manager — Load, save, validate, and query the tracking schema
 *
 * The schema is a JSON object with section names as keys.
 * Reserved sections: "Daily Goals", "Monthly Goals"
 * All other sections are custom data sections.
 */

import { getMeta, putMeta } from '../db/local-store.js';
import { YEAR } from '../config.js';

// Default schema loaded from file
let defaultSchema = null;
let cachedSchema = null;

/**
 * Load the default schema from the JSON file
 */
async function loadDefaultSchema() {
    if (defaultSchema) return defaultSchema;
    try {
        const response = await fetch('./schemas/default-schema.json');
        defaultSchema = await response.json();
    } catch (err) {
        console.error('Failed to load default schema:', err);
        defaultSchema = {
            "Daily Goals": {
                "Goal 1": { "type": "checkbox" }
            },
            "Monthly Goals": {
                "Goal 1": { "type": "checkbox" }
            }
        };
    }
    return defaultSchema;
}

/**
 * Load the current schema from IndexedDB, or use the default
 */
export async function loadSchema() {
    if (cachedSchema) return cachedSchema;

    const meta = await getMeta();
    if (meta && meta.schema) {
        cachedSchema = meta.schema;
        return cachedSchema;
    }

    // No schema saved — use default
    const schema = await loadDefaultSchema();
    cachedSchema = schema;

    // Save to IndexedDB
    await putMeta({
        _id: 'app_config',
        year: YEAR,
        schema: schema,
        schemaVersion: 1,
    });

    return cachedSchema;
}

/**
 * Save the schema to IndexedDB
 */
export async function saveSchema(schema) {
    const meta = await getMeta() || { _id: 'app_config', year: YEAR, schemaVersion: 0 };
    meta.schema = schema;
    meta.schemaVersion = (meta.schemaVersion || 0) + 1;
    await putMeta(meta);
    cachedSchema = schema;
    return meta;
}

/**
 * Clear the cached schema (force reload)
 */
export function clearSchemaCache() {
    cachedSchema = null;
}

/**
 * Get all section names in display order
 * Daily Goals first, then custom sections, then Monthly Goals
 */
export function getSections(schema) {
    const sections = [];
    if (schema['Daily Goals']) sections.push('Daily Goals');
    for (const key of Object.keys(schema)) {
        if (key !== 'Daily Goals' && key !== 'Monthly Goals') {
            sections.push(key);
        }
    }
    if (schema['Monthly Goals']) sections.push('Monthly Goals');
    return sections;
}

/**
 * Get all fields in a section as an array of { name, ...fieldDef }
 */
export function getFields(schema, sectionName) {
    const section = schema[sectionName];
    if (!section) return [];
    return Object.entries(section).map(([name, def]) => ({
        name,
        ...def
    }));
}

/**
 * Get daily goal field names
 */
export function getDailyGoals(schema) {
    return getFields(schema, 'Daily Goals');
}

/**
 * Get monthly goal field names
 */
export function getMonthlyGoals(schema) {
    return getFields(schema, 'Monthly Goals');
}

/**
 * Get custom sections (everything except Daily/Monthly Goals)
 */
export function getCustomSections(schema) {
    return Object.keys(schema).filter(
        k => k !== 'Daily Goals' && k !== 'Monthly Goals'
    );
}

/**
 * Get chart groups — groups fields by their chartGroup property.
 * Fields without a chartGroup get their own individual group.
 * Only includes numeric/velocity fields (not checkboxes or text).
 * Returns: Map<groupName, { fields: [{name, section, ...fieldDef}], chartType }>
 */
export function getChartGroups(schema) {
    const groups = new Map();
    let ungroupedIdx = 0;

    for (const [sectionName, section] of Object.entries(schema)) {
        if (sectionName === 'Daily Goals' || sectionName === 'Monthly Goals') continue;

        for (const [fieldName, fieldDef] of Object.entries(section)) {
            if (fieldDef.type === 'checkbox' || fieldDef.type === 'text') continue;

            const groupKey = fieldDef.chartGroup || `_ungrouped_${ungroupedIdx++}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    fields: [],
                    chartType: fieldDef.chartType || 'line'
                });
            }

            groups.get(groupKey).fields.push({
                name: fieldName,
                section: sectionName,
                ...fieldDef
            });
        }
    }

    return groups;
}

/**
 * Count the total number of daily goals
 */
export function countDailyGoals(schema) {
    const goals = schema['Daily Goals'];
    return goals ? Object.keys(goals).length : 0;
}

/**
 * Count the total number of monthly goals
 */
export function countMonthlyGoals(schema) {
    const goals = schema['Monthly Goals'];
    return goals ? Object.keys(goals).length : 0;
}

/**
 * Validate a schema structure
 * Returns { valid: boolean, errors: string[] }
 */
export function validateSchema(schema) {
    const errors = [];

    if (typeof schema !== 'object' || schema === null) {
        return { valid: false, errors: ['Schema must be an object'] };
    }

    const validTypes = ['time', 'number', 'checkbox', 'velocity', 'text'];

    for (const [sectionName, section] of Object.entries(schema)) {
        if (typeof section !== 'object' || section === null) {
            errors.push(`Section "${sectionName}" must be an object`);
            continue;
        }

        for (const [fieldName, fieldDef] of Object.entries(section)) {
            if (typeof fieldDef !== 'object' || fieldDef === null) {
                errors.push(`Field "${sectionName}.${fieldName}" must be an object`);
                continue;
            }

            if (!fieldDef.type) {
                errors.push(`Field "${sectionName}.${fieldName}" is missing a "type" property`);
            } else if (!validTypes.includes(fieldDef.type)) {
                errors.push(`Field "${sectionName}.${fieldName}" has invalid type "${fieldDef.type}". Valid: ${validTypes.join(', ')}`);
            }

            if (fieldDef.type === 'velocity' && !fieldDef.calculation) {
                errors.push(`Calculated field "${sectionName}.${fieldName}" is missing a "calculation" property`);
            }

            // Validate schedule if present
            if (fieldDef.schedule && fieldDef.schedule.type && fieldDef.schedule.type !== 'everyday') {
                const s = fieldDef.schedule;
                const validScheduleTypes = ['everyday', 'weekdays', 'interval', 'dates'];
                if (!validScheduleTypes.includes(s.type)) {
                    errors.push(`Field "${sectionName}.${fieldName}" has invalid schedule type "${s.type}"`);
                }
                if (s.type === 'weekdays') {
                    if (!Array.isArray(s.days)) {
                        errors.push(`Field "${sectionName}.${fieldName}" weekdays schedule missing "days" array`);
                    } else if (s.days.some(d => d < 0 || d > 6)) {
                        errors.push(`Field "${sectionName}.${fieldName}" weekdays schedule has invalid day values`);
                    }
                }
                if (s.type === 'interval') {
                    if (!s.every || s.every < 1) {
                        errors.push(`Field "${sectionName}.${fieldName}" interval schedule needs "every" >= 1`);
                    }
                    if (!s.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(s.startDate)) {
                        errors.push(`Field "${sectionName}.${fieldName}" interval schedule needs a valid "startDate" (YYYY-MM-DD)`);
                    }
                }
                if (s.type === 'dates') {
                    if (!Array.isArray(s.dates)) {
                        errors.push(`Field "${sectionName}.${fieldName}" dates schedule missing "dates" array`);
                    } else if (s.dates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
                        errors.push(`Field "${sectionName}.${fieldName}" dates schedule has invalid date values (expected YYYY-MM-DD)`);
                    }
                }
            }
        }
    }

    return { valid: errors.length === 0, errors };
}
