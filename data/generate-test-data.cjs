/**
 * Generate test-data.json — a full year of realistic habit tracking data
 * Run: node data/generate-test-data.cjs
 */
const fs = require('fs');
const path = require('path');

const YEAR = 2026;

// Seeded PRNG for reproducibility
function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

const rng = seededRandom(42);
const rand = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const randF = (min, max) => Math.round((rng() * (max - min) + min) * 10) / 10;
const chance = (pct) => rng() < pct;

function pad(n) { return String(n).padStart(2, '0'); }
function toDateId(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }
function getDaysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

const entries = [];
const monthlyGoals = [];

// Generate entries for all 12 months
for (let month = 1; month <= 12; month++) {
    const daysInMonth = getDaysInMonth(YEAR, month);

    // Simulate a "how far into the year" factor — later months have fewer entries
    // to simulate the current date being mid-year (let's say data exists through month 10)
    const maxDay = month <= 10 ? daysInMonth : (month === 11 ? 15 : 0);

    for (let day = 1; day <= maxDay; day++) {
        const dateId = toDateId(YEAR, month, day);
        const dayOfWeek = new Date(YEAR, month - 1, day).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Motivation curve — starts strong, dips mid-year, recovers
        const monthFactor = 1 - 0.15 * Math.sin((month - 1) / 11 * Math.PI);
        const baseChance = isWeekend ? 0.55 : 0.78;
        const goalChance = baseChance * monthFactor;

        // Daily Goals
        const dailyGoals = {
            'Workout at least 10 minutes': chance(goalChance),
            'Drink 2L of water': chance(goalChance + 0.08),
            'Read for 30 minutes': chance(goalChance - 0.05),
            'No junk food': chance(goalChance - 0.12),
        };

        const goalKeys = Object.keys(dailyGoals);
        const completed = goalKeys.filter(k => dailyGoals[k] === true).length;
        const dailyGoalCompletion = completed / goalKeys.length;

        // Daily Log — fields nested under section name
        const didRun = chance(isWeekend ? 0.4 : 0.6);
        const runTime = didRun ? rand(18, 50) : null;
        const runDist = didRun ? randF(2.5, 8.0) : null;

        const didLift = chance(isWeekend ? 0.3 : 0.55);
        // Progressive overload — weights increase slightly over months
        const liftBonus = Math.floor(month * 1.5);

        const fields = {
            'Daily Log': {
                'Wake Up Time': `${rand(5, 8)}:${pad(rand(0, 59))}`,
                'Running Time': runTime,
                'Running Distance': runDist,
                'Running Pace': null, // calculated field
                'Calories Consumed': rand(1600, 2800),
                'Protein Powder Intake': chance(0.75) ? rand(20, 50) : null,
                'Creatine Intake': chance(0.8) ? rand(3, 5) : null,
                'Bench Press': didLift ? rand(50 + liftBonus, 85 + liftBonus) : null,
                'Squat': didLift ? rand(70 + liftBonus, 130 + liftBonus) : null,
                'Deadlift': didLift ? rand(90 + liftBonus, 170 + liftBonus) : null,
            }
        };

        entries.push({
            _id: dateId,
            year: YEAR,
            month: month,
            day: day,
            weekday: dayOfWeek,
            dailyGoals,
            fields,
            dailyGoalCompletion,
            updatedAt: new Date(YEAR, month - 1, day, rand(18, 23), rand(0, 59)).toISOString()
        });
    }

    // Monthly goals — some months complete, some partial
    const mCompletion = month <= 3 ? 0.67 + rng() * 0.33
        : month <= 6 ? 0.33 + rng() * 0.34
            : month <= 9 ? 0.5 + rng() * 0.5
                : rng() * 0.5;

    const goals = {
        'Complete online course': chance(mCompletion > 0.5 ? 0.7 : 0.3),
        'Read 2 books': chance(mCompletion > 0.4 ? 0.6 : 0.25),
        'Hit gym 20 times': chance(mCompletion > 0.6 ? 0.65 : 0.2),
    };
    const mGoalKeys = Object.keys(goals);
    const mCompleted = mGoalKeys.filter(k => goals[k]).length;

    monthlyGoals.push({
        _id: `${YEAR}-${pad(month)}`,
        year: YEAR,
        month: month,
        goals,
        completionRate: mCompleted / mGoalKeys.length,
        updatedAt: new Date(YEAR, month - 1, 28, 20, 0).toISOString()
    });
}

const data = { entries, monthlyGoals };
const outPath = path.join(__dirname, 'test-data.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`✅ Generated ${entries.length} entries and ${monthlyGoals.length} monthly goals → ${outPath}`);
