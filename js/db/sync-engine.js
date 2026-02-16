/**
 * Sync Engine — Bidirectional sync between IndexedDB and MongoDB
 *
 * Strategy:
 * - All writes go to IndexedDB first (instant)
 * - Debounced push to MongoDB after 2 seconds of inactivity
 * - Pull from MongoDB on page load or manual refresh
 * - Last-write-wins conflict resolution using updatedAt timestamps
 */

import { MongoDBClient } from './mongodb-client.js';
import {
    getEntry, putEntry, getAllEntries,
    getMonthlyGoal, putMonthlyGoal, getAllMonthlyGoals,
    getMeta, putMeta,
    addToSyncQueue, getSyncQueue, clearSyncQueue
} from './local-store.js';
import { YEAR } from '../config.js';

export class SyncEngine {
    constructor() {
        this.client = new MongoDBClient();
        this.pushTimer = null;
        this.pushing = false;
        this.pulling = false;
        this.status = 'idle'; // 'idle', 'syncing', 'error', 'offline'
        this.listeners = [];

        // Listen for online/offline
        window.addEventListener('online', () => {
            this.setStatus('idle');
            this.pushPending();
        });

        window.addEventListener('offline', () => {
            this.setStatus('offline');
        });

        if (!navigator.onLine) {
            this.status = 'offline';
        }
    }

    /**
     * Register a status change listener
     */
    onStatusChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Update sync status and notify listeners
     */
    setStatus(status) {
        this.status = status;
        this.listeners.forEach(cb => cb(status));
    }

    /**
     * Check if MongoDB is configured
     */
    isConfigured() {
        return this.client.isConfigured();
    }

    /**
     * Reload the MongoDB client config (after setup)
     */
    reloadConfig() {
        this.client = new MongoDBClient();
    }

    // ============ WRITE + SYNC ============

    /**
     * Save an entry locally and schedule a push to MongoDB
     */
    async saveEntry(doc) {
        await putEntry(doc);
        this.schedulePush('entries', doc._id, doc);
    }

    /**
     * Save monthly goals locally and schedule a push
     */
    async saveMonthlyGoal(doc) {
        await putMonthlyGoal(doc);
        this.schedulePush('monthlyGoals', doc._id, doc);
    }

    /**
     * Save meta/schema locally and schedule a push
     */
    async saveMeta(doc) {
        await putMeta(doc);
        this.schedulePush('meta', doc._id, doc);
    }

    /**
     * Schedule a debounced push to MongoDB
     */
    schedulePush(collection, docId, data) {
        if (!this.isConfigured()) return;

        // Add to sync queue for reliability
        addToSyncQueue({ collection, operation: 'upsert', docId, data }).catch(console.error);

        // Debounce: push after 2 seconds of inactivity
        if (this.pushTimer) clearTimeout(this.pushTimer);
        this.pushTimer = setTimeout(() => this.pushPending(), 2000);
    }

    /**
     * Push all pending mutations to MongoDB
     */
    async pushPending() {
        if (this.pushing || !this.isConfigured() || !navigator.onLine) return;

        this.pushing = true;
        this.setStatus('syncing');

        try {
            const queue = await getSyncQueue();
            if (queue.length === 0) {
                this.setStatus('idle');
                this.pushing = false;
                return;
            }

            // Deduplicate: keep only the latest mutation per docId+collection
            const latest = new Map();
            for (const item of queue) {
                const key = `${item.collection}:${item.docId}`;
                latest.set(key, item);
            }

            // Push each mutation
            for (const [, mutation] of latest) {
                try {
                    await this.client.replaceOne(
                        mutation.collection,
                        { _id: mutation.docId },
                        mutation.data,
                        true // upsert
                    );
                } catch (err) {
                    console.error(`Sync push failed for ${mutation.collection}/${mutation.docId}:`, err);
                    this.setStatus('error');
                    this.pushing = false;
                    return; // Stop pushing, will retry later
                }
            }

            // All pushed successfully — clear the queue
            await clearSyncQueue();
            this.setStatus('idle');

        } catch (err) {
            console.error('Sync push error:', err);
            this.setStatus('error');
        } finally {
            this.pushing = false;
        }
    }

    // ============ PULL ============

    /**
     * Pull all data from MongoDB and merge into IndexedDB
     */
    async pullAll() {
        if (this.pulling || !this.isConfigured() || !navigator.onLine) return;

        this.pulling = true;
        this.setStatus('syncing');

        try {
            // Pull meta
            const remoteMeta = await this.client.findOne('meta', { _id: 'app_config' });
            if (remoteMeta) {
                const localMeta = await getMeta();
                if (!localMeta || remoteMeta.updatedAt > (localMeta.updatedAt || '')) {
                    await putMeta(remoteMeta);
                }
            }

            // Pull entries for current year
            const remoteEntries = await this.client.find('entries', { year: YEAR });
            for (const remoteEntry of remoteEntries) {
                const localEntry = await getEntry(remoteEntry._id);
                if (!localEntry || remoteEntry.updatedAt > (localEntry.updatedAt || '')) {
                    await putEntry(remoteEntry);
                }
            }

            // Pull monthly goals
            const remoteGoals = await this.client.find('monthlyGoals', { year: YEAR });
            for (const remoteGoal of remoteGoals) {
                const localGoal = await getMonthlyGoal(remoteGoal._id);
                if (!localGoal || remoteGoal.updatedAt > (localGoal.updatedAt || '')) {
                    await putMonthlyGoal(remoteGoal);
                }
            }

            this.setStatus('idle');

        } catch (err) {
            console.error('Sync pull error:', err);
            this.setStatus('error');
        } finally {
            this.pulling = false;
        }
    }

    /**
     * Full sync: pull first, then push pending
     */
    async fullSync() {
        await this.pullAll();
        await this.pushPending();
    }
}
