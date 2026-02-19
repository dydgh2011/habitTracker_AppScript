/**
 * IndexedDB Local Store — Offline-first data persistence
 *
 * Object Stores:
 *   meta          - App config & schema (keyPath: _id)
 *   entries       - Daily entries (keyPath: _id, index: year+month)
 *   monthlyGoals  - Monthly goal docs (keyPath: _id)
 *   syncQueue     - Pending mutations for MongoDB sync (autoIncrement)
 */

import { DB_NAME } from '../config.js';
import { isTestMode } from './test-mode.js';

const DB_VERSION = 1;
let db = null;

/**
 * Open/create the IndexedDB database
 */
export function initLocalStore() {
    return new Promise((resolve, reject) => {
        if (db) { resolve(db); return; }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Meta store (schema, app config)
            if (!database.objectStoreNames.contains('meta')) {
                database.createObjectStore('meta', { keyPath: '_id' });
            }

            // Entries store (daily data)
            if (!database.objectStoreNames.contains('entries')) {
                const entriesStore = database.createObjectStore('entries', { keyPath: '_id' });
                entriesStore.createIndex('yearMonth', ['year', 'month'], { unique: false });
            }

            // Monthly goals store
            if (!database.objectStoreNames.contains('monthlyGoals')) {
                database.createObjectStore('monthlyGoals', { keyPath: '_id' });
            }

            // Sync queue (pending writes to MongoDB)
            if (!database.objectStoreNames.contains('syncQueue')) {
                database.createObjectStore('syncQueue', { autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(new Error('Failed to open IndexedDB: ' + event.target.error));
        };
    });
}

/**
 * Get the database instance
 */
function getDb() {
    if (!db) throw new Error('Database not initialized. Call initLocalStore() first.');
    return db;
}

// ============ GENERIC CRUD ============

function getOne(storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = getDb().transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

function getAll(storeName) {
    return new Promise((resolve, reject) => {
        const tx = getDb().transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function putOne(storeName, doc) {
    return new Promise((resolve, reject) => {
        const tx = getDb().transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(doc);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteOne(storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = getDb().transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getAllByIndex(storeName, indexName, keyRange) {
    return new Promise((resolve, reject) => {
        const tx = getDb().transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(keyRange);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

// ============ META OPERATIONS ============

export function getMeta() {
    return getOne('meta', 'app_config');
}

export function putMeta(doc) {
    if (isTestMode()) return Promise.resolve();
    doc._id = 'app_config';
    doc.updatedAt = new Date().toISOString();
    return putOne('meta', doc);
}

// ============ ENTRY OPERATIONS ============

/**
 * Get a single day's entry by date ID (e.g., "2026-02-16")
 */
export function getEntry(dateId) {
    return getOne('entries', dateId);
}

/**
 * Get all entries for a given month (1-indexed)
 */
export function getMonthEntries(year, month) {
    const key = IDBKeyRange.only([year, month]);
    return getAllByIndex('entries', 'yearMonth', key);
}

/**
 * Get all entries for the year
 */
export function getAllEntries(year) {
    return getAll('entries').then(entries =>
        entries.filter(e => e.year === year)
    );
}

/**
 * Save/update a daily entry
 */
export function putEntry(doc) {
    if (isTestMode()) return Promise.resolve();
    doc.updatedAt = new Date().toISOString();
    return putOne('entries', doc);
}

/**
 * Delete a daily entry
 */
export function deleteEntry(dateId) {
    if (isTestMode()) return Promise.resolve();
    return deleteOne('entries', dateId);
}

// ============ MONTHLY GOALS OPERATIONS ============

/**
 * Get monthly goals doc by month ID (e.g., "2026-02")
 */
export function getMonthlyGoal(monthId) {
    return getOne('monthlyGoals', monthId);
}

/**
 * Get all monthly goals for the year
 */
export function getAllMonthlyGoals(year) {
    return getAll('monthlyGoals').then(goals =>
        goals.filter(g => g.year === year)
    );
}

/**
 * Save/update monthly goals
 */
export function putMonthlyGoal(doc) {
    if (isTestMode()) return Promise.resolve();
    doc.updatedAt = new Date().toISOString();
    return putOne('monthlyGoals', doc);
}

// ============ SYNC QUEUE OPERATIONS ============

/**
 * Add a mutation to the sync queue
 * @param {Object} mutation - { collection, operation, docId, data }
 */
export function addToSyncQueue(mutation) {
    if (isTestMode()) return Promise.resolve();
    mutation.createdAt = new Date().toISOString();
    return putOne('syncQueue', mutation);
}

/**
 * Get all pending sync mutations
 */
export function getSyncQueue() {
    return getAll('syncQueue');
}

/**
 * Clear the sync queue (after successful sync)
 */
export function clearSyncQueue() {
    if (isTestMode()) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const tx = getDb().transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete ALL data from every store (entries, monthlyGoals, meta, syncQueue)
 */
export function clearAllData() {
    if (isTestMode()) return Promise.resolve();
    const stores = ['entries', 'monthlyGoals', 'meta', 'syncQueue'];
    return new Promise((resolve, reject) => {
        const tx = getDb().transaction(stores, 'readwrite');
        let done = 0;
        for (const name of stores) {
            const req = tx.objectStore(name).clear();
            req.onsuccess = () => { if (++done === stores.length) resolve(); };
            req.onerror = () => reject(req.error);
        }
    });
}

/**
 * Delete a single sync queue item
 */
export function deleteSyncQueueItem(key) {
    if (isTestMode()) return Promise.resolve();
    return deleteOne('syncQueue', key);
}
