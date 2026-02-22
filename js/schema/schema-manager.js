/**
 * Schema Manager — Load, save, validate, and query the tracking schema
 *
 * The schema is a JSON object with section names as keys.
 * Reserved sections: "Daily Goals", "Monthly Goals"
 * All other sections are custom data sections.
 */

import { getMeta, putMeta, getAllEntries, putEntry, getAllMonthlyGoals, putMonthlyGoal } from '../db/local-store.js';
import { YEAR } from '../config.js';


/**
 * Compare two schemas to find potential data conflicts (removals or type changes)
 * @param {Object} oldSchema 
 * @param {Object} newSchema 
 * @returns {Object} 
 */
export function findSchemaConflicts(oldSchema, newSchema) {
    const conflicts = {
        removedSections: [],
        removedFields: [], // { section, field }
        changedTypes: []   // { section, field, oldType, newType }
    };

    for (const [sectionName, oldSection] of Object.entries(oldSchema)) {
        const newSection = newSchema[sectionName];

        if (!newSection) {
            conflicts.removedSections.push(sectionName);
            continue;
        }

        for (const [fieldName, oldField] of Object.entries(oldSection)) {
            const newField = newSection[fieldName];

            if (!newField) {
                conflicts.removedFields.push({ section: sectionName, field: fieldName });
                continue;
            }

            if (oldField.type !== newField.type) {
                conflicts.changedTypes.push({
                    section: sectionName,
                    field: fieldName,
                    oldType: oldField.type,
                    newType: newField.type
                });
            }
        }
    }

    return conflicts;
}

/**
 * Clean data for a new schema based on detected conflicts
 * @param {Object} conflicts - The result of findSchemaConflicts
 */
export async function cleanDataForNewSchema(conflicts) {
    const hasConflicts = conflicts.removedSections.length > 0 ||
        conflicts.removedFields.length > 0 ||
        conflicts.changedTypes.length > 0;

    if (!hasConflicts) return;

    // 1. Clean entries (Daily data)
    const entries = await getAllEntries(YEAR);
    for (const entry of entries) {
        let modified = false;

        // Handle sections
        for (const sectionName of conflicts.removedSections) {
            if (sectionName === 'Daily Goals') {
                if (entry.dailyGoals) {
                    delete entry.dailyGoals;
                    modified = true;
                }
            } else if (entry.fields && entry.fields[sectionName]) {
                delete entry.fields[sectionName];
                modified = true;
            }
        }

        // Handle fields
        const allFieldConflicts = [...conflicts.removedFields, ...conflicts.changedTypes];
        for (const conf of allFieldConflicts) {
            if (conf.section === 'Daily Goals') {
                if (entry.dailyGoals && entry.dailyGoals[conf.field] !== undefined) {
                    delete entry.dailyGoals[conf.field];
                    modified = true;
                }
            } else if (entry.fields && entry.fields[conf.section] && entry.fields[conf.section][conf.field] !== undefined) {
                delete entry.fields[conf.section][conf.field];
                modified = true;
            }
        }

        if (modified) {
            await putEntry(entry);
        }
    }

    // 2. Clean Monthly Goals
    const monthlyGoals = await getAllMonthlyGoals(YEAR);
    for (const mg of monthlyGoals) {
        let modified = false;

        // Check if Monthly Goals section was removed entirely
        if (conflicts.removedSections.includes('Monthly Goals')) {
            // If the whole section is gone, we might want to clear most fields
            // but keep the metadata (_id, year, month, etc)
            for (const key of Object.keys(mg)) {
                if (!['_id', 'year', 'month', 'updatedAt', 'completion'].includes(key)) {
                    delete mg[key];
                    modified = true;
                }
            }
        } else {
            // Check for specific fields in Monthly Goals
            const mgConflicts = allFieldConflicts.filter(c => c.section === 'Monthly Goals');
            for (const conf of mgConflicts) {
                if (mg[conf.field] !== undefined) {
                    delete mg[conf.field];
                    modified = true;
                }
            }
        }

        if (modified) {
            await putMonthlyGoal(mg);
        }
    }
}

// Default schema loaded from file
let defaultSchema = null;
let cachedSchema = null;

/**
 * Load the default schema from the JSON file
 */
async function loadDefaultSchema() {
    if (defaultSchema) return defaultSchema;
    try {
        const response = await fetch(`./schemas/default-schema.json?v=${Date.now()}`);
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
