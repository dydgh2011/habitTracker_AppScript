/**
 * Schema Editor — UI logic for the visual schema configuration editor
 *
 * Provides add/remove/edit functionality for sections and fields.
 */

import { getAvailableTypes } from './field-types.js';

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
            colHeaders.style.background = '#f8f9fa';
            colHeaders.style.fontWeight = '600';
            colHeaders.style.fontSize = '12px';
            colHeaders.innerHTML = `
                <span>Field Name</span>
                <span>Type</span>
                <span>Unit</span>
                <span>Format</span>
                <span>Calculation / Chart Group</span>
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

        // Save button
        const saveArea = document.createElement('div');
        saveArea.style.marginTop = '24px';
        saveArea.style.display = 'flex';
        saveArea.style.gap = '8px';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.textContent = 'Save Schema';
        saveBtn.addEventListener('click', () => {
            onSave(workingSchema);
        });
        saveArea.appendChild(saveBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn-secondary';
        resetBtn.textContent = 'Reset Changes';
        resetBtn.addEventListener('click', () => {
            workingSchema = JSON.parse(JSON.stringify(schema));
            render();
        });
        saveArea.appendChild(resetBtn);

        container.appendChild(saveArea);
    }

    render();
}
