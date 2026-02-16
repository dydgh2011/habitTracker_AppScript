/**
 * Dashboard View — Heatmaps + Yearly Charts
 */

import { YEAR } from '../config.js';
import { loadSchema } from '../schema/schema-manager.js';
import { getAllEntries, getAllMonthlyGoals } from '../db/local-store.js';
import { renderDailyHeatmap, renderMonthlyHeatmap } from '../components/heatmap.js';
import { buildYearlyCharts } from '../components/chart-builder.js';

export async function renderDashboardView(container, state) {
    container.innerHTML = `
        <h1 class="page-title">${YEAR} Dashboard</h1>

        <div class="dashboard-section">
            <div class="section-title">\uD83D\uDD34 Monthly Goals Progress</div>
            <div id="monthly-heatmap-container" class="loading"><div class="spinner"></div> Loading...</div>
        </div>

        <div class="dashboard-section">
            <div class="section-title">\uD83D\uDFE2 Daily Consistency Heatmap</div>
            <div id="daily-heatmap-container" class="loading"><div class="spinner"></div> Loading...</div>
        </div>

        <div class="dashboard-section">
            <div class="section-title">\uD83D\uDCC8 Yearly Progress</div>
            <div id="yearly-charts-container" class="loading"><div class="spinner"></div> Loading...</div>
        </div>
    `;

    // Load data
    const [schema, allEntries, monthlyGoals] = await Promise.all([
        loadSchema(),
        getAllEntries(YEAR),
        getAllMonthlyGoals(YEAR),
    ]);

    // Render monthly heatmap
    const monthlyHeatmapContainer = document.getElementById('monthly-heatmap-container');
    renderMonthlyHeatmap(monthlyHeatmapContainer, monthlyGoals);

    // Render daily heatmap
    const dailyHeatmapContainer = document.getElementById('daily-heatmap-container');
    renderDailyHeatmap(dailyHeatmapContainer, allEntries);

    // Render yearly charts
    const yearlyChartsContainer = document.getElementById('yearly-charts-container');
    buildYearlyCharts(yearlyChartsContainer, schema, allEntries);

    // Background sync
    if (state.syncEngine && state.syncEngine.isConfigured()) {
        try {
            await state.syncEngine.pullAll();

            // Reload and re-render with fresh data
            const [freshEntries, freshGoals] = await Promise.all([
                getAllEntries(YEAR),
                getAllMonthlyGoals(YEAR),
            ]);

            renderMonthlyHeatmap(monthlyHeatmapContainer, freshGoals);
            renderDailyHeatmap(dailyHeatmapContainer, freshEntries);
            buildYearlyCharts(yearlyChartsContainer, schema, freshEntries);
        } catch (err) {
            console.error('Dashboard sync error:', err);
        }
    }
}
