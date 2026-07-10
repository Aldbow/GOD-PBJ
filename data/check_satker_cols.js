const fs = require('fs');
const lines = fs.readFileSync('data/260630_paket-penyedia-terumumkan.csv', 'utf8').split('\n');
const headers = lines[0].split(';');

let targetRow = lines.find(l => l.includes('Balai Pelatihan Vokasi dan Produktivitas Bandung Barat'));
if (!targetRow) targetRow = lines[118];

let inQuotes = false;
let cols = [];
let curr = '';
for (let i = 0; i < targetRow.length; i++) {
    if (targetRow[i] === '"') inQuotes = !inQuotes;
    else if (targetRow[i] === ';' && !inQuotes) {
        cols.push(curr);
        curr = '';
    } else curr += targetRow[i];
}
cols.push(curr);

for (let i = 0; i < headers.length; i++) {
    if (cols[i] === '94422' || cols[i] === '021212' || cols[i] === '21212') {
        console.log(`${headers[i]} = ${cols[i]}`);
    }
}
