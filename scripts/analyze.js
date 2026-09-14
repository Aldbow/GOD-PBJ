const fs = require('fs');

const sirupLines = fs.readFileSync('data/260630_paket-penyedia-terumumkan.csv', 'utf8').split('\n');
const sirupHeader = sirupLines[0].split(';');
const sirupKdRupIdx = sirupHeader.indexOf('kd_rup');
const sirupMetodeIdx = sirupHeader.indexOf('metode_pemilihan');

const sirupRups = new Set();
for (let i = 1; i < sirupLines.length; i++) {
  if (!sirupLines[i].trim()) continue;
  const cols = sirupLines[i].split(';');
  const m = cols[sirupMetodeIdx];
  if (m === 'Pengadaan Langsung' || m === 'Pengadaan Langsung ') {
     let kdRup = cols[sirupKdRupIdx];
     if (kdRup) sirupRups.add(kdRup.replace(/"/g, ''));
  }
}

const transLines = fs.readFileSync('data/non-tender-selesai_2026.csv', 'utf8').split('\n');
const transHeader = transLines[0].split(';');
const transKdRupIdx = transHeader.indexOf('kd_rup');
const transMtdIdx = transHeader.indexOf('mtd_pemilihan');
const kontrakIdx = transHeader.indexOf('nilai_kontrak');
const negoIdx = transHeader.indexOf('nilai_negosiasi');
const statusIdx = transHeader.indexOf('status_nontender');

let sumMatched = 0;
let sumUnmatched = 0;
let matchCount = 0;
let unmatchCount = 0;
let unmatchedList = [];

for (let i = 1; i < transLines.length; i++) {
  if (!transLines[i].trim()) continue;
  const cols = transLines[i].split(';');
  if (cols[transMtdIdx] !== 'Pengadaan Langsung') continue;
  
  const kd_rup = cols[transKdRupIdx];
  let val = 0;
  const k = cols[kontrakIdx];
  const n = cols[negoIdx];
  if (k && k.trim() !== '') {
    val = parseFloat(k.replace(',', '.'));
  } else if (n && n.trim() !== '') {
    val = parseFloat(n.replace(',', '.'));
  }
  
  if (isNaN(val)) val = 0;

  if (sirupRups.has(kd_rup)) {
    sumMatched += val;
    matchCount++;
  } else {
    sumUnmatched += val;
    unmatchCount++;
    unmatchedList.push({ kd_rup, val, status: cols[statusIdx] });
  }
}

console.log('Total Matched (IDR):', sumMatched);
console.log('Match Count:', matchCount);
console.log('Total Unmatched (IDR):', sumUnmatched);
console.log('Unmatch Count:', unmatchCount);
console.log('Unmatched List:', JSON.stringify(unmatchedList, null, 2));
