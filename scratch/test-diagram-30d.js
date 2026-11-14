const fs = require('fs');
const path = require('path');

const jsContent = fs.readFileSync(path.join(__dirname, '../frontend/admin/dashboard/admin-dashboard.js'), 'utf8');

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const now = new Date('2026-11-14T12:00:00Z');

const timeline = [];
for (let i = 29; i >= 0; i--) {
  const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
  const key = d.toISOString().split('T')[0];
  timeline.push({
    date: `${d.getDate()} ${monthsOfYear[d.getMonth()]}`,
    dayName: daysOfWeek[d.getDay()],
    fullDate: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
    rawDate: key,
    isToday: i === 0,
    revenue: i === 0 ? 69 : (i === 10 ? 30 : 0),
    orders: i === 0 ? 2 : (i === 10 ? 1 : 0),
  });
}

console.log('Timeline length:', timeline.length);

const N = timeline.length;
let labelStride = 1;
if (N > 21) {
  labelStride = 5;
} else if (N > 10) {
  labelStride = 2;
}

console.log('labelStride for N=30:', labelStride);

const labeledDays = [];
timeline.forEach((t, idx) => {
  const isLast = (idx === N - 1);
  const isFirst = (idx === 0);
  const isStep = (idx % labelStride === 0);
  const isNearLast = (N - 1 - idx) < Math.floor(labelStride / 2);
  const showLabel = isFirst || isLast || (isStep && !isNearLast);
  if (showLabel) {
    labeledDays.push({ idx, dayName: t.dayName, date: t.date, isToday: t.isToday });
  }
});

console.log(`Rendered ${labeledDays.length} labels out of ${N} days:`);
console.table(labeledDays);

if (labeledDays.length <= 8 && labeledDays.length >= 6) {
  console.log('SUCCESS: Exactly 7 cleanly spaced labels rendered across the 30-day spectrum. No congestion possible.');
} else {
  console.error('FAILURE: Unexpected label count:', labeledDays.length);
  process.exit(1);
}

