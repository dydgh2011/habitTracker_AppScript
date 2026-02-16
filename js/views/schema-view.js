/**
 * Schema View — Edit, import/export the application schema
 */

import { loadSchema, saveSchema, validateSchema } from '../schema/schema-manager.js';
import { showToast } from '../utils/ui-helpers.js';

export async function renderSchemaView(container, state) {
    container.innerHTML = `
        <div class="schema-editor">
            <h1 class="page-title">Schema <span class="title-accent">Editor</span></h1>
            <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); font-size: var(--font-size-md);">
                Define the sections, fields, and goals that you want to track. Changes will be applied immediately.
            </p>

            <div id="schema-editor-container" class="loading"><div class="spinner"></div> Loading schema...</div>

            <div class="schema-actions-bar">
                <div class="schema-actions-left">
                    <button class="btn btn-primary btn-lg" id="schema-save">
                        <span class="btn-icon">💾</span> Save Schema Changes
                    </button>
                </div>
                <div class="schema-actions-right">
                    <button class="btn btn-outline" id="schema-export" title="Download Schema JSON">
                         📤 Export
                    </button>
                    <button class="btn btn-outline" id="schema-import" title="Upload Schema JSON">
                         📥 Import
                    </button>
                </div>
            </div>
            <input type="file" id="schema-file-input" accept=".json" style="display:none" />
        </div>
    `;

    const schema = await loadSchema();
    const editorContainer = document.getElementById('schema-editor-container');

    // Dynamically load the schema editor component
    const { renderSchemaEditor } = await import('../schema/schema-editor.js');
    renderSchemaEditor(editorContainer, schema);

    // Save
    document.getElementById('schema-save').addEventListener('click', async () => {
        try {
            const { getEditedSchema } = await import('../schema/schema-editor.js');
            const editedSchema = getEditedSchema();
            const errors = validateSchema(editedSchema);
            if (errors.length > 0) {
                showToast('Validation errors:\n' + errors.join('\n'), 'error');
                return;
            }
            await saveSchema(editedSchema);
            if (state.syncEngine && state.syncEngine.isConfigured()) {
                await state.syncEngine.pushSchema(editedSchema);
            }
            showToast('Schema saved successfully!', 'success');
        } catch (e) {
            showToast('Error saving schema: ' + e.message, 'error');
        }
    });

    // Export
    document.getElementById('schema-export').addEventListener('click', async () => {
        const { getEditedSchema } = await import('../schema/schema-editor.js');
        const data = JSON.stringify(getEditedSchema(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'habit-tracker-schema.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Schema exported!', 'info');
    });

    // Import
    document.getElementById('schema-import').addEventListener('click', () => {
        document.getElementById('schema-file-input').click();
    });

    document.getElementById('schema-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            const errors = validateSchema(imported);
            if (errors.length > 0) {
                showToast('Invalid schema:\n' + errors.join('\n'), 'error');
                return;
            }
            renderSchemaEditor(editorContainer, imported);
            showToast('Schema imported! Click Save to apply.', 'info');
        } catch (err) {
            showToast('Error reading file: ' + err.message, 'error');
        }
    });
}
