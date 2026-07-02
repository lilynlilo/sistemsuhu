const formatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const ts = new Date('2026-07-02T06:23:08.805822+00:00');
const parts = formatter.formatToParts(ts);
console.log('Parts:', parts);

const partObj = {};
parts.forEach(p => partObj[p.type] = p.value);
console.log('partObj:', partObj);

const dateStr = `${partObj.day}/${partObj.month}/${partObj.year}`;
const timeStr = `${partObj.hour}:${partObj.minute}:${partObj.second}`;
console.log('dateStr:', dateStr);
console.log('timeStr:', timeStr);
