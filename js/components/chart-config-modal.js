/**
 * Chart Configuration Modal — UI for managing dashboard charts
 */

import { getDashboardChartConfig, saveDashboardChartConfig } from './chart-builder.js';
import { getChartGroups } from '../schema/schema-manager.js';
import { COLORS } from '../config.js';

export function renderChartConfigModal(container, schema) {
    // Check if modal already exists
    let modal = document.getElementById('chart-config-modal');
    if (modal) {
        modal.classList.add('open');
        loadChartsList(schema);
        return;
    }

    // Create modal structure
    modal = document.createElement('div');
    modal.id = 'chart-config-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3>Dashboard Charts</h3>
                <button class="modal-close" id="chart-modal-close">×</button>
            </div>
            <div class="modal-body">
                <div id="chart-list-view">
                    <div class="chart-list" id="chart-list-container">
                        <!-- Charts will be listed here -->
                    </div>
                    
                    <button class="btn btn-secondary" id="btn-add-chart" style="width:100%; margin-top:16px;">
                        + Create New Chart
                    </button>
                    <p style="text-align:center; font-size:11px; color:var(--color-text-muted); margin-top:12px;">
                        Changes are saved instantly to your dashboard.
                    </p>
                </div>

                <div id="chart-form-view" style="display:none;">
                    <h4 id="form-title" style="margin-bottom:20px; font-size:18px;">New Chart</h4>
                    
                    <div class="form-group">
                        <label class="form-label">Chart Title</label>
                        <input type="text" id="chart-title-input" class="form-input" placeholder="e.g., Fitness Progress">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Chart Type</label>
                        <select id="chart-type-input" class="form-select">
                            <option value="line">Line Chart (Trends)</option>
                            <option value="bar">Bar Chart (Comparisons)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Select Metrics</label>
                        <div id="series-selector-container" class="series-selector-root">
                            <!-- Grouped series options -->
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-top:24px; display:flex; gap:12px;">
                        <button class="btn btn-secondary" id="btn-cancel-form" style="flex:1;">Cancel</button>
                        <button class="btn btn-primary" id="btn-save-form" style="flex:2;">Confirm Settings</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event Listeners
    document.getElementById('chart-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById('btn-add-chart').addEventListener('click', () => {
        showForm(schema);
    });

    document.getElementById('btn-cancel-form').addEventListener('click', () => {
        showListView(schema);
    });

    // Save button logic is attached in showForm to handle editIndex context easily
    // but for cleaner approach we'll use a data attribute or state.

    // Initial Load
    requestAnimationFrame(() => modal.classList.add('open'));
    loadChartsList(schema);
}

let currentEditIndex = -1;

function closeModal() {
    const modal = document.getElementById('chart-config-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => {
            modal.remove();
            document.dispatchEvent(new CustomEvent('charts-updated'));
        }, 300);
    }
}

function showListView(schema) {
    document.getElementById('chart-list-view').style.display = 'block';
    document.getElementById('chart-form-view').style.display = 'none';
    loadChartsList(schema);
}

async function loadChartsList(schema) {
    const container = document.getElementById('chart-list-container');
    container.innerHTML = '<div class="spinner"></div>';

    const config = await getDashboardChartConfig(schema);
    container.innerHTML = '';

    if (config.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:40px; text-align:center; color:var(--color-text-muted);">No charts configured. Add one to get started!</div>';
        return;
    }

    config.forEach((chart, index) => {
        const item = document.createElement('div');
        item.className = 'chart-list-item';

        let seriesText = chart.series.map(s => s.label).join(', ');
        if (seriesText.length > 40) seriesText = seriesText.substring(0, 40) + '...';

        item.innerHTML = `
            <div class="chart-item-info">
                <div class="chart-item-title">${chart.title}</div>
                <div class="chart-item-meta">${chart.type.toUpperCase()} • ${seriesText}</div>
            </div>
            <div class="chart-item-actions">
                <button class="btn-icon" data-action="up" data-idx="${index}" title="Move Up">⬆️</button>
                <button class="btn-icon" data-action="down" data-idx="${index}" title="Move Down">⬇️</button>
                <button class="btn-icon" data-action="edit" data-idx="${index}" title="Edit">✏️</button>
                <button class="btn-icon" data-action="delete" data-idx="${index}" style="color:var(--color-error);" title="Delete">🗑️</button>
            </div>
        `;
        container.appendChild(item);
    });

    // Attach event listeners
    container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const btnTag = e.currentTarget;
            const action = btnTag.dataset.action;
            const idx = parseInt(btnTag.dataset.idx);

            if (action === 'edit') {
                showForm(schema, idx, config[idx]);
            } else if (action === 'delete') {
                if (confirm(`Are you sure you want to remove "${config[idx].title}"?`)) {
                    config.splice(idx, 1);
                    await saveDashboardChartConfig(config);
                    loadChartsList(schema);
                }
            } else {
                await handleReorder(action, idx, config, schema);
            }
        });
    });
}

