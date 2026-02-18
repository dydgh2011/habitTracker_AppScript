/**
 * Schema Editor — UI logic for the visual schema configuration editor
 *
 * Provides add/remove/edit functionality for sections and fields,
 * including per-field schedule configuration.
 */

import { getAvailableTypes } from './field-types.js';
import { describeSchedule } from '../utils/schedule-utils.js';

/**
 * Render the schema editor form
 *
 * @param {HTMLElement} container
 * @param {Object} schema - Current schema object
 * @param {Function} onSave - Callback with the updated schema
 */
export function renderSchemaEditor(container, schema, onSave) {
    // Deep clone to avoid mutating the original
    let workingSchema = JSON.parse(JSON.stringify(schema));

    function render() {
        container.innerHTML = '';

        const sectionNames = Object.keys(workingSchema);

        for (const sectionName of sectionNames) {
            const section = workingSchema[sectionName];
            const sectionEl = document.createElement('div');
            sectionEl.className = 'schema-section';

            // Section header
            const header = document.createElement('div');
            header.className = 'schema-section-header';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = sectionName;
            nameInput.addEventListener('change', () => {
                const newName = nameInput.value.trim();
                if (newName && newName !== sectionName && !workingSchema[newName]) {
                    // Rename section
                    const newSchema = {};
                    for (const [key, val] of Object.entries(workingSchema)) {
                        if (key === sectionName) {
                            newSchema[newName] = val;
                        } else {
                            newSchema[key] = val;
                        }
                    }
                    workingSchema = newSchema;
                    render();
                }
            });
            header.appendChild(nameInput);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'schema-remove-btn';
            removeBtn.textContent = '\u00D7';
            removeBtn.title = 'Remove section';
            removeBtn.addEventListener('click', () => {
                delete workingSchema[sectionName];
                render();
            });
            header.appendChild(removeBtn);

            sectionEl.appendChild(header);

            // Column headers for fields
            const colHeaders = document.createElement('div');
            colHeaders.className = 'schema-field-row';
            colHeaders.style.background = '#f5f2ee';
            colHeaders.style.fontWeight = '600';
            colHeaders.style.fontSize = '12px';
            colHeaders.style.color = '#9e9690';
            colHeaders.innerHTML = `
                <span>Field Name</span>
                <span>Type</span>
                <span>Unit</span>
                <span>Format</span>
                <span>Calc / Group</span>
                <span></span>
            `;
            sectionEl.appendChild(colHeaders);

            // Field rows
            const fieldNames = Object.keys(section);
            for (const fieldName of fieldNames) {
                const fieldDef = section[fieldName];
                const fieldRow = document.createElement('div');
                fieldRow.className = 'schema-field-row';

                // Field name input
                const fnInput = document.createElement('input');
                fnInput.type = 'text';
                fnInput.value = fieldName;
                fnInput.addEventListener('change', () => {
                    const newFn = fnInput.value.trim();
                    if (newFn && newFn !== fieldName) {
                        const newSection = {};
                        for (const [k, v] of Object.entries(section)) {
                            if (k === fieldName) {
                                newSection[newFn] = v;
                            } else {
                                newSection[k] = v;
                            }
                        }
                        workingSchema[sectionName] = newSection;
                        render();
                    }
                });
                fieldRow.appendChild(fnInput);

                // Type select
                const typeSelect = document.createElement('select');
                for (const t of getAvailableTypes()) {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.textContent = t;
                    opt.selected = fieldDef.type === t;
                    typeSelect.appendChild(opt);
                }
                typeSelect.addEventListener('change', () => {
                    fieldDef.type = typeSelect.value;
                });
                fieldRow.appendChild(typeSelect);

                // Unit input
                const unitInput = document.createElement('input');
                unitInput.type = 'text';
                unitInput.value = fieldDef.unit || '';
                unitInput.placeholder = 'unit';
                unitInput.addEventListener('change', () => {
                    fieldDef.unit = unitInput.value.trim() || undefined;
                });
                fieldRow.appendChild(unitInput);

                // Format input
                const formatInput = document.createElement('input');
                formatInput.type = 'text';
                formatInput.value = fieldDef.format || '';
                formatInput.placeholder = 'format';
                formatInput.addEventListener('change', () => {
                    fieldDef.format = formatInput.value.trim() || undefined;
                });
                fieldRow.appendChild(formatInput);

                // Calculation / Chart Group input
                const calcInput = document.createElement('input');
                calcInput.type = 'text';
                if (fieldDef.type === 'velocity') {
                    calcInput.value = fieldDef.calculation || '';
                    calcInput.placeholder = 'e.g., Distance / Time';
                } else {
                    calcInput.value = fieldDef.chartGroup || '';
                    calcInput.placeholder = 'chart group';
                }
                calcInput.addEventListener('change', () => {
                    if (fieldDef.type === 'velocity') {
                        fieldDef.calculation = calcInput.value.trim() || undefined;
                    } else {
                        fieldDef.chartGroup = calcInput.value.trim() || undefined;
                    }
                });
                fieldRow.appendChild(calcInput);

                // Remove button
                const removeFieldBtn = document.createElement('button');
                removeFieldBtn.className = 'schema-remove-btn';
                removeFieldBtn.textContent = '\u00D7';
                removeFieldBtn.addEventListener('click', () => {
                    delete section[fieldName];
                    render();
                });
                fieldRow.appendChild(removeFieldBtn);

                sectionEl.appendChild(fieldRow);

                // Schedule configuration row
                const scheduleRow = createScheduleRow(fieldDef);
                sectionEl.appendChild(scheduleRow);
            }

            // Add field button
            const addFieldBtn = document.createElement('button');
            addFieldBtn.className = 'schema-add-btn';
            addFieldBtn.textContent = '+ Add Field';
            addFieldBtn.addEventListener('click', () => {
                const newName = `New Field ${Object.keys(section).length + 1}`;
                section[newName] = { type: 'number' };
                render();
            });
            sectionEl.appendChild(addFieldBtn);

            container.appendChild(sectionEl);
        }

        // Add section button
        const addSectionBtn = document.createElement('button');
        addSectionBtn.className = 'schema-add-btn';
        addSectionBtn.style.marginTop = '16px';
        addSectionBtn.textContent = '+ Add Section';
        addSectionBtn.addEventListener('click', () => {
            const newName = `Section ${Object.keys(workingSchema).length + 1}`;
            workingSchema[newName] = {};
            render();
        });
        container.appendChild(addSectionBtn);

    }

    render();

    // Expose getter for the working schema
    container._getEditedSchema = () => workingSchema;
}

