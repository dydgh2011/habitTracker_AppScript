/**
 * Data Grid Component — Spreadsheet-like view for monthly data
 *
 * Features:
 *   - Frozen first column (labels)
 *   - Section headers with color coding
 *   - Alternating row shading
 *   - Inline editing (checkboxes, numbers, time, text)
 *   - Calculated field display
 *   - Weekend / today column highlighting
 *   - Schedule-aware: unscheduled cells are dimmed
 */

import { YEAR } from '../config.js';
import { toDateId, isWeekend as checkWeekend } from '../utils/date-utils.js';
import { getSections, getFields, countDailyGoals } from '../schema/schema-manager.js';
import { getFieldType } from '../schema/field-types.js';
import { evaluate } from '../utils/calc-engine.js';
import { createEmptyDailyGoals, createEmptyMonthlyGoals, createEmptyFields, computeDailyCompletion, computeMonthlyCompletion } from '../components/goal-manager.js';
import { isFieldScheduledForDate } from '../utils/schedule-utils.js';

export function renderDataGrid(container, schema, month, daysInMonth, entriesMap, monthlyGoalDoc, onEntryChange, onMonthlyGoalChange) {
    container.innerHTML = '';

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === YEAR && (today.getMonth() + 1) === month;
    const todayDay = isCurrentMonth ? today.getDate() : -1;

    // ===== Build table =====
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'grid-container';

    const table = document.createElement('table');
    table.className = 'data-grid';

    // ===== HEADER ROW =====
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const labelHeader = document.createElement('th');
    labelHeader.className = 'label-col day-header';
    labelHeader.textContent = '';
    headerRow.appendChild(labelHeader);

    for (let d = 1; d <= daysInMonth; d++) {
        const th = document.createElement('th');
        th.className = 'day-header';
        th.textContent = d;

        const dateObj = new Date(YEAR, month - 1, d);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) th.classList.add('weekend');
        if (d === todayDay) th.classList.add('today');

        headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // ===== BODY =====
    const tbody = document.createElement('tbody');
    const sections = getSections(schema);

    for (const sectionName of sections) {
        const fields = getFields(schema, sectionName);
        const isDaily = sectionName === 'Daily Goals';
        const isMonthly = sectionName === 'Monthly Goals';

        // Section header row
        const sectionRow = document.createElement('tr');
        sectionRow.className = 'section-header';
        if (isDaily) sectionRow.classList.add('daily-goals');
        else if (isMonthly) sectionRow.classList.add('monthly-goals');
        else sectionRow.classList.add('custom-section');

        const sectionLabel = document.createElement('td');
        sectionLabel.className = 'label-col';
        sectionLabel.textContent = sectionName;
        sectionRow.appendChild(sectionLabel);

        for (let d = 1; d <= daysInMonth; d++) {
            const td = document.createElement('td');
            sectionRow.appendChild(td);
        }
        tbody.appendChild(sectionRow);

        // Field rows
        for (const field of fields) {
            const row = document.createElement('tr');

            const labelCell = document.createElement('td');
            labelCell.className = 'label-col';
            labelCell.textContent = field.name;
            labelCell.title = field.name;
            row.appendChild(labelCell);

            for (let d = 1; d <= daysInMonth; d++) {
                const td = document.createElement('td');
                td.className = 'day-cell';

                const dateObj = new Date(YEAR, month - 1, d);
                const dayOfWeek = dateObj.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) td.classList.add('weekend');
                if (d === todayDay) td.classList.add('today');

                const dateId = toDateId(YEAR, month, d);

                // Check schedule — skip rendering input for unscheduled cells
                const isScheduled = isFieldScheduledForDate(field.schedule, YEAR, month, d);

                if (!isScheduled && !isMonthly) {
                    td.classList.add('unscheduled');
                    row.appendChild(td);
                    continue;
                }

                if (isMonthly) {
                    // Monthly goals: only show for last day
                    if (d === daysInMonth) {
                        const value = monthlyGoalDoc?.goals?.[field.name] || false;
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.checked = value;
                        checkbox.addEventListener('change', async () => {
                            if (!monthlyGoalDoc.goals) monthlyGoalDoc.goals = {};
                            monthlyGoalDoc.goals[field.name] = checkbox.checked;
                            monthlyGoalDoc.completionRate = computeMonthlyCompletion(monthlyGoalDoc.goals);
                            onMonthlyGoalChange(monthlyGoalDoc);
                        });
                        td.appendChild(checkbox);
                    }
                } else if (isDaily) {
                    const entry = ensureEntry(entriesMap, dateId, YEAR, month, d, schema);
                    const value = entry.dailyGoals?.[field.name] || false;
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = value;
                    checkbox.addEventListener('change', async () => {
                        entry.dailyGoals[field.name] = checkbox.checked;
                        entry.dailyGoalCompletion = computeDailyCompletion(entry.dailyGoals, schema, YEAR, month, d);
                        onEntryChange(entry);
                    });
                    td.appendChild(checkbox);
                } else {
                    // Custom fields
                    const entry = ensureEntry(entriesMap, dateId, YEAR, month, d, schema);

                    if (field.type === 'velocity' && field.calculation) {
                        const val = computeCalcField(field, entry, sectionName, schema);
                        const span = document.createElement('span');
                        span.className = 'calculated-value';
                        span.textContent = val !== null ? val.toFixed(1) : '';
                        td.appendChild(span);
                    } else {
                        const fieldType = getFieldType(field.type);
                        const value = entry.fields?.[sectionName]?.[field.name] ?? null;
                        const input = fieldType.createGridInput(field, value, async (newVal) => {
                            if (!entry.fields) entry.fields = {};
                            if (!entry.fields[sectionName]) entry.fields[sectionName] = {};
                            entry.fields[sectionName][field.name] = newVal;
                            onEntryChange(entry);
                            // Recalculate velocity fields
                            updateRowCalcFields(row.parentElement, entry, sectionName, schema);
                        });
                        td.appendChild(input);
                    }
                }

                row.appendChild(td);
            }
            tbody.appendChild(row);
        }
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
}

// ============ HELPERS ============

function ensureEntry(entriesMap, dateId, year, month, day, schema) {
    if (!entriesMap[dateId]) {
        entriesMap[dateId] = {
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
    return entriesMap[dateId];
}

function computeCalcField(field, entry, sectionName, schema) {
    if (!field.calculation) return null;

    const sectionFields = entry?.fields?.[sectionName] || {};
    const fieldDefs = schema[sectionName] || {};
    const values = {};

    // Initialize ALL fields defined in the schema to null first
    for (const fname of Object.keys(fieldDefs)) {
        values[fname] = null;
    }

    // Overwrite with actual values
    for (const [fname, fval] of Object.entries(sectionFields)) {
        if (fval !== null && fval !== undefined && fval !== '') {
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

function updateRowCalcFields(tbody, entry, sectionName, schema) {
    // simplistic: rebuild is handled at the view level
}
