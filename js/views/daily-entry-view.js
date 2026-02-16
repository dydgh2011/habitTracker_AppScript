/**
 * Daily Entry View — Single-day form-based data entry
 */

import { YEAR, MONTHS } from '../config.js';
import { toDateId, getDaysInMonth, formatDateLong, getDayName, toMonthId } from '../utils/date-utils.js';
import { loadSchema, getSections, getFields, getCustomSections } from '../schema/schema-manager.js';
import { getEntry, getMonthlyGoal, putMonthlyGoal } from '../db/local-store.js';
import { getFieldType } from '../schema/field-types.js';
import { evaluate } from '../utils/calc-engine.js';
import { createEmptyDailyGoals, createEmptyFields, createEmptyMonthlyGoals, computeDailyCompletion } from '../components/goal-manager.js';
import { navigateTo, showToast } from '../utils/ui-helpers.js';

export async function renderDailyEntryView(container, state, dateStr) {
    // Parse date or default to today
    let year = YEAR, month, day;
    if (dateStr) {
        const parts = dateStr.split('-');
        year = parseInt(parts[0]) || YEAR;
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
    }
    if (!month || !day) {
        const now = new Date();
        month = now.getMonth() + 1;
        day = now.getDate();
    }

    const dateId = toDateId(year, month, day);
    const daysInMonth = getDaysInMonth(year, month);

    const schema = await loadSchema();
    let entry = await getEntry(dateId);

    if (!entry) {
        entry = {
            _id: dateId,
            year: year,
            month: month,
            day: day,
            weekday: new Date(year, month - 1, day).getDay(),
            dailyGoals: createEmptyDailyGoals(schema),
            fields: createEmptyFields(schema),
            dailyGoalCompletion: 0,
        };
    }

    // Check if it's the last day of the month (for monthly goals)
    const isLastDay = day === daysInMonth;
    const monthId = toMonthId(year, month);
    let monthlyGoalDoc = await getMonthlyGoal(monthId);
    if (!monthlyGoalDoc) {
        monthlyGoalDoc = {
            _id: monthId,
            year: year,
            month: month,
            goals: createEmptyMonthlyGoals(schema),
            completionRate: 0,
        };
    }

    // Compute prev/next dates
    const prevDate = new Date(year, month - 1, day - 1);
    const nextDate = new Date(year, month - 1, day + 1);
    const prevId = toDateId(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate());
    const nextId = toDateId(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate());

    container.innerHTML = `
        <div class="daily-entry-container">
            <div class="daily-entry-nav">
                <button class="month-nav-btn" id="entry-prev">\u2190 Prev</button>
                <div class="daily-entry-date">
                    <div class="date-main">${formatDateLong(year, month, day)}</div>
                    <div class="date-sub">${getDayName(year, month, day)}</div>
                </div>
                <button class="month-nav-btn" id="entry-next">Next \u2192</button>
            </div>
            <div id="daily-entry-form"></div>
        </div>
    `;

    // Navigation
    document.getElementById('entry-prev').addEventListener('click', () => {
        navigateTo(`#/entry/${prevId}`);
    });
    document.getElementById('entry-next').addEventListener('click', () => {
        navigateTo(`#/entry/${nextId}`);
    });

    const formContainer = document.getElementById('daily-entry-form');

    // Save helper
    const saveEntry = async () => {
        entry.dailyGoalCompletion = computeDailyCompletion(entry.dailyGoals, schema);
        if (state.syncEngine) {
            await state.syncEngine.saveEntry(entry);
        } else {
            const { putEntry } = await import('../db/local-store.js');
            await putEntry(entry);
        }
    };

    const saveMonthlyGoals = async () => {
        if (state.syncEngine) {
            await state.syncEngine.saveMonthlyGoal(monthlyGoalDoc);
        } else {
            await putMonthlyGoal(monthlyGoalDoc);
        }
    };

    // ===== DAILY GOALS SECTION =====
    const dailyGoals = getFields(schema, 'Daily Goals');
    if (dailyGoals.length > 0) {
        const section = createSection('Daily Goals', 'daily-goals');
        for (const field of dailyGoals) {
            const value = entry.dailyGoals?.[field.name] || false;
            const row = createFieldRow(field.name, null, () => {
                const checkbox = getFieldType('checkbox').createInput(field, value, async (newVal) => {
                    if (!entry.dailyGoals) entry.dailyGoals = {};
                    entry.dailyGoals[field.name] = newVal;
                    await saveEntry();
                });
                return checkbox;
            });
            section.appendChild(row);
        }
        formContainer.appendChild(section);
    }

    // ===== CUSTOM SECTIONS =====
    const customSections = getCustomSections(schema);
    for (const sectionName of customSections) {
        const fields = getFields(schema, sectionName);
        const section = createSection(sectionName, 'custom-section');

        for (const field of fields) {
            const value = entry.fields?.[sectionName]?.[field.name] ?? null;

            if (field.type === 'velocity' && field.calculation) {
                // Calculated field
                const computedVal = computeCalcField(field, entry, sectionName, schema);
                const row = createFieldRow(field.name, field.unit, () => {
                    const span = document.createElement('span');
                    span.className = 'field-calculated';
                    span.id = `calc-${sectionName}-${field.name}`.replace(/\s+/g, '-');
                    span.textContent = computedVal !== null ? `${computedVal.toFixed(2)} ${field.unit || ''}` : '--';
                    return span;
                });
                section.appendChild(row);
            } else {
                const row = createFieldRow(field.name, field.unit, () => {
                    const fieldType = getFieldType(field.type);
                    const input = fieldType.createInput(field, value, async (newVal) => {
                        if (!entry.fields) entry.fields = {};
                        if (!entry.fields[sectionName]) entry.fields[sectionName] = {};
                        entry.fields[sectionName][field.name] = newVal;

                        // Update calculated fields
                        updateCalcFieldsInForm(entry, sectionName, schema);

                        await saveEntry();
                    });
                    input.className = 'field-input';
                    return input;
                });
                section.appendChild(row);
            }
        }

        formContainer.appendChild(section);
    }

    // ===== MONTHLY GOALS (only on last day) =====
    if (isLastDay) {
        const monthlyGoals = getFields(schema, 'Monthly Goals');
        if (monthlyGoals.length > 0) {
            const section = createSection('Monthly Goals', 'monthly-goals');
            for (const field of monthlyGoals) {
                const value = monthlyGoalDoc.goals?.[field.name] || false;
                const row = createFieldRow(field.name, null, () => {
                    const checkbox = getFieldType('checkbox').createInput(field, value, async (newVal) => {
                        if (!monthlyGoalDoc.goals) monthlyGoalDoc.goals = {};
                        monthlyGoalDoc.goals[field.name] = newVal;
                        const goals = monthlyGoalDoc.goals;
                        const total = Object.keys(goals).length;
                        const checked = Object.values(goals).filter(v => v).length;
                        monthlyGoalDoc.completionRate = total > 0 ? checked / total : 0;
                        await saveMonthlyGoals();
                    });
                    return checkbox;
                });
                section.appendChild(row);
            }
            formContainer.appendChild(section);
        }
    }
}

