/**
 * Monthly View — Renders the data grid for a selected month + charts
 */

import { YEAR, MONTHS } from '../config.js';
import { getDaysInMonth, toDateId, toMonthId } from '../utils/date-utils.js';
import { loadSchema } from '../schema/schema-manager.js';
import { getMonthEntries, getMonthlyGoal, putMonthlyGoal } from '../db/local-store.js';
import { renderDataGrid } from '../components/data-grid.js';
import { buildMonthlyCharts } from '../components/chart-builder.js';
import { createEmptyMonthlyGoals } from '../components/goal-manager.js';
import { navigateTo, showToast } from '../utils/ui-helpers.js';

export async function renderMonthlyView(container, state, monthIndex) {
    const monthName = MONTHS[monthIndex];
    const month = monthIndex + 1;

    container.innerHTML = `
        <div class="month-title-bar">
            <button class="month-nav-btn" id="month-prev">\u2190 ${MONTHS[monthIndex === 0 ? 11 : monthIndex - 1]}</button>
            <h1 class="page-title">${monthName} '${YEAR.toString().slice(-2)}</h1>
            <button class="month-nav-btn" id="month-next">${MONTHS[monthIndex === 11 ? 0 : monthIndex + 1]} \u2192</button>
        </div>
        <div id="monthly-grid-container" class="loading"><div class="spinner"></div> Loading...</div>
        <div id="monthly-charts-container"></div>
    `;

    // Navigation
    document.getElementById('month-prev').addEventListener('click', () => {
        const prev = monthIndex === 0 ? 11 : monthIndex - 1;
        navigateTo(`#/month/${MONTHS[prev].toLowerCase()}`);
    });
    document.getElementById('month-next').addEventListener('click', () => {
        const next = monthIndex === 11 ? 0 : monthIndex + 1;
        navigateTo(`#/month/${MONTHS[next].toLowerCase()}`);
    });

    // Load schema and data
    const schema = await loadSchema();
    const entries = await getMonthEntries(YEAR, month);
    const monthId = toMonthId(YEAR, month);
    let monthlyGoalDoc = await getMonthlyGoal(monthId);

    // Create monthly goals doc if it doesn't exist
    if (!monthlyGoalDoc) {
        monthlyGoalDoc = {
            _id: monthId,
            year: YEAR,
            month: month,
            goals: createEmptyMonthlyGoals(schema),
            completionRate: 0,
        };
    }

    // Build entries map (dateId -> entry)
    const entriesMap = {};
    for (const entry of entries) {
        entriesMap[entry._id] = entry;
    }

    // Render the grid
    const gridContainer = document.getElementById('monthly-grid-container');

    const onEntryChange = async (dateId, updatedEntry) => {
        entriesMap[dateId] = updatedEntry;

        // Save locally + schedule sync
        if (state.syncEngine) {
            await state.syncEngine.saveEntry(updatedEntry);
        } else {
            const { putEntry } = await import('../db/local-store.js');
            await putEntry(updatedEntry);
        }

        // Rebuild charts
        renderCharts(schema, entriesMap, month);
    };

    const onMonthlyGoalChange = async (updatedDoc) => {
        monthlyGoalDoc = updatedDoc;

        if (state.syncEngine) {
            await state.syncEngine.saveMonthlyGoal(updatedDoc);
        } else {
            await putMonthlyGoal(updatedDoc);
        }
    };

    renderDataGrid(gridContainer, schema, entriesMap, monthlyGoalDoc, monthIndex, onEntryChange, onMonthlyGoalChange);

    // Render charts
    renderCharts(schema, entriesMap, month);

    // Background sync
    if (state.syncEngine && state.syncEngine.isConfigured()) {
        state.syncEngine.pullAll().then(() => {
            // After pull, reload data and re-render
            getMonthEntries(YEAR, month).then(freshEntries => {
                const freshMap = {};
                for (const e of freshEntries) freshMap[e._id] = e;

                // Check if data changed
                if (JSON.stringify(freshMap) !== JSON.stringify(entriesMap)) {
                    Object.assign(entriesMap, freshMap);
                    renderDataGrid(gridContainer, schema, entriesMap, monthlyGoalDoc, monthIndex, onEntryChange, onMonthlyGoalChange);
                    renderCharts(schema, entriesMap, month);
                }
            });
        }).catch(console.error);
    }
}

function renderCharts(schema, entriesMap, month) {
    const chartsContainer = document.getElementById('monthly-charts-container');
    if (chartsContainer) {
        buildMonthlyCharts(chartsContainer, schema, entriesMap, month);
    }
}
