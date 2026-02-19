/**
 * Heatmap Components — with color legend
 *
 * 1. Daily Consistency Heatmap (GitHub-style green, 53x7 grid)
 * 2. Monthly Goals Heatmap (red gradient, 12 boxes)
 */

import { YEAR, MONTHS, COLORS } from '../config.js';
import { getDaysInMonth, toDateId, getHeatmapPosition, formatDateLong } from '../utils/date-utils.js';

/**
 * Render the daily consistency heatmap (GitHub-style) with legend
 */
export function renderDailyHeatmap(container, allEntries) {
    container.innerHTML = '';

    // Build entries map
    const entriesMap = {};
    for (const e of allEntries) {
        entriesMap[e._id] = e;
    }

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'heatmap-wrapper';

    // Get current dimensions from CSS (handles mobile scaling)
    const computedStyle = window.getComputedStyle(container);
    const cellSize = parseInt(computedStyle.getPropertyValue('--heatmap-cell-size')) || 14;
    const gap = parseInt(computedStyle.getPropertyValue('--heatmap-gap')) || 3;

    // Day labels (Mon, Wed, Fri) - Fixed Sidebar
    const dayLabels = document.createElement('div');
    dayLabels.className = 'heatmap-day-labels';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
        const label = document.createElement('div');
        label.textContent = i % 2 === 1 ? dayNames[i] : '';
        label.style.height = `${cellSize}px`;
        label.style.lineHeight = `${cellSize}px`;
        dayLabels.appendChild(label);
    }
    wrapper.appendChild(dayLabels);

    // Build the Grid & Month Labels (Scrollable Content)
    const mainContent = document.createElement('div');
    mainContent.className = 'heatmap-main-content';

    const monthLabelsContainer = document.createElement('div');
    monthLabelsContainer.className = 'heatmap-month-labels';
    monthLabelsContainer.style.position = 'relative';

    let lastCol = -1;
    for (let m = 0; m < 12; m++) {
        const pos = getHeatmapPosition(YEAR, m + 1, 1);
        if (pos.col > lastCol) {
            const label = document.createElement('span');
            label.textContent = MONTHS[m];
            label.style.position = 'absolute';
            label.style.left = `${pos.col * (cellSize + gap)}px`;
            label.style.whiteSpace = 'nowrap';
            monthLabelsContainer.appendChild(label);
            lastCol = pos.col;
        }
    }

    const grid = document.createElement('div');
    grid.className = 'daily-heatmap';

    mainContent.appendChild(monthLabelsContainer);
    mainContent.appendChild(grid);

    // Initialize 53 weeks x 7 days grid
    const cells = Array.from({ length: 53 }, () => Array(7).fill(null));

    // Fill in actual days
    for (let m = 1; m <= 12; m++) {
        const dim = getDaysInMonth(YEAR, m);
        for (let d = 1; d <= dim; d++) {
            const pos = getHeatmapPosition(YEAR, m, d);
            if (pos.col < 53) {
                const dateId = toDateId(YEAR, m, d);
                const entry = entriesMap[dateId];
                // Fallback to top-level property for legacy data structure (check for truthy value if nested is missing)
                const completion = entry ? (entry.dailyGoalCompletion ?? 0) : 0;
                cells[pos.col][pos.row] = {
                    completion,
                    date: formatDateLong(YEAR, m, d),
                    dateId
                };
            }
        }
    }

    // Render cells
    for (let week = 0; week < 53; week++) {
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';

            const data = cells[week][day];
            if (data) {
                // Check if this is today
                const now = new Date();
                const todayId = toDateId(now.getFullYear(), now.getMonth() + 1, now.getDate());
                if (data.dateId === todayId) {
                    cell.classList.add('is-today');
                }

                const color = interpolateColor(
                    data.completion,
                    COLORS.greenHeatmap.min,
                    COLORS.greenHeatmap.mid,
                    COLORS.greenHeatmap.max
                );
                cell.style.backgroundColor = color;

                const pct = Math.round(data.completion * 100);
                cell.dataset.tooltip = `${data.date}: ${pct}%`;
            } else {
                cell.style.backgroundColor = '#ebedf0';
                cell.style.opacity = '0.3';
            }

            grid.appendChild(cell);
        }
    }

    wrapper.appendChild(mainContent);
    container.appendChild(wrapper);
}

/**
 * Render the monthly goals heatmap (red gradient, 12 boxes)
 */
export function renderMonthlyHeatmap(container, monthlyGoalDocs) {
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'monthly-heatmap';

    // Build map
    const goalsMap = {};
    for (const doc of monthlyGoalDocs) {
        goalsMap[doc._id] = doc;
    }

    for (let m = 1; m <= 12; m++) {
        const monthId = `${YEAR}-${String(m).padStart(2, '0')}`;
        const doc = goalsMap[monthId];
        const completion = doc ? (doc.completionRate || 0) : 0;
        const pct = Math.round(completion * 100);

        const cell = document.createElement('div');
        cell.className = 'monthly-heatmap-cell';

        const label = document.createElement('div');
        label.className = 'month-label';
        label.textContent = MONTHS[m - 1];
        cell.appendChild(label);

        // Circular progress SVG
        const radius = 42;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (completion * circumference);

        const progressContainer = document.createElement('div');
        progressContainer.className = 'circular-progress';
        progressContainer.innerHTML = `
            <svg viewBox="0 0 100 100">
                <circle class="circular-progress-bg" cx="50" cy="50" r="${radius}"></circle>
                <circle class="circular-progress-bar" cx="50" cy="50" r="${radius}" 
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}; stroke: ${interpolateColor(completion, COLORS.redHeatmap.min, COLORS.redHeatmap.mid, COLORS.redHeatmap.max)}">
                </circle>
            </svg>
            <div class="circular-progress-text">${pct}%</div>
        `;
        cell.appendChild(progressContainer);

        grid.appendChild(cell);
    }

    container.appendChild(grid);
}

// ============ COLOR INTERPOLATION ============

function interpolateColor(value, minColor, midColor, maxColor) {
    value = Math.max(0, Math.min(1, value));
    if (value <= 0.5) {
        return lerpColor(minColor, midColor, value * 2);
    } else {
        return lerpColor(midColor, maxColor, (value - 0.5) * 2);
    }
}

function lerpColor(color1, color2, t) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