function createSection(title, className) {
    const div = document.createElement('div');
    div.className = 'daily-entry-section';
    div.innerHTML = `<div class="daily-entry-section-header ${className}">${title}</div>`;
    return div;
}

function createFieldRow(label, unit, createInput) {
    const row = document.createElement('div');
    row.className = 'daily-entry-field';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'field-label';
    labelSpan.textContent = label;
    if (unit) {
        const unitSpan = document.createElement('span');
        unitSpan.className = 'field-unit';
        unitSpan.textContent = unit;
        labelSpan.appendChild(unitSpan);
    }
    row.appendChild(labelSpan);

    const input = createInput();
    row.appendChild(input);

    return row;
}

function computeCalcField(field, entry, sectionName, schema) {
    if (!field.calculation || !entry?.fields?.[sectionName]) return null;

    const sectionFields = entry.fields[sectionName] || {};
    const fieldDefs = schema[sectionName] || {};
    const values = {};

    for (const [fname, fval] of Object.entries(sectionFields)) {
        if (fval !== null && fval !== undefined) {
            const fdef = fieldDefs[fname];
            if (fdef?.type === 'time') {
                const ft = getFieldType('time');
                values[fname] = ft.toNumber(fval);
            } else {
                values[fname] = parseFloat(fval);
            }
        }
    }

    return evaluate(field.calculation, values);
}

function updateCalcFieldsInForm(entry, sectionName, schema) {
    const fields = schema[sectionName];
    if (!fields) return;

    for (const [fieldName, fieldDef] of Object.entries(fields)) {
        if (fieldDef.type !== 'velocity' || !fieldDef.calculation) continue;

        const spanId = `calc-${sectionName}-${fieldName}`.replace(/\s+/g, '-');
        const span = document.getElementById(spanId);
        if (!span) continue;

        const val = computeCalcField(fieldDef, entry, sectionName, schema);
        span.textContent = val !== null ? `${val.toFixed(2)} ${fieldDef.unit || ''}` : '--';
    }
}
