/**
 * Chart Builder — Dynamic chart generation with polished styling
 */

import { YEAR, CHART_PALETTE, COLORS, MONTHS } from '../config.js';
import { getDaysInMonth, toDateId, getWeekNumber } from '../utils/date-utils.js';
import { getChartGroups, countDailyGoals } from '../schema/schema-manager.js';
import { getMeta, putMeta } from '../db/local-store.js';

// Track active chart instances for cleanup
const activeCharts = new Map();

// Chart group icons
const GROUP_ICONS = {
    default: '📊',
    completion: '✅',
    time: '⏱',
    distance: '🏃',
    calories: '🔥',
    weight: '⚖️',
};

function getGroupIcon(groupName) {
    const lower = groupName.toLowerCase();
    for (const [key, icon] of Object.entries(GROUP_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return GROUP_ICONS.default;
}

/**
 * Apply global Chart.js defaults for premium look
 */
function applyChartDefaults() {
    if (Chart.defaults._customApplied) return;
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    Chart.defaults.font.weight = 500;
    Chart.defaults.color = '#5c5650';
    Chart.defaults.elements.bar.borderRadius = 4;
    Chart.defaults.elements.bar.borderSkipped = false;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1a1816';
    Chart.defaults.plugins.tooltip.titleFont = { weight: 700, size: 13 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.padding = { top: 10, bottom: 10, left: 14, right: 14 };
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.scale.grid = {
        color: 'rgba(0, 0, 0, 0.04)',
        drawBorder: false,
    };
    Chart.defaults.scale.ticks = {
        ...Chart.defaults.scale.ticks,
        font: { size: 11, weight: 500 },
    };
    Chart.defaults._customApplied = true;
}

/**
 * Build monthly charts (for a single month's view)
 */
export function buildMonthlyCharts(container, schema, entriesMap, month) {
    applyChartDefaults();
    container.innerHTML = '';
    destroyCharts('monthly');

    const daysInMonth = getDaysInMonth(YEAR, month);
    const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const chartsWrapper = document.createElement('div');
    chartsWrapper.className = 'charts-container';

    // ===== Chart 1: Daily Goals Completion % =====
    const totalGoals = countDailyGoals(schema);
    if (totalGoals > 0) {
        const completionData = dayLabels.map(d => {
            const dateId = toDateId(YEAR, month, d);
            const entry = entriesMap[dateId];
            return entry ? (entry.dailyGoalCompletion || 0) * 100 : 0;
        });

        const card = createChartCard('Daily Goals Completion', '%', '✅', 'green');
        const chart = createChart(card.querySelector('canvas'), {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Completion %',
                    data: completionData,
                    borderColor: COLORS.chartGreen,
                    backgroundColor: hexToRgba(COLORS.chartGreen, 0.12),
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: COLORS.chartGreen,
                    pointBorderWidth: 2,
                    borderWidth: 2.5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: 'Day', font: { weight: 600 } } },
                    y: { min: 0, max: 100, title: { display: true, text: '%', font: { weight: 600 } } }
                }
            }
        }, 'monthly');
        chartsWrapper.appendChild(card);
    }

    // ===== Dynamic charts from schema chartGroups =====
    const chartGroups = getChartGroups(schema);

    for (const [groupName, group] of chartGroups) {
        const datasets = group.fields.map((field, idx) => {
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const data = dayLabels.map(d => {
                const dateId = toDateId(YEAR, month, d);
                const entry = entriesMap[dateId];
                const val = entry?.fields?.[field.section]?.[field.name];
                return val !== null && val !== undefined ? parseFloat(val) : null;
            });

            return {
                label: field.name,
                data: data,
                borderColor: color,
                backgroundColor: hexToRgba(color, group.chartType === 'area' ? 0.12 : 0.7),
                fill: group.chartType === 'area',
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#fff',
                pointBorderColor: color,
                pointBorderWidth: 2,
                borderWidth: 2.5,
            };
        });

        let chartType = 'line';
        if (group.chartType === 'bar' || group.chartType === 'column') chartType = 'bar';

        const title = groupName.startsWith('_ungrouped_')
            ? group.fields[0].name
            : capitalizeFirst(groupName);

        const unit = group.fields[0].unit || '';
        const icon = getGroupIcon(groupName);
        const colorClass = ['green', 'blue', 'amber', 'red'][Math.abs(hashCode(groupName)) % 4];

        const card = createChartCard(title, unit, icon, colorClass);
        createChart(card.querySelector('canvas'), {
            type: chartType,
            data: {
                labels: dayLabels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        position: 'top',
                        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { weight: 600 } }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Day', font: { weight: 600 } } },
                    y: {
                        min: 0,
                        title: { display: true, text: unit, font: { weight: 600 } }
                    }
                }
            }
        }, 'monthly');
        chartsWrapper.appendChild(card);
    }

    container.appendChild(chartsWrapper);
}

