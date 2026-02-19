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

        <div class="dashboard-hero">
            <div class="hero-stats" id="stat-cards">
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
            <div class="hero-progression" id="time-progression-row">
                <div class="stat-card progression-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon">📅</div>
                        <div class="stat-card-label">Time Progress</div>
                    </div>
                    <div id="dual-progress-container" class="dual-progress-wrapper"></div>
                </div>
            </div>
        </div>

        <div class="dashboard-section">
            <div class="section-title"><span class="section-icon">📊</span> Goals Progress</div>
            <div id="monthly-heatmap-container" class="loading"><div class="spinner"></div> Loading...</div>
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

    renderDualProgressRings(
        document.getElementById('dual-progress-container'),
        monthCompletion, monthPct, monthNames[currentMonthIdx],
        yearCompletion, yearPct, YEAR
    );
}

/**
 * Renders overlapping dual progress rings:
 * - Large main ring = current month
 * - Small secondary ring (60% size) = year, offset bottom-right
 */
function renderDualProgressRings(container, monthPct, monthPctRound, monthName, yearPct, yearPctRound, year) {
    // Main (month) ring dimensions
    const mainSize = 160;
    const mainR = 60;
    const mainCx = 80;
    const mainCy = 80;
    const mainViewBox = 160;
    const mainCircumference = 2 * Math.PI * mainR;
    const mainOffset = mainCircumference - (monthPct * mainCircumference);

    // Secondary (year) ring — 60% of main
    const secSize = Math.round(mainSize * 0.6); // 96px
    const secR = 34;
    const secCx = 48;
    const secCy = 48;
    const secViewBox = 96;
    const secCircumference = 2 * Math.PI * secR;
    const secOffset = secCircumference - (yearPct * secCircumference);

    // Offset: bottom-right, overlapping by ~25% of main diameter
    const overlapOffset = Math.round(mainSize * 0.42);

    container.innerHTML = `
        <div class="dual-rings-scene">
            <!-- Main ring: Current Month -->
            <div class="dual-ring-main">
                <svg width="${mainSize}" height="${mainSize}" viewBox="0 0 ${mainViewBox} ${mainViewBox}">
                    <circle class="circular-progress-bg" cx="${mainCx}" cy="${mainCy}" r="${mainR}" stroke-width="9"></circle>
                    <circle class="circular-progress-bar" cx="${mainCx}" cy="${mainCy}" r="${mainR}"
                        stroke-width="9"
                        style="stroke-dasharray: ${mainCircumference.toFixed(2)}; stroke-dashoffset: ${mainOffset.toFixed(2)}; stroke: var(--color-info);"
                        transform="rotate(-90 ${mainCx} ${mainCy})"
                    ></circle>
                </svg>
                <div class="dual-ring-label-main">
                    <span class="dual-ring-pct">${monthPctRound}%</span>
                    <span class="dual-ring-name">${monthName}</span>
                </div>
            </div>
            <!-- Secondary ring: Year -->
            <div class="dual-ring-secondary" style="width:${secSize}px; height:${secSize}px; bottom:-${Math.round(secSize * 0.18)}px; right:-${Math.round(secSize * 0.18)}px;">
                <svg width="${secSize}" height="${secSize}" viewBox="0 0 ${secViewBox} ${secViewBox}">
                    <circle class="circular-progress-bg" cx="${secCx}" cy="${secCy}" r="${secR}" stroke-width="7"></circle>
                    <circle class="circular-progress-bar" cx="${secCx}" cy="${secCy}" r="${secR}"
                        stroke-width="7"
                        style="stroke-dasharray: ${secCircumference.toFixed(2)}; stroke-dashoffset: ${secOffset.toFixed(2)}; stroke: var(--color-primary);"
                        transform="rotate(-90 ${secCx} ${secCy})"
                    ></circle>
                </svg>
                <div class="dual-ring-label-sec">
                    <span class="dual-ring-pct-sec">${yearPctRound}%</span>
                    <span class="dual-ring-name-sec">${year}</span>
                </div>
            </div>
        </div>
    `;
}