/**
 * Get the current edited schema from the editor container
 */
export function getEditedSchema() {
    const container = document.getElementById('schema-editor-container');
    if (container && container._getEditedSchema) {
        return container._getEditedSchema();
    }
    throw new Error('Schema editor not initialized');
}

/**
 * Create a schedule configuration row for a field
 */
function createScheduleRow(fieldDef) {
    const container = document.createElement('div');
    container.className = 'schema-schedule-row';

    const label = document.createElement('span');
    label.className = 'schedule-label';
    label.textContent = 'Schedule:';
    container.appendChild(label);

    // Schedule type select
    const typeSelect = document.createElement('select');
    typeSelect.className = 'schedule-type-select';
    const types = [
        { value: 'everyday', label: 'Every day' },
        { value: 'weekdays', label: 'Specific weekdays' },
        { value: 'interval', label: 'Every N days' },
        { value: 'dates', label: 'Custom dates' },
    ];

    const currentType = fieldDef.schedule?.type || 'everyday';
    for (const t of types) {
        const opt = document.createElement('option');
        opt.value = t.value;
        opt.textContent = t.label;
        opt.selected = currentType === t.value;
        typeSelect.appendChild(opt);
    }
    container.appendChild(typeSelect);

    // Sub-controls container
    const subControls = document.createElement('div');
    subControls.style.display = 'contents';
    container.appendChild(subControls);

    function renderSubControls() {
        subControls.innerHTML = '';
        const type = typeSelect.value;

        if (type === 'everyday') {
            delete fieldDef.schedule;
            return;
        }

        if (!fieldDef.schedule) fieldDef.schedule = {};
        fieldDef.schedule.type = type;

        if (type === 'weekdays') {
            renderWeekdayToggles(subControls, fieldDef);
        } else if (type === 'interval') {
            renderIntervalConfig(subControls, fieldDef);
        } else if (type === 'dates') {
            renderDatesConfig(subControls, fieldDef);
        }
    }

    typeSelect.addEventListener('change', renderSubControls);
    renderSubControls();

    return container;
}

