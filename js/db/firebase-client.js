/**
 * Firebase Firestore Client
 *
 * Wrapper for Firebase SDK to handle authentication and Firestore operations.
 * Credentials stored in localStorage under 'firebaseConfig'.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { FIREBASE_CONFIG_KEY } from '../config.js';

export class FirebaseClient {
    constructor() {
        this.app = null;
        this.db = null;
        this.config = null;
        this.loadConfig();
    }

    /**
     * Load Firebase config from localStorage and initialize app
     */
    loadConfig() {
        const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
        if (raw) {
            try {
                this.config = JSON.parse(raw);
                this.initApp();
            } catch (e) {
                console.error("Failed to parse firebase config", e);
                this.config = null;
            }
        }
    }

    /**
     * Initialize Firebase App
     */
    async initApp() {
        if (!this.config) return;
        try {
            this.app = initializeApp(this.config);

            // Check if a specific database ID was provided in the config
            if (this.config.databaseId) {
                this.db = getFirestore(this.app, this.config.databaseId);
            } else {
                this.db = getFirestore(this.app);
            }

            try {
                await enableIndexedDbPersistence(this.db);
            } catch (err) {
                if (err.code == 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
                } else if (err.code == 'unimplemented') {
                    console.warn('The current browser does not support all of the features required to enable persistence');
                }
            }
        } catch (e) {
            console.error("Failed to initialize Firebase", e);
        }
    }

    /**
     * Check if the client is configured and initialized
     */
    isConfigured() {
        return !!this.db;
    }

    // ============ CRUD Operations ============

    /**
     * Get a single document by ID
     */
    async getDoc(collectionName, id) {
        if (!this.isConfigured()) throw new Error('Firebase not configured');

        const docRef = doc(this.db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { _id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    }

    /**
     * Get multiple documents with optional query
     * @param {string} collectionName 
     * @param {Array} whereConditions - Array of [field, op, value] arrays
     */
    async getCollection(collectionName, whereConditions = []) {
        if (!this.isConfigured()) throw new Error('Firebase not configured');

        let q = collection(this.db, collectionName);

        if (whereConditions.length > 0) {
            whereConditions.forEach(cond => {
                q = query(q, where(cond[0], cond[1], cond[2]));
            });
        }

        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
            results.push({ _id: doc.id, ...doc.data() });
        });
        return results;
    }

    /**
     * Set (Upsert) a document
     */
    async setDoc(collectionName, id, data) {
        if (!this.isConfigured()) throw new Error('Firebase not configured');

        const docRef = doc(this.db, collectionName, id);
        // Remove _id from data to avoid duplication in Firestore fields (optional, but cleaner)
        const { _id, ...cleanData } = data;

        await setDoc(docRef, cleanData, { merge: true });
        return id;
    }

    /**
     * Delete a document
     */
    async deleteDoc(collectionName, id) {
        if (!this.isConfigured()) throw new Error('Firebase not configured');

        const docRef = doc(this.db, collectionName, id);
        await deleteDoc(docRef);
    }

    /**
     * Test the connection by trying to read (or fail gracefully)
     */
    async testConnection() {
        if (!this.isConfigured()) return { success: false, error: "Not configured" };
        try {
            // Try to fetch the meta config, it might not exist but if we have permission it won't throw 'permission-denied' (unless rules block it)
            // Ideally we just check if we can reach Firestore.
            const docRef = doc(this.db, 'meta', 'app_config');
            await getDoc(docRef);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Save config to localStorage
     */
    static saveConfig(config) {
        localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    }

    /**
     * Clear config from localStorage
     */
    static clearConfig() {
        localStorage.removeItem(FIREBASE_CONFIG_KEY);
    }
}