/**
 * Build yearly charts (for dashboard, all 365 days)
 */
/**
 * Load dashboard chart config from local store (or generate default)
 */
export async function getDashboardChartConfig(schema) {
    const meta = await getMeta();
    if (meta && meta.dashboardCharts) {
        return meta.dashboardCharts;
    }

    // Generate default from schema groups
    const chartGroups = getChartGroups(schema);
    const defaultConfig = [];

    // 1. Daily Goals Completion (Always first)
    defaultConfig.push({
        id: 'daily_goals_completion',
        title: 'Daily Goals Completion',
        type: 'line',
        series: [{ type: 'completion', label: 'Completion %', color: COLORS.chartGreen }]
    });

    // 2. Add schema groups
    for (const [groupName, group] of chartGroups) {
        const title = groupName.startsWith('_ungrouped_')
            ? group.fields[0].name
            : capitalizeFirst(groupName);

        defaultConfig.push({
            id: `chart_${hashCode(groupName)}`,
            title: title,
            type: group.chartType || 'line',
            series: group.fields.map(f => ({
                type: 'field',
                section: f.section,
                field: f.name,
                label: f.name
            }))
        });
    }

    return defaultConfig;
}

/**
 * Save dashboard chart config
 */
export async function saveDashboardChartConfig(config) {
    const meta = await getMeta() || { _id: 'app_config' };
    meta.dashboardCharts = config;
    await putMeta(meta);
}

/**
 * Aggregate data based on date range
 */
function aggregateData(dataPoints, aggregationType) {
    if (aggregationType === 'daily') {
        return dataPoints.map(d => ({
            label: d.label || d.dateId,
            value: d.value
        }));
    }

    const groups = new Map();

    for (const point of dataPoints) {
        let key;
        const dateStr = point.label || point.dateId;
        if (aggregationType === 'weekly') {
            const d = new Date(dateStr);
            const week = getWeekNumber(d);
            key = `W${week}`;
        } else { // monthly
            const d = new Date(dateStr);
            key = MONTHS[d.getMonth()];
        }

        if (!groups.has(key)) {
            groups.set(key, { count: 0, sum: 0, label: key });
        }

        if (point.value !== null) {
            const g = groups.get(key);
            g.count++;
            g.sum += point.value;
        }
    }

    return Array.from(groups.values()).map(g => ({
        label: g.label,
        value: g.count > 0 ? g.sum / g.count : null // Average
    }));
}

/**
 * Build Dashboard Charts with Adaptive Aggregation
 */