/**
 * Render weekday toggle buttons (S M T W T F S)
 */
function renderWeekdayToggles(container, fieldDef) {
    const togglesDiv = document.createElement('div');
    togglesDiv.className = 'schedule-weekday-toggles';

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (!fieldDef.schedule.days) fieldDef.schedule.days = [];

    for (let i = 0; i < 7; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'weekday-toggle';
        btn.textContent = dayLabels[i];
        btn.title = dayNames[i];
        if (fieldDef.schedule.days.includes(i)) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            const idx = fieldDef.schedule.days.indexOf(i);
            if (idx >= 0) {
                fieldDef.schedule.days.splice(idx, 1);
                btn.classList.remove('active');
            } else {
                fieldDef.schedule.days.push(i);
                fieldDef.schedule.days.sort((a, b) => a - b);
                btn.classList.add('active');
            }
        });

        togglesDiv.appendChild(btn);
    }

    container.appendChild(togglesDiv);
}

/**
 * Render interval configuration (every N days from start date)
 */
function renderIntervalConfig(container, fieldDef) {
    const wrapper = document.createElement('div');
    wrapper.className = 'schedule-interval-config';

    const everyLabel = document.createElement('span');
    everyLabel.textContent = 'Every';
    wrapper.appendChild(everyLabel);

    const everyInput = document.createElement('input');
    everyInput.type = 'number';
    everyInput.min = '1';
    everyInput.value = fieldDef.schedule.every || 2;
    everyInput.addEventListener('change', () => {
        fieldDef.schedule.every = Math.max(1, parseInt(everyInput.value) || 2);
    });
    wrapper.appendChild(everyInput);

    const daysLabel = document.createElement('span');
    daysLabel.textContent = 'days from';
    wrapper.appendChild(daysLabel);

    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.value = fieldDef.schedule.startDate || new Date().toISOString().split('T')[0];
    startInput.addEventListener('change', () => {
        fieldDef.schedule.startDate = startInput.value;
    });
    wrapper.appendChild(startInput);

    // Initialize defaults
    if (!fieldDef.schedule.every) fieldDef.schedule.every = parseInt(everyInput.value) || 2;
    if (!fieldDef.schedule.startDate) fieldDef.schedule.startDate = startInput.value;

    container.appendChild(wrapper);
}

/**
 * Render custom dates configuration (comma-separated YYYY-MM-DD)
 */
function renderDatesConfig(container, fieldDef) {
    const wrapper = document.createElement('div');
    wrapper.className = 'schedule-dates-config';

    const datesLabel = document.createElement('span');
    datesLabel.textContent = 'Dates:';
    wrapper.appendChild(datesLabel);

    const datesInput = document.createElement('input');
    datesInput.type = 'text';
    datesInput.placeholder = '2026-03-15, 2026-04-01, ...';
    datesInput.value = (fieldDef.schedule.dates || []).join(', ');
    datesInput.addEventListener('change', () => {
        const raw = datesInput.value;
        fieldDef.schedule.dates = raw
            .split(',')
            .map(s => s.trim())
            .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s));
    });
    wrapper.appendChild(datesInput);

    if (!fieldDef.schedule.dates) fieldDef.schedule.dates = [];

    container.appendChild(wrapper);
}
