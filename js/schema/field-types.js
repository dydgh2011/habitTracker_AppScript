/**
 * Field Type Definitions
 *
 * Each type defines how to create inputs, parse values,
 * validate data, and format for display.
 *
 * Supported types: time, number, checkbox, velocity, text
 */

export const FIELD_TYPES = {
    time: {
        label: 'Time',
        createInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'time';
            input.value = value || '';
            input.addEventListener('change', () => onChange(input.value));
            return input;
        },
        createGridInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'time';
            input.value = value || '';
            input.addEventListener('change', () => onChange(input.value));
            return input;
        },
        parseValue(raw) {
            if (!raw || raw === '') return null;
            // Accept HH:mm format
            if (/^\d{1,2}:\d{2}$/.test(raw)) return raw;
            return null;
        },
        validate(value) {
            if (value === null || value === '') return true;
            return /^\d{1,2}:\d{2}$/.test(value);
        },
        formatDisplay(value, fieldDef) {
            if (!value) return '';
            return value;
        },
        toNumber(value) {
            // Convert time string to minutes since midnight for calculations
            if (!value) return null;
            const parts = value.split(':');
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
    },

    number: {
        label: 'Number',
        createInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.value = value ?? '';
            input.placeholder = fieldDef.unit || '';
            input.addEventListener('change', () => {
                const v = input.value === '' ? null : parseFloat(input.value);
                onChange(v);
            });
            return input;
        },
        createGridInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.value = value ?? '';
            input.addEventListener('change', () => {
                const v = input.value === '' ? null : parseFloat(input.value);
                onChange(v);
            });
            return input;
        },
        parseValue(raw) {
            if (raw === null || raw === '' || raw === undefined) return null;
            const n = parseFloat(raw);
            return isFinite(n) ? n : null;
        },
        validate(value) {
            if (value === null || value === '') return true;
            return isFinite(value);
        },
        formatDisplay(value, fieldDef) {
            if (value === null || value === undefined) return '';
            const formatted = typeof value === 'number' ?
                (Number.isInteger(value) ? value.toString() : value.toFixed(1)) :
                value.toString();
            return fieldDef.unit ? `${formatted} ${fieldDef.unit}` : formatted;
        },
        toNumber(value) {
            if (value === null || value === undefined) return null;
            const n = parseFloat(value);
            return isFinite(n) ? n : null;
        }
    },

    checkbox: {
        label: 'Checkbox',
        createInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !!value;
            input.addEventListener('change', () => onChange(input.checked));
            return input;
        },
        createGridInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !!value;
            input.addEventListener('change', () => onChange(input.checked));
            return input;
        },
        parseValue(raw) {
            return !!raw;
        },
        validate(value) {
            return typeof value === 'boolean';
        },
        formatDisplay(value) {
            return value ? '\u2714' : '';
        },
        toNumber(value) {
            return value ? 1 : 0;
        }
    },

    velocity: {
        label: 'Calculated',
        createInput(fieldDef, value, onChange) {
            const span = document.createElement('span');
            span.className = 'field-calculated';
            span.textContent = value !== null && value !== undefined ?
                `${typeof value === 'number' ? value.toFixed(2) : value} ${fieldDef.unit || ''}` :
                '--';
            return span;
        },
        createGridInput(fieldDef, value, onChange) {
            const span = document.createElement('span');
            span.className = 'calculated-value';
            span.textContent = value !== null && value !== undefined ?
                (typeof value === 'number' ? value.toFixed(1) : value) : '';
            return span;
        },
        parseValue(raw) {
            if (raw === null || raw === '' || raw === undefined) return null;
            const n = parseFloat(raw);
            return isFinite(n) ? n : null;
        },
        validate() {
            return true; // calculated fields are always valid
        },
        formatDisplay(value, fieldDef) {
            if (value === null || value === undefined) return '';
            const formatted = typeof value === 'number' ? value.toFixed(2) : value.toString();
            return fieldDef.unit ? `${formatted} ${fieldDef.unit}` : formatted;
        },
        toNumber(value) {
            if (value === null || value === undefined) return null;
            const n = parseFloat(value);
            return isFinite(n) ? n : null;
        }
    },

    text: {
        label: 'Text',
        createInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value || '';
            input.addEventListener('change', () => onChange(input.value));
            return input;
        },
        createGridInput(fieldDef, value, onChange) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value || '';
            input.addEventListener('change', () => onChange(input.value));
            return input;
        },
        parseValue(raw) {
            return raw != null ? String(raw) : null;
        },
        validate(value) {
            return value === null || typeof value === 'string';
        },
        formatDisplay(value) {
            return value || '';
        },
        toNumber() {
            return null; // text cannot be converted to number
        }
    }
};

/**
 * Get the field type definition for a given type string
 */
export function getFieldType(type) {
    return FIELD_TYPES[type] || FIELD_TYPES.text;
}

/**
 * Get all available type names
 */
export function getAvailableTypes() {
    return Object.keys(FIELD_TYPES);
}
