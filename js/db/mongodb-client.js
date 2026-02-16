/**
 * MongoDB Atlas Data API Client
 *
 * REST wrapper for the MongoDB Data API.
 * Credentials stored in localStorage under 'mongoConfig'.
 *
 * Config shape: { appId, apiKey, clusterName, databaseName }
 */

import { MONGO_CONFIG_KEY } from '../config.js';

export class MongoDBClient {
    constructor() {
        this.config = null;
        this.loadConfig();
    }

    /**
     * Load MongoDB config from localStorage
     */
    loadConfig() {
        const raw = localStorage.getItem(MONGO_CONFIG_KEY);
        if (raw) {
            try {
                this.config = JSON.parse(raw);
            } catch {
                this.config = null;
            }
        }
    }

    /**
     * Check if the client is configured
     */
    isConfigured() {
        return !!(this.config && this.config.appId && this.config.apiKey);
    }

    /**
     * Get the base URL for the Data API
     */
    getBaseUrl() {
        if (!this.config) throw new Error('MongoDB not configured');
        return `https://data.mongodb-api.com/app/${this.config.appId}/endpoint/data/v1`;
    }

    /**
     * Make a request to the Data API
     */
    async _request(action, body) {
        if (!this.isConfigured()) {
            throw new Error('MongoDB not configured. Please set up your connection.');
        }

        const url = `${this.getBaseUrl()}/action/${action}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.config.apiKey,
            },
            body: JSON.stringify({
                dataSource: this.config.clusterName,
                database: this.config.databaseName,
                ...body,
            }),
        });

        if (!response.ok) {
            let errorMsg;
            try {
                const err = await response.json();
                errorMsg = err.error || err.message || `HTTP ${response.status}`;
            } catch {
                errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }

        return response.json();
    }

    // ============ CRUD Operations ============

    /**
     * Find a single document
     */
    async findOne(collection, filter = {}) {
        const result = await this._request('findOne', { collection, filter });
        return result.document;
    }

    /**
     * Find multiple documents
     */
    async find(collection, filter = {}, sort = {}, limit = 1000) {
        const result = await this._request('find', { collection, filter, sort, limit });
        return result.documents || [];
    }

    /**
     * Insert a single document
     */
    async insertOne(collection, document) {
        const result = await this._request('insertOne', { collection, document });
        return result.insertedId;
    }

    /**
     * Update a single document (upsert by default)
     */
    async updateOne(collection, filter, update, upsert = true) {
        const result = await this._request('updateOne', {
            collection,
            filter,
            update,
            upsert,
        });
        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedId: result.upsertedId,
        };
    }

    /**
     * Replace a single document (upsert by default)
     */
    async replaceOne(collection, filter, replacement, upsert = true) {
        const result = await this._request('replaceOne', {
            collection,
            filter,
            replacement,
            upsert,
        });
        return result;
    }

    /**
     * Delete a single document
     */
    async deleteOne(collection, filter) {
        const result = await this._request('deleteOne', { collection, filter });
        return result.deletedCount;
    }

    /**
     * Test the connection by trying to find the meta document
     */
    async testConnection() {
        try {
            await this.findOne('meta', { _id: 'app_config' });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Save config to localStorage
     */
    static saveConfig(config) {
        localStorage.setItem(MONGO_CONFIG_KEY, JSON.stringify(config));
    }

    /**
     * Clear config from localStorage
     */
    static clearConfig() {
        localStorage.removeItem(MONGO_CONFIG_KEY);
    }
}
