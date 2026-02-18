/**
 * Setup View — Firebase Firestore connection form
 */

import { showToast, navigateTo } from '../utils/ui-helpers.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function renderSetupView(container, state) {
    container.innerHTML = `
        <div class="setup-container">
            <div class="card setup-card">
                <div class="setup-title">Connect to Firebase</div>
                <p class="setup-subtitle">
                    Paste your firebaseConfig object below to sync your habit data across devices.
                </p>

                <div id="setup-status"></div>

                <div class="form-group">
                    <label class="form-label" for="setup-config">Firebase Config (JSON or JS Object)</label>
                    <textarea class="form-input" id="setup-config" style="height: 200px; font-family: monospace; font-size: 12px;" placeholder="// Paste your config here...\nconst firebaseConfig = {\n  apiKey: '...',\n  authDomain: '...',\n  projectId: '...',\n  storageBucket: '...',\n  messagingSenderId: '...',\n  appId: '...'\n};"></textarea>
                </div>

                <div class="setup-actions">
                    <button class="btn btn-secondary" id="setup-test">Test Connection</button>
                    <button class="btn btn-primary" id="setup-save">Save & Continue</button>
                </div>

                <div class="setup-divider">or</div>

                <button class="btn btn-secondary" style="width:100%" id="setup-offline">
                    Use Offline Only
                </button>
            </div>
        </div>
    `;

    const statusEl = document.getElementById('setup-status');
    const textarea = document.getElementById('setup-config');

    // Load existing config
    const existing = localStorage.getItem('firebaseConfig');
    if (existing) {
        // Pretty print JSON
        try {
            textarea.value = JSON.stringify(JSON.parse(existing), null, 2);
        } catch {
            textarea.value = existing;
        }
    }

    // Test connection
    document.getElementById('setup-test').addEventListener('click', async () => {
        const configStr = textarea.value.trim();
        const config = parseConfig(configStr);

        if (!config) {
            statusEl.innerHTML = '<div class="setup-status error">Invalid configuration format</div>';
            return;
        }

        statusEl.innerHTML = '<div class="setup-status" style="background:var(--color-info-bg);color:var(--color-info)">Testing connection...</div>';

        // Check for navigator online status first
        if (!navigator.onLine) {
            statusEl.innerHTML = '<div class="setup-status error">Connection failed: Browser is offline.</div>';
            return;
        }

        try {
            // Initialize a temporary app to test connection
            // Note: We use a unique name for the test app to avoid conflicts if one is already running
            const testApp = initializeApp(config, "TEST_CONNECTION_APP_" + Date.now());

            let db;
            if (config.databaseId) {
                db = getFirestore(testApp, config.databaseId);
                console.log("Testing connection to named database:", config.databaseId);
            } else {
                db = getFirestore(testApp);
            }

            // Note: We intentionally do NOT enable persistence for the test connection.
            // We want to force a network call toverify connectivity.

            // Try to read a dummy document. Even if it doesn't exist, as long as we can reach Firestore, it's a success.
            // If permissions block it, it will throw 'permission-denied'
            try {
                await getDoc(doc(db, 'meta', 'test_connection'));
                statusEl.innerHTML = '<div class="setup-status success">✓ Connected successfully!</div>';
            } catch (err) {
                if (err.code === 'permission-denied') {
                    statusEl.innerHTML = '<div class="setup-status success">✓ Connected (Permission Denied implies reachability)</div>';
                } else {
                    throw err;
                }
            }

        } catch (e) {
            console.error("Connection test error:", e);
            let msg = e.message;
            if (e.code === 'unavailable' || msg.includes('offline')) {
                msg = "Client is offline or cannot reach Firestore.<br><strong>Did you CREATE the database in the Firebase Console?</strong><br>(Build > Firestore Database > Create Database)";
            } else if (e.code === 'permission-denied') {
                // specific handling for permission denied is already inside the inner try/catch, 
                // but legitimate fetch errors might end up here if the inner try/catch rethrows
                msg = "Permission Denied. (Your Security Rules might be blocking access, but we reached the server!)";
            }
            statusEl.innerHTML = `<div class="setup-status error">Connection failed: ${msg}</div>`;
        }
    });

    // Save config
    document.getElementById('setup-save').addEventListener('click', async () => {
        const configStr = textarea.value.trim();
        const config = parseConfig(configStr);

        if (!config) {
            statusEl.innerHTML = '<div class="setup-status error">Invalid configuration format</div>';
            return;
        }

        // Minify and save
        localStorage.setItem('firebaseConfig', JSON.stringify(config));
        localStorage.removeItem('offlineMode');
        showToast('Configuration saved!', 'success');

        // Reload to initialize everything properly
        // We use window.location.reload() because the app initialization logic runs on load
        // But first lets redirect hash so it reloads on dashboard
        window.location.hash = '#/dashboard';
        window.location.reload();
    });

    // Offline mode
    document.getElementById('setup-offline').addEventListener('click', () => {
        localStorage.setItem('offlineMode', 'true');
        showToast('Running in offline mode', 'info');
        navigateTo('#/dashboard');
    });
}

/**
 * Helper to parse loose JSON or JS object syntax
 */
function parseConfig(str) {
    if (!str) return null;

    try {
        // Try pure JSON first
        return JSON.parse(str);
    } catch {
        // Try to handle JS object syntax
        try {
            const start = str.indexOf('{');
            const end = str.lastIndexOf('}');
            if (start === -1 || end === -1) return null;

            const objStr = str.substring(start, end + 1);

            // Use Function constructor to parse JS object literal safely
            // This handles trailing commas, comments, and unquoted keys correctly
            // unlike the previous regex approach
            return new Function('return ' + objStr)();
        } catch (e) {
            console.error("Config parsing error:", e);
            return null;
        }
    }
}
