/**
 * App Entry Point — Hash Router & View Orchestration
 */
import { MONTHS, YEAR } from './config.js';
import { monthNameToIndex } from './utils/date-utils.js';
import { showToast } from './utils/ui-helpers.js';
import { renderNavBar } from './components/nav-bar.js';
import { renderSetupView } from './views/setup-view.js';
import { renderDashboardView } from './views/dashboard-view.js';
import { renderMonthlyView } from './views/monthly-view.js';
import { renderDailyEntryView } from './views/daily-entry-view.js';
import { renderSchemaView } from './views/schema-view.js';
import { initLocalStore, getAllEntries, getAllMonthlyGoals } from './db/local-store.js';
import { SyncEngine } from './db/sync-engine.js';
import { seedMockData } from './db/mock-data.js';
import { initTestMode, isTestMode } from './db/test-mode.js';

// Global app state
const state = {
    initialized: false,
    syncEngine: null,
    currentView: null
};

/**
 * Initialize the application
 */
async function init() {
    // Initialize IndexedDB
    await initLocalStore();

    // Check for test mode
    const testModeActive = await initTestMode();
    if (testModeActive) {
        document.body.classList.add('test-mode-active');
    }

    // Initialize sync engine first so we can use it during seeding
    state.syncEngine = new SyncEngine();

    if (!testModeActive) {
        // Seed mock data into IndexedDB if it is empty
        const wasSeeded = await seedMockData();

        // If we just seeded AND Firebase is configured, push the seed data up
        // so the remote DB is populated from the start.
        if (wasSeeded && state.syncEngine.isConfigured()) {
            showToast('⬆️ Uploading initial data to Firebase…', 'info');
            const [entries, goals] = await Promise.all([
                getAllEntries(YEAR),
                getAllMonthlyGoals(YEAR),
            ]);
            for (const entry of entries) {
                state.syncEngine.schedulePush('entries', entry._id, entry);
            }
            for (const goal of goals) {
                state.syncEngine.schedulePush('monthlyGoals', goal._id, goal);
            }
        }
    } else {
        showToast('🧪 Test Mode Active — Using Mock Data');
    }

    // Pull latest data from Firebase on startup so the local IndexedDB
    // is always up-to-date with what is actually in the remote database.
    if (state.syncEngine.isConfigured()) {
        state.syncEngine.pullAll().then(() => {
            // Re-render the current view after pull so fresh data is shown
            route();
        }).catch(err => console.warn('Initial pull failed:', err));
    }

    // Render navigation
    renderNavBar(document.getElementById('nav-bar'), state);

    // Route based on current hash
    route();

    // Listen for hash changes
    window.addEventListener('hashchange', route);

    state.initialized = true;
}

/**
 * Hash-based router
 */
function route() {
    const hash = window.location.hash || '';
    const app = document.getElementById('app');

    // Parse the route
    const parts = hash.replace('#/', '').split('/');
    const view = parts[0] || '';
    const param = parts[1] || '';

    // Check if Firebase is configured (skip for setup page)
    const firebaseConfig = localStorage.getItem('firebaseConfig');
    const isOfflineMode = localStorage.getItem('offlineMode') === 'true';

    if (!firebaseConfig && !isOfflineMode && view !== 'setup') {
        window.location.hash = '#/setup';
        return;
    }

    // Update nav active state
    renderNavBar(document.getElementById('nav-bar'), state);

    // Route to view
    switch (view) {
        case 'setup':
            state.currentView = 'setup';
            renderSetupView(app, state);
            break;

        case 'month': {
            state.currentView = 'month';
            const monthIdx = param ? monthNameToIndex(param) : new Date().getMonth();
            renderMonthlyView(app, state, monthIdx >= 0 ? monthIdx : new Date().getMonth());
            break;
        }

        case 'entry': {
            state.currentView = 'entry';
            const dateStr = param || null;
            renderDailyEntryView(app, state, dateStr);
            break;
        }

        case 'schema':
            state.currentView = 'schema';
            renderSchemaView(app, state);
            break;

        case 'dashboard':
        default:
            state.currentView = 'dashboard';
            if (view !== 'dashboard' && view !== '') {
                window.location.hash = '#/dashboard';
                return;
            }
            renderDashboardView(app, state);
            break;
    }
}

// Start the app
init().catch(err => {
    console.error('Failed to initialize app:', err);
    document.getElementById('app').innerHTML = `
        <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center;">
            <h2>Failed to Initialize</h2>
            <p style="color: var(--color-text-secondary); margin-top: 8px;">${err.message}</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="location.reload()">Retry</button>
        </div>
    `;
});
