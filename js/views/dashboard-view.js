/**
 * Dashboard View — Stat Cards + Heatmaps + Yearly Charts
 */

import { YEAR } from '../config.js';
import { loadSchema } from '../schema/schema-manager.js';
import { getAllEntries, getAllMonthlyGoals } from '../db/data-access.js';
import { renderDailyHeatmap, renderMonthlyHeatmap } from '../components/heatmap.js';
import { buildYearlyCharts } from '../components/chart-builder.js';
import { toDateId } from '../utils/date-utils.js';

/**
 * Compute dashboard statistics from entries
 */
function computeStats(allEntries, monthlyGoals) {
    const today = new Date();
    const todayId = toDateId(today.getFullYear(), today.getMonth() + 1, today.getDate());

    let totalTracked = 0;
    let totalCompletion = 0;
    let currentStreak = 0;
    let todayCompletion = 0;

    // Sort entries by date
    const sorted = [...allEntries].sort((a, b) => a._id.localeCompare(b._id));

    for (const entry of sorted) {
        if (entry.dailyGoalCompletion > 0) {
            totalTracked++;
            totalCompletion += entry.dailyGoalCompletion;
        }
        if (entry._id === todayId) {
            todayCompletion = entry.dailyGoalCompletion || 0;
        }
    }

    // Calculate current streak (consecutive days from today going backward)
    const dateSet = new Set(sorted.filter(e => e.dailyGoalCompletion >= 0.5).map(e => e._id));
    const d = new Date(today);
    while (true) {
        const id = toDateId(d.getFullYear(), d.getMonth() + 1, d.getDate());
        if (dateSet.has(id)) {
            currentStreak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }

    // Monthly completion average
    let monthlyAvg = 0;
    if (monthlyGoals.length > 0) {
        monthlyAvg = monthlyGoals.reduce((sum, g) => sum + (g.completionRate || 0), 0) / monthlyGoals.length;
    }

    const avgCompletion = totalTracked > 0 ? totalCompletion / totalTracked : 0;

    return { totalTracked, avgCompletion, currentStreak, todayCompletion, monthlyAvg };
}

export async function renderDashboardView(container, state) {
    container.innerHTML = `
        <h1 class="page-title">${YEAR} <span class="title-accent">Dashboard</span></h1>

        <div class="stat-cards-row" id="stat-cards">
            <div class="stat-card green">
                <div class="stat-card-header">
                    <div class="stat-card-icon">🔥</div>
                    <div class="stat-card-label">Current Streak</div>
                </div>
                <div class="stat-card-value" id="stat-streak">—</div>
            </div>
            <div class="stat-card blue">
                <div class="stat-card-header">
                    <div class="stat-card-icon">✅</div>
                    <div class="stat-card-label">Today's Goals</div>
                </div>
                <div class="stat-card-value" id="stat-today">—</div>
            </div>
            <div class="stat-card amber">
                <div class="stat-card-header">
                    <div class="stat-card-icon">📊</div>
                    <div class="stat-card-label">Avg Completion</div>
                </div>
                <div class="stat-card-value" id="stat-avg">—</div>
            </div>
            <div class="stat-card red">
                <div class="stat-card-header">
                    <div class="stat-card-icon">📅</div>
                    <div class="stat-card-label">Days Tracked</div>
                </div>
                <div class="stat-card-value" id="stat-tracked">—</div>
            </div>
        </div>

        <div class="dashboard-section">
            <div class="section-title"><span class="section-icon">⏳</span> Time Progression</div>
            <div class="stat-cards-row" id="time-progression-row">
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon">🌍</div>
                        <div class="stat-card-label">${YEAR} Year Progress</div>
                    </div>
                    <div id="year-progress-container" class="progression-circle-wrapper"></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon">🌙</div>
                        <div id="month-progress-label" class="stat-card-label">Month Progress</div>
                    </div>
                    <div id="month-progress-container" class="progression-circle-wrapper"></div>
                </div>
            </div>
        </div>

        <div class="dashboard-section">
            <div class="section-title"><span class="section-icon">🔴</span> Monthly Goals Progress</div>
            <div id="monthly-heatmap-container" class="loading"><div class="spinner"></div> Loading...</div>
        </div>

        <div class="dashboard-section">
            <div class="section-title"><span class="section-icon">🟢</span> Daily Consistency Heatmap</div>
            <div id="daily-heatmap-container" class="loading"><div class="spinner"></div> Loading...</div>
        </div>

        <div class="dashboard-section">
            <div class="section-title"><span class="section-icon">📈</span> Yearly Progress</div>
            <div id="yearly-charts-container" class="loading"><div class="spinner"></div> Loading...</div>
        </div>
    `;

    // Load data
    const [schema, allEntries, monthlyGoals] = await Promise.all([
        loadSchema(),
        getAllEntries(YEAR),
        getAllMonthlyGoals(YEAR),
    ]);

    // Compute & render stats
    const stats = computeStats(allEntries, monthlyGoals);
    document.getElementById('stat-streak').textContent = `${stats.currentStreak}d`;
    document.getElementById('stat-today').textContent = `${Math.round(stats.todayCompletion * 100)}%`;
    document.getElementById('stat-avg').textContent = `${Math.round(stats.avgCompletion * 100)}%`;
    document.getElementById('stat-tracked').textContent = stats.totalTracked;

    // Render monthly heatmap
    const monthlyHeatmapContainer = document.getElementById('monthly-heatmap-container');
    renderMonthlyHeatmap(monthlyHeatmapContainer, monthlyGoals);

    // Render daily heatmap
    const dailyHeatmapContainer = document.getElementById('daily-heatmap-container');
    renderDailyHeatmap(dailyHeatmapContainer, allEntries);

    // Render yearly charts
    const yearlyChartsContainer = document.getElementById('yearly-charts-container');
    buildYearlyCharts(yearlyChartsContainer, schema, allEntries);

    // Render time progression
    renderTimeProgression();

    // Background sync
    if (state.syncEngine && state.syncEngine.isConfigured()) {
        try {
            await state.syncEngine.pullAll();

            const [freshEntries, freshGoals] = await Promise.all([
                getAllEntries(YEAR),
                getAllMonthlyGoals(YEAR),
            ]);

            const freshStats = computeStats(freshEntries, freshGoals);
            document.getElementById('stat-streak').textContent = `${freshStats.currentStreak}d`;
            document.getElementById('stat-today').textContent = `${Math.round(freshStats.todayCompletion * 100)}%`;
            document.getElementById('stat-avg').textContent = `${Math.round(freshStats.avgCompletion * 100)}%`;
            document.getElementById('stat-tracked').textContent = freshStats.totalTracked;

            renderMonthlyHeatmap(monthlyHeatmapContainer, freshGoals);
            renderDailyHeatmap(dailyHeatmapContainer, freshEntries);
            buildYearlyCharts(yearlyChartsContainer, schema, freshEntries);
        } catch (err) {
            console.error('Dashboard sync error:', err);
        }
    }
}

/**
 * Render year and month progression circles
 */
function renderTimeProgression() {
    const now = new Date();
    const isLeap = (YEAR % 4 === 0 && YEAR % 100 !== 0) || (YEAR % 400 === 0);
    const daysInYear = isLeap ? 366 : 365;

    // Year Progress
    const startOfYear = new Date(YEAR, 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    const yearCompletion = Math.min(1, Math.max(0, dayOfYear / daysInYear));
    const yearPct = Math.round(yearCompletion * 100);

    // Month Progress
    const currentMonthIdx = now.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const daysInMonth = new Date(YEAR, currentMonthIdx + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthCompletion = Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
    const monthPct = Math.round(monthCompletion * 100);

    document.getElementById('month-progress-label').textContent = `${monthNames[currentMonthIdx]} Progress`;

    renderProgressCircle(document.getElementById('year-progress-container'), yearCompletion, yearPct, 'var(--color-primary)');
    renderProgressCircle(document.getElementById('month-progress-container'), monthCompletion, monthPct, 'var(--color-info)');
}

function renderProgressCircle(container, completion, pct, color) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (completion * circumference);

    container.innerHTML = `
        <div class="circular-progress" style="width: 120px; height: 120px;">
            <svg viewBox="0 0 100 100">
                <circle class="circular-progress-bg" cx="50" cy="50" r="${radius}"></circle>
                <circle class="circular-progress-bar" cx="50" cy="50" r="${radius}" 
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}; stroke: ${color}">
                </circle>
            </svg>
            <div class="circular-progress-text" style="font-size: 22px;">${pct}%</div>
        </div>
    `;
}
