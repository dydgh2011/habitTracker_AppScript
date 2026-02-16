/**
 * Chart Builder — Dynamic chart generation with polished styling
 */

import { YEAR, CHART_PALETTE, COLORS } from '../config.js';
import { getDaysInMonth, toDateId } from '../utils/date-utils.js';
import { getChartGroups, countDailyGoals } from '../schema/schema-manager.js';

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
export function buildYearlyCharts(container, schema, allEntries) {
    applyChartDefaults();
    container.innerHTML = '';
    destroyCharts('yearly');

    const entriesMap = {};
    for (const e of allEntries) {
        entriesMap[e._id] = e;
    }

    const allDates = [];
    for (let m = 1; m <= 12; m++) {
        const dim = getDaysInMonth(YEAR, m);
        for (let d = 1; d <= dim; d++) {
            allDates.push({ month: m, day: d, dateId: toDateId(YEAR, m, d) });
        }
    }

    const dateLabels = allDates.map(d => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.month - 1]} ${d.day}`;
    });

    const chartsWrapper = document.createElement('div');
    chartsWrapper.className = 'charts-container';

    // ===== Chart 1: Daily Goals Completion Trend =====
    const totalGoals = countDailyGoals(schema);
    if (totalGoals > 0) {
        const completionData = allDates.map(d => {
            const entry = entriesMap[d.dateId];
            return entry ? (entry.dailyGoalCompletion || 0) * 100 : 0;
        });

        const card = createChartCard('Daily Goals Completion Trend', 'Entire Year', '📈', 'green');
        card.querySelector('canvas').style.maxHeight = '300px';
        createChart(card.querySelector('canvas'), {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [{
                    label: 'Completion %',
                    data: completionData,
                    borderColor: COLORS.chartGreen,
                    backgroundColor: hexToRgba(COLORS.chartGreen, 0.08),
                    fill: true,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 12,
                            font: { size: 10, weight: 600 }
                        }
                    },
                    y: { min: 0, max: 100, title: { display: true, text: '%', font: { weight: 600 } } }
                }
            }
        }, 'yearly');
        chartsWrapper.appendChild(card);
    }

    // ===== Dynamic yearly charts =====
    const chartGroups = getChartGroups(schema);

    for (const [groupName, group] of chartGroups) {
        const datasets = group.fields.map((field, idx) => {
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const data = allDates.map(d => {
                const entry = entriesMap[d.dateId];
                const val = entry?.fields?.[field.section]?.[field.name];
                return val !== null && val !== undefined ? parseFloat(val) : null;
            });

            return {
                label: field.name,
                data: data,
                borderColor: color,
                backgroundColor: hexToRgba(color, group.chartType === 'area' ? 0.08 : 0.7),
                fill: group.chartType === 'area',
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            };
        });

        let chartType = 'line';
        if (group.chartType === 'bar' || group.chartType === 'column') chartType = 'bar';

        const title = groupName.startsWith('_ungrouped_')
            ? group.fields[0].name + ' (Entire Year)'
            : capitalizeFirst(groupName) + ' (Entire Year)';

        const unit = group.fields[0].unit || '';
        const icon = getGroupIcon(groupName);
        const colorClass = ['green', 'blue', 'amber', 'red'][Math.abs(hashCode(groupName)) % 4];

        const card = createChartCard(title, unit, icon, colorClass);
        card.querySelector('canvas').style.maxHeight = '300px';
        createChart(card.querySelector('canvas'), {
            type: chartType,
            data: {
                labels: dateLabels,
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
                    x: {
                        ticks: {
                            maxTicksLimit: 12,
                            font: { size: 10, weight: 600 }
                        }
                    },
                    y: {
                        min: 0,
                        title: { display: true, text: unit, font: { weight: 600 } }
                    }
                }
            }
        }, 'yearly');
        chartsWrapper.appendChild(card);
    }

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