export async function buildDashboardCharts(container, schema, allEntries) {
    applyChartDefaults();
    container.innerHTML = '';
    destroyCharts('dashboard');

    const config = await getDashboardChartConfig(schema);
    const entriesMap = {};
    for (const e of allEntries) entriesMap[e._id] = e;

    // 1. Determine Date Range & Aggregation
    // For now, we assume "Yearly" (all dates in YEAR)
    // Future: customizable range
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayId = toDateId(currentYear, now.getMonth() + 1, now.getDate());

    const allDates = [];
    for (let m = 1; m <= 12; m++) {
        const dim = getDaysInMonth(YEAR, m);
        for (let d = 1; d <= dim; d++) {
            const dateId = toDateId(YEAR, m, d);
            if (YEAR < currentYear || dateId <= todayId) {
                allDates.push({ dateId });
            }
        }
    }

    // Determine aggregation level based on populated data span
    const totalVisibleDays = allDates.length;
    let aggregation = 'daily';

    if (totalVisibleDays > 180) aggregation = 'monthly';
    else if (totalVisibleDays > 45) aggregation = 'weekly';

    // 2. Build Charts
    const chartsWrapper = document.createElement('div');
    chartsWrapper.className = 'charts-container';

    for (const chartConfig of config) {
        const datasets = [];
        let labels = [];

        for (const [idx, series] of chartConfig.series.entries()) {
            const rawData = allDates.map(d => {
                const entry = entriesMap[d.dateId];
                let val = null;

                if (series.type === 'completion') {
                    val = entry ? (entry.dailyGoalCompletion || 0) * 100 : 0;
                } else if (series.type === 'field') {
                    const rawV = entry?.fields?.[series.section]?.[series.field] ?? entry?.[series.field];
                    if (rawV !== null && rawV !== undefined && rawV !== '') {
                        const parsed = parseFloat(rawV);
                        val = isNaN(parsed) ? null : parsed;
                    } else {
                        val = null;
                    }
                }
                return { label: d.dateId, value: val };
            });

            // Filter nulls if needed (only skip series if it has literally NO data points)
            const hasData = rawData.some(d => d.value !== null);
            if (!hasData && series.type !== 'completion') continue; // Skip empty series, keep completion

            // Aggregate
            const aggregated = aggregateData(rawData, aggregation);

            // Set labels from the first series that has data or the first series in total
            if (labels.length === 0 || idx === 0) {
                labels = aggregated.map(d => d.label);
            }

            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            datasets.push({
                label: series.label,
                data: aggregated.map(d => d.value),
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.1),
                fill: false,
                tension: 0.3,
                pointRadius: 5, // Increased visibility
                pointHoverRadius: 7,
                pointHitRadius: 12,
                pointBorderWidth: 2,
                pointBackgroundColor: '#fff',
                borderWidth: 3,
                showLine: true,
                spanGaps: true
            });
        }

        if (datasets.length === 0) continue; // Skip chart if no data

        const card = createChartCard(
            chartConfig.title,
            `${capitalizeFirst(aggregation)} Average`,
            getGroupIcon(chartConfig.title),
            'blue'
        );
        card.querySelector('canvas').style.maxHeight = '300px';

        // Add "Edit" button for custom charts (future)
        // const editBtn = document.createElement('button');
        // editBtn.innerHTML = '⚙️';
        // editBtn.className = 'chart-edit-btn';
        // card.querySelector('.chart-card-header').appendChild(editBtn);

        createChart(card.querySelector('canvas'), {
            type: chartConfig.type || 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1 }
                },
                spanGaps: true, // Show disconnected points
                scales: {
                    x: { ticks: { maxTicksLimit: 12, font: { size: 10 } } },
                    y: { beginAtZero: true }
                }
            }
        }, 'dashboard');

        chartsWrapper.appendChild(card);
    }

    // Add "Customize Charts" card at the end
    const addCard = document.createElement('div');
    addCard.className = 'chart-card add-chart-card';
    addCard.style.cssText = 'display:flex; align-items:center; justify-content:center; cursor:pointer; min-height:240px; border:2px dashed var(--color-border); box-shadow:none;';
    addCard.innerHTML = `<div style="text-align:center; color:var(--color-text-muted);"><div style="font-size:24px; margin-bottom:8px;">➕</div><div style="font-size:14px; font-weight:600;">Customize Charts</div></div>`;
    addCard.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('open-chart-config'));
    });
    chartsWrapper.appendChild(addCard);

    container.appendChild(chartsWrapper);
}

// ============ HELPERS ============

function createChartCard(title, subtitle, icon = '📊', colorClass = 'green') {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `
        <div class="chart-card-header">
            <div class="chart-card-icon ${colorClass}">${icon}</div>
            <div>
                <div class="chart-card-title">${title}</div>
                ${subtitle ? `<div class="chart-card-subtitle">${subtitle}</div>` : ''}
            </div>
        </div>
        <div style="position: relative; height: 240px;">
            <canvas></canvas>
        </div>
    `;
    return card;
}

function createChart(canvas, config, group) {
    const chart = new Chart(canvas, config);
    if (!activeCharts.has(group)) {
        activeCharts.set(group, []);
    }
    activeCharts.get(group).push(chart);
    return chart;
}

function destroyCharts(group) {
    if (activeCharts.has(group)) {
        for (const chart of activeCharts.get(group)) {
            chart.destroy();
        }
        activeCharts.set(group, []);
    }
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
