/**
 * Setup View — MongoDB Atlas connection form
 */

import { showToast, navigateTo } from '../utils/ui-helpers.js';

export async function renderSetupView(container, state) {
    container.innerHTML = `
        <div class="setup-container">
            <div class="card setup-card">
                <div class="setup-title">Connect to MongoDB</div>
                <p class="setup-subtitle">
                    Link your MongoDB Atlas Data API to sync your habit data across devices.
                </p>

                <div id="setup-status"></div>

                <div class="form-group">
                    <label class="form-label" for="setup-appId">App ID</label>
                    <input class="form-input" type="text" id="setup-appId" placeholder="e.g. data-abcdefg" />
                </div>

                <div class="form-group">
                    <label class="form-label" for="setup-apiKey">API Key</label>
                    <input class="form-input" type="password" id="setup-apiKey" placeholder="Your Atlas API Key" />
                </div>

                <div class="form-group">
                    <label class="form-label" for="setup-cluster">Cluster Name</label>
                    <input class="form-input" type="text" id="setup-cluster" placeholder="e.g. Cluster0" />
                </div>

                <div class="form-group">
                    <label class="form-label" for="setup-db">Database Name</label>
                    <input class="form-input" type="text" id="setup-db" placeholder="e.g. habitTracker" />
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

    // Load existing config
    const existing = JSON.parse(localStorage.getItem('mongoConfig') || 'null');
    if (existing) {
        document.getElementById('setup-appId').value = existing.appId || '';
        document.getElementById('setup-apiKey').value = existing.apiKey || '';
        document.getElementById('setup-cluster').value = existing.cluster || '';
        document.getElementById('setup-db').value = existing.db || '';
    }

    // Test connection
    document.getElementById('setup-test').addEventListener('click', async () => {
        const config = getFormValues();
        if (!config.appId || !config.apiKey) {
            statusEl.innerHTML = '<div class="setup-status error">Please fill in App ID and API Key</div>';
            return;
        }
        statusEl.innerHTML = '<div class="setup-status" style="background:var(--color-info-bg);color:var(--color-info)">Testing connection...</div>';

        try {
            const res = await fetch(`https://data.mongodb-api.com/app/${config.appId}/endpoint/data/v1/action/findOne`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': config.apiKey,
                },
                body: JSON.stringify({
                    dataSource: config.cluster,
                    database: config.db,
                    collection: 'schema',
                    filter: {},
                }),
            });

            if (res.ok) {
                statusEl.innerHTML = '<div class="setup-status success">✓ Connected successfully!</div>';
            } else {
                const err = await res.text();
                statusEl.innerHTML = `<div class="setup-status error">Connection failed: ${err}</div>`;
            }
        } catch (e) {
            statusEl.innerHTML = `<div class="setup-status error">Network error: ${e.message}</div>`;
        }
    });

    // Save config
    document.getElementById('setup-save').addEventListener('click', async () => {
        const config = getFormValues();
        if (!config.appId || !config.apiKey || !config.cluster || !config.db) {
            statusEl.innerHTML = '<div class="setup-status error">Please fill in all fields</div>';
            return;
        }
        localStorage.setItem('mongoConfig', JSON.stringify(config));
        localStorage.removeItem('offlineMode');
        showToast('Configuration saved!', 'success');
        navigateTo('#/dashboard');
    });

    // Offline mode
    document.getElementById('setup-offline').addEventListener('click', () => {
        localStorage.setItem('offlineMode', 'true');
        showToast('Running in offline mode', 'info');
        navigateTo('#/dashboard');
    });
}

function getFormValues() {
    return {
        appId: document.getElementById('setup-appId').value.trim(),
        apiKey: document.getElementById('setup-apiKey').value.trim(),
        cluster: document.getElementById('setup-cluster').value.trim(),
        db: document.getElementById('setup-db').value.trim(),
    };
}
