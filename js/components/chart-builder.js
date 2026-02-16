/**
 * Chart Builder — Dynamic chart generation from schema using Chart.js
 *
 * Generates charts for:
 * 1. Daily Goals Completion % (always present)
 * 2. Grouped numeric fields (based on chartGroup in schema)
 */

import { YEAR, CHART_PALETTE, COLORS } from '../config.js';
import { getDaysInMonth, toDateId } from '../utils/date-utils.js';
import { getChartGroups, countDailyGoals } from '../schema/schema-manager.js';

// Track active chart instances for cleanup
const activeCharts = new Map();

/**
 * Build monthly charts (for a single month's view)
 */
export function buildMonthlyCharts(container, schema, entriesMap, month) {
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

        const card = createChartCard('Daily Goals Completion (%)');
        const chart = createChart(card.querySelector('canvas'), {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Completion %',
                    data: completionData,
                    borderColor: COLORS.chartGreen,
                    backgroundColor: hexToRgba(COLORS.chartGreen, 0.15),
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: 'Day' } },
                    y: { min: 0, max: 100, title: { display: true, text: '%' } }
                }
            }
        }, 'monthly');
        chartsWrapper.appendChild(card);
    }

    // ===== Dynamic charts from schema chartGroups =====
    const chartGroups = getChartGroups(schema);

    for (const [groupName, group] of chartGroups) {
        const datasets = group.fields.map((field, idx) => {
            const data = dayLabels.map(d => {
                const dateId = toDateId(YEAR, month, d);
                const entry = entriesMap[dateId];
                const val = entry?.fields?.[field.section]?.[field.name];
                return val !== null && val !== undefined ? parseFloat(val) : null;
            });

            return {
                label: field.name,
                data: data,
                borderColor: CHART_PALETTE[idx % CHART_PALETTE.length],
                backgroundColor: hexToRgba(CHART_PALETTE[idx % CHART_PALETTE.length], 0.15),
                fill: group.chartType === 'area',
                tension: 0.3,
                pointRadius: 2,
                pointHoverRadius: 5,
            };
        });

        // Determine chart type
        let chartType = 'line';
        if (group.chartType === 'bar' || group.chartType === 'column') chartType = 'bar';

        // Title: use group name or field names
        const title = groupName.startsWith('_ungrouped_')
            ? group.fields[0].name
            : capitalizeFirst(groupName);

        // Unit from first field
        const unit = group.fields[0].unit || '';

        const card = createChartCard(title + (unit ? ` (${unit})` : ''));
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
                    legend: { display: datasets.length > 1, position: 'top' }
                },
                scales: {
                    x: { title: { display: true, text: 'Day' } },
                    y: {
                        min: 0,
                        title: { display: true, text: unit }
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
    container.innerHTML = '';
    destroyCharts('yearly');

    // Build entries map
    const entriesMap = {};
    for (const e of allEntries) {
        entriesMap[e._id] = e;
    }

    // Generate all date labels
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
    chartsWrapper.style.gridTemplateColumns = '1fr'; // Full width for yearly charts

    // ===== Chart 1: Daily Goals Completion Trend =====
    const totalGoals = countDailyGoals(schema);
    if (totalGoals > 0) {
        const completionData = allDates.map(d => {
            const entry = entriesMap[d.dateId];
            return entry ? (entry.dailyGoalCompletion || 0) * 100 : 0;
        });

        const card = createChartCard('Daily Goals Completion Trend (Entire Year)');
        card.querySelector('canvas').style.maxHeight = '300px';
        createChart(card.querySelector('canvas'), {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [{
                    label: 'Completion %',
                    data: completionData,
                    borderColor: COLORS.chartGreen,
                    backgroundColor: hexToRgba(COLORS.chartGreen, 0.1),
                    fill: true,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    borderWidth: 1.5,
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
                            font: { size: 10 }
                        }
                    },
                    y: { min: 0, max: 100, title: { display: true, text: '%' } }
                }
            }
        }, 'yearly');
        chartsWrapper.appendChild(card);
    }

    // ===== Dynamic yearly charts =====
    const chartGroups = getChartGroups(schema);

    for (const [groupName, group] of chartGroups) {
        const datasets = group.fields.map((field, idx) => {
            const data = allDates.map(d => {
                const entry = entriesMap[d.dateId];
                const val = entry?.fields?.[field.section]?.[field.name];
                return val !== null && val !== undefined ? parseFloat(val) : null;
            });

            return {
                label: field.name,
                data: data,
                borderColor: CHART_PALETTE[idx % CHART_PALETTE.length],
                backgroundColor: hexToRgba(CHART_PALETTE[idx % CHART_PALETTE.length], 0.1),
                fill: group.chartType === 'area',
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 3,
                borderWidth: 1.5,
            };
        });

        let chartType = 'line';
        if (group.chartType === 'bar' || group.chartType === 'column') chartType = 'bar';

        const title = groupName.startsWith('_ungrouped_')
            ? group.fields[0].name + ' (Entire Year)'
            : capitalizeFirst(groupName) + ' (Entire Year)';

        const unit = group.fields[0].unit || '';

        const card = createChartCard(title + (unit ? ` - ${unit}` : ''));
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
                    legend: { display: datasets.length > 1, position: 'top' }
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 12,
                            font: { size: 10 }
                        }
                    },
                    y: {
                        min: 0,
                        title: { display: true, text: unit }
                    }
                }
            }
        }, 'yearly');
        chartsWrapper.appendChild(card);
    }

    container.appendChild(chartsWrapper);
}

// ============ HELPERS ============

function createChartCard(title) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #202124;">${title}</div>
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
