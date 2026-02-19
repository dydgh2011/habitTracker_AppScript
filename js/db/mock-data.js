/**
 * Mock Data Seeder — populate IndexedDB with ~45 days of realistic entries
 * Only seeds if no entries currently exist.
 */

import { YEAR } from '../config.js';
import { putEntry, putMonthlyGoal, getAllEntries } from './local-store.js';
import { getDaysInMonth, toDateId } from '../utils/date-utils.js';

/**
 * Simple seeded random for reproducible data
 */
function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

/**
 * Generate a random int between min and max (inclusive)
 */
function randInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max, rounded to 1 decimal
 */
function randFloat(rng, min, max) {
    return Math.round((rng() * (max - min) + min) * 10) / 10;
}

/**
 * Seed the database with mock entries if empty
 */
export async function seedMockData() {
    // Check if data already exists
    const existing = await getAllEntries(YEAR);
    if (existing.length > 0) return false;

    const rng = seededRandom(2026);

    // Generate entries for Jan 1 – Feb 15
    const months = [
        { month: 1, days: getDaysInMonth(YEAR, 1) },   // Jan: 31 days
        { month: 2, days: 15 },                          // Feb: 15 days
    ];

    for (const { month, days } of months) {
        for (let day = 1; day <= days; day++) {
            const dateId = toDateId(YEAR, month, day);
            const dayOfWeek = new Date(YEAR, month - 1, day).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Daily goals — slightly more likely to complete on weekdays
            const goalChance = isWeekend ? 0.55 : 0.75;

            const dailyGoals = {
                'Workout at least 10 minutes': rng() < goalChance,
                'Drink 2L of water': rng() < (goalChance + 0.1),
                'Read for 30 minutes': rng() < (goalChance - 0.05),
                'No junk food': rng() < (goalChance - 0.1),
            };

            const runningTime = rng() < 0.6 ? randInt(rng, 20, 45) : '';
            const runningDistance = runningTime ? randFloat(rng, 3, 7) : '';

            const dailyLogFields = {
                'Wake Up Time': `${randInt(rng, 6, 7)}:${String(randInt(rng, 0, 59)).padStart(2, '0')}`,
                'Running Time': runningTime,
                'Running Distance': runningDistance,
                'Calories Consumed': randInt(rng, 1800, 2500),
                'Protein Powder Intake': rng() < 0.7 ? randInt(rng, 20, 50) : '',
                'Creatine Intake': rng() < 0.8 ? randInt(rng, 3, 5) : '',
            };

            // Gym lifts (only ~3-4 days per week)
            if (rng() < 0.5) {
                dailyLogFields['Bench Press'] = randInt(rng, 55, 80);
                dailyLogFields['Squat'] = randInt(rng, 75, 120);
                dailyLogFields['Deadlift'] = randInt(rng, 95, 160);
            }

            // Calculate daily goal completion for heatmap
            const completed = Object.values(dailyGoals).filter(v => v === true).length;
            const dailyGoalCompletion = Object.keys(dailyGoals).length > 0
                ? completed / Object.keys(dailyGoals).length
                : 0;

            const entry = {
                _id: dateId,
                year: YEAR,
                month: month,
                day: day,
                weekday: dayOfWeek,
                dailyGoals,
                fields: {
                    'Daily Log': dailyLogFields,
                },
                dailyGoalCompletion,
                updatedAt: new Date().toISOString(),
            };

            await putEntry(entry);
        }
    }

    // Monthly goals — Jan is partially complete, Feb less so
    await putMonthlyGoal({
        _id: `${YEAR}-01`,
        year: YEAR,
        month: 1,
        'Complete online course': true,
        'Read 2 books': true,
        'Hit gym 20 times': false,
        completion: 0.67,
        updatedAt: new Date().toISOString()
    });

    await putMonthlyGoal({
        _id: `${YEAR}-02`,
        year: YEAR,
        month: 2,
        'Complete online course': false,
        'Read 2 books': false,
        'Hit gym 20 times': false,
        completion: 0,
        updatedAt: new Date().toISOString()
    });

    console.log('🌱 Mock data seeded: 46 entries, 2 monthly goals');
    return true;
}
