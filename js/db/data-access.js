/**
 * Data Access Layer — Routes reads to local-store or test-mode
 *
 * All views should import from here instead of directly from local-store.
 * When test mode is active, reads come from the static JSON.
 * Writes always go to local-store (and are silently no-op'd in test mode).
 */

import { isTestMode } from './test-mode.js';

// Dynamic import to avoid loading both modules upfront
let _testModule = null;
let _localModule = null;

async function getTestModule() {
    if (!_testModule) _testModule = await import('./test-mode.js');
    return _testModule;
}

async function getLocalModule() {
    if (!_localModule) _localModule = await import('./local-store.js');
    return _localModule;
}

async function getReadModule() {
    if (isTestMode()) return getTestModule();
    return getLocalModule();
}

// ============ READ OPERATIONS (routed by mode) ============

export async function getEntry(dateId) {
    const mod = await getReadModule();
    return mod.getEntry(dateId);
}

export async function getMonthEntries(year, month) {
    const mod = await getReadModule();
    return mod.getMonthEntries(year, month);
}

export async function getAllEntries(year) {
    const mod = await getReadModule();
    return mod.getAllEntries(year);
}

export async function getMonthlyGoal(monthId) {
    const mod = await getReadModule();
    return mod.getMonthlyGoal(monthId);
}

export async function getAllMonthlyGoals(year) {
    const mod = await getReadModule();
    return mod.getAllMonthlyGoals(year);
}

// ============ WRITE OPERATIONS (always local, no-op in test mode) ============

export async function putEntry(doc) {
    if (isTestMode()) return;
    const mod = await getLocalModule();
    return mod.putEntry(doc);
}

export async function putMonthlyGoal(doc) {
    if (isTestMode()) return;
    const mod = await getLocalModule();
    return mod.putMonthlyGoal(doc);
}
