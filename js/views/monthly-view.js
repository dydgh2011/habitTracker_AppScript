/**
 * Monthly View — Data grid + Charts + Stat bar
 */

import { YEAR, MONTHS, MONTH_FULL } from '../config.js';
import { loadSchema, countDailyGoals } from '../schema/schema-manager.js';
import { getMonthEntries, getAllMonthlyGoals, putMonthlyGoal, getMonthlyGoal } from '../db/data-access.js';
import { renderDataGrid } from '../components/data-grid.js';
import { buildMonthlyCharts } from '../components/chart-builder.js';
import { getDaysInMonth, toDateId, toMonthId } from '../utils/date-utils.js';
import { navigateTo, showToast } from '../utils/ui-helpers.js';

/**
 * Compute monthly view statistics
 */
function computeMonthStats(entriesMap, daysInMonth, schema) {
    let daysTracked = 0;
    let totalCompletion = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateId = toDateId(YEAR, 0, d);
        const dayId = Object.keys(entriesMap).find(id => id.endsWith(`-${String(d).padStart(2, '0')}`));
        const entry = dayId ? entriesMap[dayId] : null;
        if (entry && entry.dailyGoalCompletion > 0) {
            daysTracked++;
            totalCompletion += entry.dailyGoalCompletion;
            tempStreak++;
            if (tempStreak > currentStreak) currentStreak = tempStreak;
        } else {
            tempStreak = 0;
        }
    }
    const avg = daysTracked > 0 ? Math.round((totalCompletion / daysTracked) * 100) : 0;
    return { daysTracked, avg, currentStreak };
}

export async function renderMonthlyView(container, state, monthIndex) {
    if (typeof monthIndex !== 'number' || monthIndex < 0 || monthIndex > 11) {
        container.innerHTML = '<p>Invalid month.</p>';
        return;
    }

    const month = monthIndex + 1;
    const daysInMonth = getDaysInMonth(YEAR, month);
    const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
    const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;

    container.innerHTML = `
        <div class="month-title-bar">
            <button class="month-nav-btn" id="prev-month">\u2190 ${MONTHS[prevMonth]}</button>
            <h1 class="page-title" style="margin-bottom:0">${MONTH_FULL[monthIndex]} <span class="title-accent">${YEAR}</span></h1>
            <button class="month-nav-btn" id="next-month">${MONTHS[nextMonth]} \u2192</button>
        </div>

        <div id="month-stats-bar" class="month-stats-bar" style="display:none;"></div>

        <div id="data-grid-container" class="loading"><div class="spinner"></div> Loading data grid...</div>
        <div id="monthly-charts-container" class="loading"><div class="spinner"></div> Loading charts...</div>
    `;

    document.getElementById('prev-month').addEventListener('click', () => {
        navigateTo(`#/month/${MONTHS[prevMonth].toLowerCase()}`);
    });
    document.getElementById('next-month').addEventListener('click', () => {
        navigateTo(`#/month/${MONTHS[nextMonth].toLowerCase()}`);
    });

    const schema = await loadSchema();
    let entries = await getMonthEntries(YEAR, month);
    const monthId = toMonthId(YEAR, month);
    let monthlyGoalDoc = await getMonthlyGoal(monthId);

    // Build entries map
    const entriesMap = {};
    for (const e of entries) {
        entriesMap[e._id] = e;
    }

    // Render stat bar
    const totalGoals = countDailyGoals(schema);
    if (totalGoals > 0) {
        const stats = computeMonthStats(entriesMap, daysInMonth, schema);
        const statsBar = document.getElementById('month-stats-bar');
        statsBar.style.display = 'flex';
        statsBar.innerHTML = `
            <div class="month-stat">
                <span class="month-stat-icon">📅</span>
                <span class="month-stat-value">${stats.daysTracked}</span>
                <span>Days Tracked</span>
            </div>
            <div class="month-stat">
                <span class="month-stat-icon">📊</span>
                <span class="month-stat-value">${stats.avg}%</span>
                <span>Avg Completion</span>
            </div>
            <div class="month-stat">
                <span class="month-stat-icon">🔥</span>
                <span class="month-stat-value">${stats.currentStreak}d</span>
                <span>Best Streak</span>
            </div>
        `;
    }

    // Render data grid
    const gridContainer = document.getElementById('data-grid-container');
    renderDataGrid(gridContainer, schema, month, daysInMonth, entriesMap, monthlyGoalDoc,
        async (entry) => {
            // On entry change
            if (state.syncEngine) {
                await state.syncEngine.saveEntry(entry);
            } else {
                const { putEntry } = await import('../db/data-access.js');
                await putEntry(entry);
            }
        },
        async (goalDoc) => {
            // On monthly goal change
            if (state.syncEngine) {
                await state.syncEngine.saveMonthlyGoal(goalDoc);
            } else {
                await putMonthlyGoal(goalDoc);
            }
        }
    );

    // Render charts
    const chartsContainer = document.getElementById('monthly-charts-container');
    buildMonthlyCharts(chartsContainer, schema, entriesMap, month);

    // Background sync
    if (state.syncEngine && state.syncEngine.isConfigured()) {
        try {
            await state.syncEngine.pullAll();
            entries = await getMonthEntries(YEAR, month);
            const freshMap = {};
            for (const e of entries) freshMap[e._id] = e;

            monthlyGoalDoc = await getMonthlyGoal(monthId);
            renderDataGrid(gridContainer, schema, month, daysInMonth, freshMap, monthlyGoalDoc,
                async (entry) => {
                    if (state.syncEngine) {
                        await state.syncEngine.saveEntry(entry);
                    } else {
                        const { putEntry } = await import('../db/data-access.js');
                        await putEntry(entry);
                    }
                },
                async (goalDoc) => {
                    if (state.syncEngine) {
                        await state.syncEngine.saveMonthlyGoal(goalDoc);
                    } else {
                        await putMonthlyGoal(goalDoc);
                    }
                }
            );
            buildMonthlyCharts(chartsContainer, schema, freshMap, month);
        } catch (err) {
            console.error('Monthly sync error:', err);
        }
    }
}
