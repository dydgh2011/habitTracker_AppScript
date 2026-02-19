/**
 * Test Mode Data Layer — In-memory mock data for UI previewing
 *
 * Mirrors the local-store.js API but reads from a static JSON file.
 * Data is read-only — saves are silently no-ops.
 */

let testData = null;
let entryMap = null;

const STORAGE_KEY = 'testMode';

/**
 * Check if test mode is currently active
 */
export function isTestMode() {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Enable test mode — loads mock data and reloads the page
 */
export function enableTestMode() {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    localStorage.removeItem('skipSeed'); // User explicitly wants data
    location.reload();
}

/**
 * Disable test mode — clears mock data and reloads the page
 */
export function disableTestMode() {
    sessionStorage.removeItem(STORAGE_KEY);
    testData = null;
    entryMap = null;
    location.reload();
}

/**
 * Load the test data JSON (cached after first load)
 */
async function loadTestData() {
    if (testData) return testData;

    const response = await fetch('./data/test-data.json');
    testData = await response.json();

    // Build a lookup map by _id for fast entry retrieval
    entryMap = new Map();
    for (const entry of testData.entries) {
        entryMap.set(entry._id, entry);
    }

    return testData;
}

/**
 * Initialize test mode — call during app init if test mode is active
 */
export async function initTestMode() {
    if (!isTestMode()) return false;
    await loadTestData();
    console.log(`🧪 Test mode active: ${testData.entries.length} entries, ${testData.monthlyGoals.length} monthly goals`);
    return true;
}

// ============ MIRROR OF local-store.js API ============

/**
 * Get a single day's entry by date ID
 */
export async function getEntry(dateId) {
    await loadTestData();
    return entryMap.get(dateId) || null;
}

/**
 * Get all entries for a given month (1-indexed)
 */
export async function getMonthEntries(year, month) {
    await loadTestData();
    return testData.entries.filter(e => e.year === year && e.month === month);
}

/**
 * Get all entries for the year
 */
export async function getAllEntries(year) {
    await loadTestData();
    return testData.entries.filter(e => e.year === year);
}

/**
 * Get monthly goals doc by month ID (e.g., "2026-02")
 */
export async function getMonthlyGoal(monthId) {
    await loadTestData();
    return testData.monthlyGoals.find(g => g._id === monthId) || null;
}

/**
 * Get all monthly goals for the year
 */
export async function getAllMonthlyGoals(year) {
    await loadTestData();
    return testData.monthlyGoals.filter(g => g.year === year);
}

// ============ NO-OP WRITE OPERATIONS ============
// In test mode, writes are silently ignored

export async function putEntry(_doc) { return; }
export async function putMonthlyGoal(_doc) { return; }
