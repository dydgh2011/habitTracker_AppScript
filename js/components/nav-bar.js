/**
 * Navigation Bar Component
 */

import { MONTHS, YEAR } from '../config.js';

export function renderNavBar(container, state) {
    const hash = window.location.hash || '#/dashboard';
    const currentView = hash.replace('#/', '').split('/')[0];
    const currentMonth = hash.replace('#/', '').split('/')[1] || '';

    container.innerHTML = `
        <span class="nav-brand">Habit Tracker ${YEAR}</span>
        <div class="nav-links">
            <a href="#/dashboard" class="nav-link ${currentView === 'dashboard' ? 'active' : ''}">Dashboard</a>
            <div class="nav-dropdown">
                <a href="#" class="nav-link ${currentView === 'month' ? 'active' : ''}">Monthly \u25BE</a>
                <div class="nav-dropdown-menu">
                    ${MONTHS.map(m =>
                        `<a href="#/month/${m.toLowerCase()}" class="nav-dropdown-item ${currentMonth === m.toLowerCase() ? 'active' : ''}">${m}</a>`
                    ).join('')}
                </div>
            </div>
            <a href="#/entry" class="nav-link ${currentView === 'entry' ? 'active' : ''}">Daily Entry</a>
            <a href="#/schema" class="nav-link ${currentView === 'schema' ? 'active' : ''}">Schema</a>
        </div>
        <div class="nav-sync-status">
            <span class="sync-indicator ${getSyncClass(state)}"></span>
            <span>${getSyncLabel(state)}</span>
        </div>
    `;

    // Prevent the dropdown trigger from navigating
    const dropdownLink = container.querySelector('.nav-dropdown > .nav-link');
    if (dropdownLink) {
        dropdownLink.addEventListener('click', (e) => e.preventDefault());
    }
}

function getSyncClass(state) {
    if (!state.syncEngine) return '';
    switch (state.syncEngine.status) {
        case 'syncing': return 'syncing';
        case 'error': return 'error';
        case 'offline': return 'offline';
        default: return '';
    }
}

function getSyncLabel(state) {
    if (!state.syncEngine) return '';
    const isOffline = localStorage.getItem('offlineMode') === 'true';
    if (isOffline && !state.syncEngine.isConfigured()) return 'Offline Mode';
    switch (state.syncEngine.status) {
        case 'syncing': return 'Syncing...';
        case 'error': return 'Sync Error';
        case 'offline': return 'Offline';
        default: return state.syncEngine.isConfigured() ? 'Synced' : 'Local Only';
    }
}
