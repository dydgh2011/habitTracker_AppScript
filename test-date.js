const YEAR = 2026;
function toDateId(year, month, day) {
    const m = month.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
}
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}
const now = new Date();
const currentYear = now.getFullYear();
const todayId = toDateId(currentYear, now.getMonth() + 1, now.getDate());

const allDates = [];
for (let m = 1; m <= 12; m++) {
    const dim = getDaysInMonth(YEAR, m);
    for (let d = 1; d <= dim; d++) {
        const dateId = toDateId(YEAR, m, d);
        if (YEAR < currentYear || dateId <= todayId) {
            allDates.push({ dateId });
        }
    }
}
console.log("Date now:", now);
console.log("Current Year:", currentYear);
console.log("Today ID:", todayId);
console.log("Total Visible Days:", allDates.length);
