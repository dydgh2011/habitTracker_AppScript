/**
 * Navigation Bar Component — with SVG icons and animated active indicator
 */

import { MONTHS, YEAR } from '../config.js';
import { isTestMode, enableTestMode, disableTestMode } from '../db/test-mode.js';
import { clearAllData } from '../db/local-store.js';

const NAV_ICONS = {
    dashboard: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="7" rx="1.5"/><rect x="11" y="3" width="6" height="4" rx="1.5"/><rect x="3" y="12" width="6" height="5" rx="1.5"/><rect x="11" y="9" width="6" height="8" rx="1.5"/></svg>`,
    monthly: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="4" x2="7" y2="2"/><line x1="13" y1="4" x2="13" y2="2"/></svg>`,
    entry: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><polyline points="9 11 12 14 17 5"/></svg>`,
    schema: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3"/><path d="M10 3v2m0 10v2m-5-7H3m14 0h-2m-1.5-4.5 1.4-1.4m-9.8 9.8 1.4-1.4m0-7-1.4-1.4m9.8 9.8-1.4-1.4"/></svg>`,
};

export function renderNavBar(container, state) {
    const hash = window.location.hash || '#/dashboard';
    const currentView = hash.replace('#/', '').split('/')[0];
    const currentMonth = hash.replace('#/', '').split('/')[1] || '';
    const testMode = isTestMode();

    // Clean up any orphaned #nav-links that was previously moved to document.body
    // This happens on mobile where we detach it from the nav container for z-index reasons.
    // Without this, the old element (with .open class) lingers visible after navigation.
    const orphan = document.body.querySelector(':scope > #nav-links');
    if (orphan) orphan.remove();

    container.innerHTML = `
        <span class="nav-brand">Habit Tracker ${YEAR}</span>
        <div class="nav-links" id="nav-links">
            <a href="#/dashboard" class="nav-link ${currentView === 'dashboard' ? 'active' : ''}">
                ${NAV_ICONS.dashboard}Dashboard
            </a>
            <div class="nav-dropdown" id="nav-monthly-dropdown">
                <a href="#" class="nav-link ${currentView === 'month' ? 'active' : ''}">
                    ${NAV_ICONS.monthly}Monthly ▾
                </a>
                <div class="nav-dropdown-menu">
                    ${MONTHS.map(m =>
        `<a href="#/month/${m.toLowerCase()}" class="nav-dropdown-item ${currentMonth === m.toLowerCase() ? 'active' : ''}">${m}</a>`
    ).join('')}
                </div>
            </div>
            <a href="#/entry" class="nav-link ${currentView === 'entry' ? 'active' : ''}">
                ${NAV_ICONS.entry}Daily Entry
            </a>
            <a href="#/schema" class="nav-link ${currentView === 'schema' ? 'active' : ''}">
                ${NAV_ICONS.schema}Schema
            </a>
        </div>
        <div class="nav-controls">
            <button class="nav-test-toggle ${testMode ? 'active' : ''}" id="nav-test-toggle" title="${testMode ? 'Disable Test Mode' : 'Enable Test Mode'}">
                🧪
            </button>
            <button class="nav-delete-all" id="nav-delete-all" title="Delete all local data">
                🗑️
            </button>
            <div class="nav-sync-status" style="cursor:pointer" title="Click to configure connection">
                <span class="sync-indicator ${getSyncClass(state)}"></span>
                <span>${getSyncLabel(state)}</span>
            </div>
        </div>
        <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu">☰</button>
    `;

    const navLinks = document.getElementById('nav-links');

    // For mobile, we move the nav-links to the body root to avoid any parent constraints (like backdrop-filter)
    if (window.innerWidth <= 768 && navLinks.parentElement === container) {
        document.body.appendChild(navLinks);
    }

    // Test Mode toggle event
    const testToggle = document.getElementById('nav-test-toggle');
    if (testToggle) {
        testToggle.addEventListener('click', () => {
            if (isTestMode()) disableTestMode();
            else enableTestMode();
        });
    }

    // Delete All Data button
    const deleteAllBtn = document.getElementById('nav-delete-all');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async () => {
            if (!confirm('⚠️ Delete ALL local data?\n\nThis will wipe all entries, monthly goals, and settings from this device. This cannot be undone.')) return;
            try {
                await clearAllData();
                // Tell app.js not to re-seed after this intentional wipe
                localStorage.setItem('skipSeed', 'true');
                location.reload();
            } catch (err) {
                console.error('Failed to clear data:', err);
                alert('Failed to delete data: ' + err.message);
            }
        });
    }

    // Prevent the dropdown trigger from navigating and handle accordion toggle
    const dropdownLink = container.querySelector('.nav-dropdown > .nav-link');
    if (dropdownLink) {
        dropdownLink.addEventListener('click', (e) => {
            // Only prevent default and toggle if we are in mobile view (width <= 768px)
            // or if we explicitly want it to act as an accordion
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const dropdown = document.getElementById('nav-monthly-dropdown');
                if (dropdown) {
                    dropdown.classList.toggle('open');
                }
            }
        });
    }

    // Hamburger menu toggle
    const hamburger = document.getElementById('nav-hamburger');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            hamburger.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
        });

        navLinks.querySelectorAll('a:not(.nav-dropdown > .nav-link)').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                hamburger.textContent = '☰';
            });
        });
    }

    // Sync/Connection Status click — use event delegation on the container so the
    // listener survives re-renders of the inner HTML.
    container.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-sync-status')) return;
        const isOffline = localStorage.getItem('offlineMode') === 'true';
        const msg = isOffline ? 'Switch back to Online Mode?' : 'Configure connection settings?';
        if (confirm(msg)) {
            if (isOffline) localStorage.removeItem('offlineMode');
            window.location.hash = '#/setup';
        }
    });
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
