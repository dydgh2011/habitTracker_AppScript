/**
 * Export/Import — JSON data backup for entries and goals
 */

import { getAllEntries, getAllMonthlyGoals, putEntry, putMonthlyGoal, getMeta } from '../db/local-store.js';
import { YEAR } from '../config.js';

/**
 * Export all data as a JSON object
 */
export async function exportAllData() {
    const [entries, monthlyGoals, meta] = await Promise.all([
        getAllEntries(YEAR),
        getAllMonthlyGoals(YEAR),
        getMeta(),
    ]);

    return {
        version: 1,
        exportDate: new Date().toISOString(),
        year: YEAR,
        schema: meta?.schema || null,
        entries: entries,
        monthlyGoals: monthlyGoals,
    };
}

/**
 * Import data from a JSON object
 */
export async function importAllData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
    }

    if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
            if (entry._id) {
                await putEntry(entry);
            }
        }
    }

    if (data.monthlyGoals && Array.isArray(data.monthlyGoals)) {
        for (const goal of data.monthlyGoals) {
            if (goal._id) {
                await putMonthlyGoal(goal);
            }
        }
    }

    return {
        entriesImported: data.entries?.length || 0,
        goalsImported: data.monthlyGoals?.length || 0,
    };
}

/**
 * Trigger a JSON file download in the browser
 */
export function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Read a JSON file from a File input
 */
export function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                resolve(JSON.parse(reader.result));
            } catch (err) {
                reject(new Error('Invalid JSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
