/**
 * Schema View — Visual schema editor page
 */

import { loadSchema, saveSchema, validateSchema, clearSchemaCache } from '../schema/schema-manager.js';
import { renderSchemaEditor } from '../schema/schema-editor.js';
import { showToast } from '../utils/ui-helpers.js';

export async function renderSchemaView(container, state) {
    container.innerHTML = `
        <h1 class="page-title">Schema Editor</h1>
        <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
            Configure your tracking fields. Changes will apply to all views.
            Existing data for removed fields is preserved (hidden, not deleted).
        </p>
        <div class="card schema-editor" id="schema-editor-container">
            <div class="loading"><div class="spinner"></div> Loading schema...</div>
        </div>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border-light);">
            <h3 style="margin-bottom: 8px;">Import / Export</h3>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="schema-export-btn">Export Schema (JSON)</button>
                <button class="btn btn-secondary" id="schema-import-btn">Import Schema (JSON)</button>
                <input type="file" id="schema-import-file" accept=".json" style="display: none;">
            </div>
        </div>
    `;

    const schema = await loadSchema();
    const editorContainer = document.getElementById('schema-editor-container');

    renderSchemaEditor(editorContainer, schema, async (updatedSchema) => {
        // Validate
        const { valid, errors } = validateSchema(updatedSchema);
        if (!valid) {
            showToast('Schema errors: ' + errors.join('; '), 'error', 5000);
            return;
        }

        // Save
        const meta = await saveSchema(updatedSchema);
        clearSchemaCache();

        // Sync if configured
        if (state.syncEngine && state.syncEngine.isConfigured()) {
            state.syncEngine.saveMeta(meta).catch(console.error);
        }

        showToast('Schema saved!', 'success');
    });

    // Export
    document.getElementById('schema-export-btn').addEventListener('click', async () => {
        const currentSchema = await loadSchema();
        const blob = new Blob([JSON.stringify(currentSchema, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'habit-tracker-schema.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Schema exported!', 'success');
    });

    // Import
    document.getElementById('schema-import-btn').addEventListener('click', () => {
        document.getElementById('schema-import-file').click();
    });

    document.getElementById('schema-import-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            const { valid, errors } = validateSchema(imported);
            if (!valid) {
                showToast('Invalid schema: ' + errors.join('; '), 'error', 5000);
                return;
            }

            await saveSchema(imported);
            clearSchemaCache();

            // Re-render the editor
            renderSchemaEditor(editorContainer, imported, async (updatedSchema) => {
                const { valid: v2, errors: e2 } = validateSchema(updatedSchema);
                if (!v2) {
                    showToast('Schema errors: ' + e2.join('; '), 'error', 5000);
                    return;
                }
                await saveSchema(updatedSchema);
                clearSchemaCache();
                showToast('Schema saved!', 'success');
            });

            showToast('Schema imported!', 'success');
        } catch (err) {
            showToast('Failed to import: ' + err.message, 'error');
        }
    });
}
