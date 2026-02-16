/**
 * Setup View — MongoDB credentials form (first-time setup)
 */

import { MongoDBClient } from '../db/mongodb-client.js';
import { navigateTo, showToast } from '../utils/ui-helpers.js';
import { MONGO_CONFIG_KEY } from '../config.js';

export function renderSetupView(container, state) {
    container.innerHTML = `
        <div class="setup-container">
            <div class="card setup-card">
                <div class="setup-title">Habit Tracker 2026</div>
                <div class="setup-subtitle">Connect to MongoDB Atlas to sync your data across devices</div>

                <div id="setup-status" class="setup-status" style="display: none;"></div>

                <div class="form-group">
                    <label class="form-label">Data API App ID</label>
                    <input type="text" id="setup-app-id" class="form-input" placeholder="e.g., data-abcdef">
                    <div class="form-hint">Found in Atlas > App Services > Your App</div>
                </div>

                <div class="form-group">
                    <label class="form-label">API Key</label>
                    <input type="password" id="setup-api-key" class="form-input" placeholder="Your API key">
                    <div class="form-hint">Create one in Atlas > App Services > Authentication > API Keys</div>
                </div>

                <div class="form-group">
                    <label class="form-label">Cluster Name</label>
                    <input type="text" id="setup-cluster" class="form-input" placeholder="e.g., Cluster0" value="Cluster0">
                </div>

                <div class="form-group">
                    <label class="form-label">Database Name</label>
                    <input type="text" id="setup-db-name" class="form-input" placeholder="e.g., habitTracker" value="habitTracker">
                </div>

                <div class="setup-actions">
                    <button id="setup-test-btn" class="btn btn-secondary">Test Connection</button>
                    <button id="setup-save-btn" class="btn btn-primary" disabled>Save & Continue</button>
                </div>

                <div class="setup-divider">or</div>

                <button id="setup-offline-btn" class="btn btn-secondary" style="width: 100%;">
                    Use Offline Only (No MongoDB)
                </button>
            </div>
        </div>
    `;

    // Load existing config if any
    const existingConfig = localStorage.getItem(MONGO_CONFIG_KEY);
    if (existingConfig) {
        try {
            const config = JSON.parse(existingConfig);
            document.getElementById('setup-app-id').value = config.appId || '';
            document.getElementById('setup-api-key').value = config.apiKey || '';
            document.getElementById('setup-cluster').value = config.clusterName || 'Cluster0';
            document.getElementById('setup-db-name').value = config.databaseName || 'habitTracker';
        } catch {}
    }

    // Test Connection
    document.getElementById('setup-test-btn').addEventListener('click', async () => {
        const config = getFormValues();
        if (!config.appId || !config.apiKey) {
            showStatus('Please fill in App ID and API Key', 'error');
            return;
        }

        const btn = document.getElementById('setup-test-btn');
        btn.disabled = true;
        btn.textContent = 'Testing...';

        // Temporarily save config for the client to use
        MongoDBClient.saveConfig(config);
        const client = new MongoDBClient();
        const result = await client.testConnection();

        btn.disabled = false;
        btn.textContent = 'Test Connection';

        if (result.success) {
            showStatus('Connected successfully!', 'success');
            document.getElementById('setup-save-btn').disabled = false;
        } else {
            showStatus(`Connection failed: ${result.error}`, 'error');
            document.getElementById('setup-save-btn').disabled = true;
            // Clear the temporary config on failure
            MongoDBClient.clearConfig();
        }
    });

    // Save & Continue
    document.getElementById('setup-save-btn').addEventListener('click', () => {
        const config = getFormValues();
        MongoDBClient.saveConfig(config);

        // Reload sync engine config
        if (state.syncEngine) {
            state.syncEngine.reloadConfig();
        }

        showToast('MongoDB connected!', 'success');
        navigateTo('#/dashboard');
    });

    // Offline mode
    document.getElementById('setup-offline-btn').addEventListener('click', () => {
        localStorage.setItem('offlineMode', 'true');
        showToast('Running in offline mode', 'info');
        navigateTo('#/dashboard');
    });
}

function getFormValues() {
    return {
        appId: document.getElementById('setup-app-id').value.trim(),
        apiKey: document.getElementById('setup-api-key').value.trim(),
        clusterName: document.getElementById('setup-cluster').value.trim() || 'Cluster0',
        databaseName: document.getElementById('setup-db-name').value.trim() || 'habitTracker',
    };
}

function showStatus(message, type) {
    const el = document.getElementById('setup-status');
    el.textContent = message;
    el.className = `setup-status ${type}`;
    el.style.display = 'block';
}
