/**
 * Data Grid Component — Spreadsheet-like table for monthly view
 *
 * Features:
 * - Frozen first column (labels)
 * - Inline editing for all field types
 * - Section headers with colored backgrounds
 * - Weekend shading, today highlighting
 * - Calculated fields auto-update
 */

import { YEAR, COLORS } from '../config.js';
import { getDaysInMonth, isWeekend, isToday, toDateId } from '../utils/date-utils.js';
import { getFieldType } from '../schema/field-types.js';
import { getSections, getFields } from '../schema/schema-manager.js';
import { evaluate, getDependencies } from '../utils/calc-engine.js';
import { computeDailyCompletion } from './goal-manager.js';

/**
 * Render the data grid into a container
 *
 * @param {HTMLElement} container - Where to render
 * @param {Object} schema - The tracking schema
 * @param {Object} entriesMap - Map of dateId -> entry document
 * @param {Object} monthlyGoalDoc - Monthly goals document
 * @param {number} monthIndex - 0-based month index
 * @param {Function} onEntryChange - Callback(dateId, updatedEntry) when data changes
 * @param {Function} onMonthlyGoalChange - Callback(updatedMonthlyGoalDoc) when monthly goals change
 */
export function renderDataGrid(container, schema, entriesMap, monthlyGoalDoc, monthIndex, onEntryChange, onMonthlyGoalChange) {
    const month = monthIndex + 1; // 1-indexed
    const daysInMonth = getDaysInMonth(YEAR, month);
    const sections = getSections(schema);

    const wrapper = document.createElement('div');
    wrapper.className = 'grid-container';

    const table = document.createElement('table');
    table.className = 'data-grid';

    // ===== HEADER ROW (day numbers) =====
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const cornerTh = document.createElement('th');
    cornerTh.className = 'label-col day-header';
    cornerTh.textContent = '';
    headerRow.appendChild(cornerTh);

    for (let d = 1; d <= daysInMonth; d++) {
        const th = document.createElement('th');
        th.className = 'day-header';
        if (isWeekend(YEAR, month, d)) th.classList.add('weekend');
        if (isToday(YEAR, month, d)) th.classList.add('today');
        th.textContent = d;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // ===== BODY =====
    const tbody = document.createElement('tbody');

    for (const sectionName of sections) {
        const fields = getFields(schema, sectionName);

        // Section header row
        const sectionRow = document.createElement('tr');
        sectionRow.className = 'section-header';

        if (sectionName === 'Daily Goals') sectionRow.classList.add('daily-goals');
        else if (sectionName === 'Monthly Goals') sectionRow.classList.add('monthly-goals');
        else sectionRow.classList.add('custom-section');

        const sectionLabel = document.createElement('td');
        sectionLabel.className = 'label-col';
        sectionLabel.textContent = sectionName;
        sectionRow.appendChild(sectionLabel);

        // Span across all day columns
        for (let d = 1; d <= daysInMonth; d++) {
            const td = document.createElement('td');
            if (sectionName === 'Daily Goals') td.style.background = COLORS.dailyGoalsBg;
            else if (sectionName === 'Monthly Goals') td.style.background = COLORS.monthlyGoalsBg;
            else { td.style.background = COLORS.header; }
            sectionRow.appendChild(td);
        }
        tbody.appendChild(sectionRow);

        // Field rows
        for (const field of fields) {
            const row = document.createElement('tr');

            // Label cell
            const labelTd = document.createElement('td');
            labelTd.className = 'label-col';
            let labelText = field.name;
            if (field.unit) labelText += ` (${field.unit})`;
            labelTd.textContent = labelText;
            labelTd.title = field.name;
            row.appendChild(labelTd);

            // Day cells
            for (let d = 1; d <= daysInMonth; d++) {
                const td = document.createElement('td');
                td.className = 'day-cell';
                if (isWeekend(YEAR, month, d)) td.classList.add('weekend');
                if (isToday(YEAR, month, d)) td.classList.add('today');

                const dateId = toDateId(YEAR, month, d);

                if (sectionName === 'Monthly Goals') {
                    // Monthly goals: only show checkbox on the last day
                    if (d === daysInMonth) {
                        const goalValue = monthlyGoalDoc?.goals?.[field.name] || false;
                        const fieldType = getFieldType('checkbox');
                        const input = fieldType.createGridInput(field, goalValue, (newVal) => {
                            if (!monthlyGoalDoc.goals) monthlyGoalDoc.goals = {};
                            monthlyGoalDoc.goals[field.name] = newVal;

                            // Recompute completion rate
                            const totalGoals = Object.keys(monthlyGoalDoc.goals).length;
                            const checkedGoals = Object.values(monthlyGoalDoc.goals).filter(v => v === true).length;
                            monthlyGoalDoc.completionRate = totalGoals > 0 ? checkedGoals / totalGoals : 0;

                            onMonthlyGoalChange(monthlyGoalDoc);
                        });
                        td.style.background = COLORS.monthlyGoalCheckbox;
                        td.appendChild(input);
                    }
                } else if (sectionName === 'Daily Goals') {
                    // Daily goals: checkbox for every day
                    const entry = entriesMap[dateId];
                    const goalValue = entry?.dailyGoals?.[field.name] || false;
                    const fieldType = getFieldType('checkbox');
                    const input = fieldType.createGridInput(field, goalValue, (newVal) => {
                        const updatedEntry = getOrCreateEntry(entriesMap, dateId, YEAR, month, d, schema);
                        if (!updatedEntry.dailyGoals) updatedEntry.dailyGoals = {};
                        updatedEntry.dailyGoals[field.name] = newVal;
                        updatedEntry.dailyGoalCompletion = computeDailyCompletion(updatedEntry.dailyGoals, schema);
                        onEntryChange(dateId, updatedEntry);
                    });
                    td.appendChild(input);
                } else {
                    // Custom section fields
                    const entry = entriesMap[dateId];
                    const value = entry?.fields?.[sectionName]?.[field.name] ?? null;

                    if (field.type === 'velocity' && field.calculation) {
                        // Calculated field — render as read-only span
                        const fieldType = getFieldType('velocity');
                        const computedVal = computeCalculatedField(field, entry, sectionName, schema);
                        const span = fieldType.createGridInput(field, computedVal, () => {});
                        span.dataset.section = sectionName;
                        span.dataset.field = field.name;
                        span.dataset.dateId = dateId;
                        td.appendChild(span);
                    } else {
                        // Editable field
                        const fieldType = getFieldType(field.type);
                        const input = fieldType.createGridInput(field, value, (newVal) => {
                            const updatedEntry = getOrCreateEntry(entriesMap, dateId, YEAR, month, d, schema);
                            if (!updatedEntry.fields) updatedEntry.fields = {};
                            if (!updatedEntry.fields[sectionName]) updatedEntry.fields[sectionName] = {};
                            updatedEntry.fields[sectionName][field.name] = newVal;

                            // Recompute any calculated fields in this section for this day
                            updateCalculatedFields(tbody, updatedEntry, sectionName, dateId, schema);

                            onEntryChange(dateId, updatedEntry);
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
    wrapper.appendChild(table);

    container.innerHTML = '';
    container.appendChild(wrapper);
}

/**
 * Get or create an entry document for a given date
 */
function getOrCreateEntry(entriesMap, dateId, year, month, day, schema) {
    if (!entriesMap[dateId]) {
        entriesMap[dateId] = {
            _id: dateId,
            year: year,
            month: month,
            day: day,
            weekday: new Date(year, month - 1, day).getDay(),
            dailyGoals: {},
            fields: {},
            dailyGoalCompletion: 0,
        };
    }
    return entriesMap[dateId];
}

/**
 * Compute a calculated/velocity field value
 */
function computeCalculatedField(field, entry, sectionName, schema) {
    if (!field.calculation || !entry?.fields?.[sectionName]) return null;

    // Gather all field values in the same section
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

/**
 * Update all calculated fields in the DOM for a given day
 */
function updateCalculatedFields(tbody, entry, sectionName, dateId, schema) {
    const calculatedSpans = tbody.querySelectorAll(
        `span.calculated-value[data-section="${sectionName}"][data-date-id="${dateId}"]`
    );

    for (const span of calculatedSpans) {
        const fieldName = span.dataset.field;
        const fieldDef = schema[sectionName]?.[fieldName];
        if (!fieldDef?.calculation) continue;

        const val = computeCalculatedField(fieldDef, entry, sectionName, schema);
        span.textContent = val !== null ? (typeof val === 'number' ? val.toFixed(1) : val) : '';
    }
}