async function handleReorder(action, index, config, schema) {
    if (action === 'up' && index > 0) {
        [config[index], config[index - 1]] = [config[index - 1], config[index]];
    } else if (action === 'down' && index < config.length - 1) {
        [config[index], config[index + 1]] = [config[index + 1], config[index]];
    } else {
        return;
    }
    await saveDashboardChartConfig(config);
    loadChartsList(schema);
}

function showForm(schema, editIndex = -1, existingConfig = null) {
    currentEditIndex = editIndex;
    document.getElementById('chart-list-view').style.display = 'none';
    document.getElementById('chart-form-view').style.display = 'block';

    const formTitle = document.getElementById('form-title');
    const titleInput = document.getElementById('chart-title-input');
    const typeInput = document.getElementById('chart-type-input');

    if (editIndex >= 0 && existingConfig) {
        formTitle.textContent = 'Edit Chart';
        titleInput.value = existingConfig.title;
        typeInput.value = existingConfig.type;
    } else {
        formTitle.textContent = 'New Chart';
        titleInput.value = '';
        typeInput.value = 'line';
    }

    renderSeriesSelector(schema, existingConfig?.series || []);

    // Re-bind save button to include the index context
    const saveBtn = document.getElementById('btn-save-form');
    // Remove old listeners to avoid duplicates
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', () => {
        saveChart(schema, editIndex);
    });
}

function renderSeriesSelector(schema, existingSeries = []) {
    const container = document.getElementById('series-selector-container');
    container.innerHTML = '';

    const selectedKeys = new Set();
    existingSeries.forEach(s => {
        if (s.type === 'completion') selectedKeys.add('completion');
        else selectedKeys.add(`${s.section}:${s.field}`);
    });

    // 1. Completion Group
    const compGroup = createSeriesGroup('System Metrics');
    const compItem = createSeriesItem('Daily Goals Completion %', 'completion', selectedKeys.has('completion'));
    compItem.querySelector('input').dataset.type = 'completion';
    compItem.querySelector('input').dataset.label = 'Completion %';
    compGroup.querySelector('.series-group-content').appendChild(compItem);
    container.appendChild(compGroup);

    // 2. Schema Groups
    const chartGroups = getChartGroups(schema);
    for (const [groupName, group] of chartGroups) {
        const title = groupName.startsWith('_ungrouped_') ? 'Other Metrics' : groupName;
        const sGroup = createSeriesGroup(title);
        const groupContent = sGroup.querySelector('.series-group-content');

        group.fields.forEach(f => {
            const key = `${f.section}:${f.name}`;
            const item = createSeriesItem(f.name, key, selectedKeys.has(key), f.unit);
            const input = item.querySelector('input');
            input.dataset.type = 'field';
            input.dataset.section = f.section;
            input.dataset.field = f.name;
            input.dataset.label = f.name;
            groupContent.appendChild(item);
        });

        container.appendChild(sGroup);
    }
}

function createSeriesGroup(title) {
    const div = document.createElement('div');
    div.className = 'series-selector-group';
    div.innerHTML = `
        <div class="series-group-title">${title}</div>
        <div class="series-group-content"></div>
    `;
    return div;
}

function createSeriesItem(label, value, isChecked, unit = '') {
    const div = document.createElement('label');
    div.className = `series-item ${isChecked ? 'selected' : ''}`;
    div.innerHTML = `
        <input type="checkbox" value="${value}" ${isChecked ? 'checked' : ''}>
        <div style="flex:1;">
            <div style="font-weight:600; font-size:13px;">${label}</div>
            ${unit ? `<div style="font-size:10px; color:var(--color-text-muted);">${unit}</div>` : ''}
        </div>
    `;

    const checkbox = div.querySelector('input');
    checkbox.addEventListener('change', () => {
        div.classList.toggle('selected', checkbox.checked);
    });

    return div;
}

async function saveChart(schema, editIndex) {
    const title = document.getElementById('chart-title-input').value.trim();
    if (!title) {
        alert('Please enter a chart title');
        return;
    }

    const type = document.getElementById('chart-type-input').value;
    const series = [];

    document.querySelectorAll('#series-selector-container input:checked').forEach(checkbox => {
        const ds = checkbox.dataset;
        if (ds.type === 'completion') {
            series.push({
                type: 'completion',
                label: ds.label,
                color: COLORS.chartGreen
            });
        } else {
            series.push({
                type: 'field',
                section: ds.section,
                field: ds.field,
                label: ds.label
            });
        }
    });

    if (series.length === 0) {
        alert('Please select at least one metric to display');
        return;
    }

    const config = await getDashboardChartConfig(schema);
    const chartData = {
        id: editIndex >= 0 ? config[editIndex].id : `custom_${Date.now()}`,
        title,
        type,
        series
    };

    if (editIndex >= 0) {
        config[editIndex] = chartData;
    } else {
        config.push(chartData);
    }

    await saveDashboardChartConfig(config);
    showListView(schema);
}
