const fs = require('fs');

console.log("Membaca data SIRUP...");
const sirupLines = fs.readFileSync('data/260630_paket-penyedia-terumumkan.csv', 'utf8').split('\n');
const sirupHeader = sirupLines[0].split(';');
const sirupKdRupIdx = sirupHeader.indexOf('kd_rup');
const sirupMetodeIdx = sirupHeader.indexOf('metode_pengadaan'); // was metode_pemilihan
const sirupNamaIdx = sirupHeader.indexOf('nama_paket');

const plRups = new Map(); // map of kd_rup -> nama_paket
for (let i = 1; i < sirupLines.length; i++) {
  if (!sirupLines[i].trim()) continue;
  
  // Custom splitting because of quoted strings
  const row = sirupLines[i];
  let cols = [];
  let inQuotes = false;
  let curr = '';
  for (let c = 0; c < row.length; c++) {
    if (row[c] === '"') {
      inQuotes = !inQuotes;
    } else if (row[c] === ';' && !inQuotes) {
      cols.push(curr);
      curr = '';
    } else {
      curr += row[c];
    }
  }
  cols.push(curr);

  const m = cols[sirupMetodeIdx];
  if (m === 'Pengadaan Langsung' || m === 'Pengadaan Langsung ') {
     let kdRup = cols[sirupKdRupIdx];
     if (kdRup) {
        kdRup = kdRup.trim();
        plRups.set(kdRup, cols[sirupNamaIdx]);
     }
  }
}

console.log(`Ditemukan ${plRups.size} RUP Pengadaan Langsung di data awal.`);

console.log("Membaca data History Kaji Ulang...");
const histLines = fs.readFileSync('data/history-kaji-ulang_2026.csv', 'utf8').split('\n');
const histHeader = histLines[0].split(';');
const baruIdx = histHeader.indexOf('kd_rup_baru');
const lamaIdx = histHeader.indexOf('kd_rup_lama');
const revisiIdx = histHeader.indexOf('jenis_revisi');
const tglIdx = histHeader.indexOf('tgl_kaji_ulang');

let matchedHistory = [];

for (let i = 1; i < histLines.length; i++) {
  if (!histLines[i].trim()) continue;
  const cols = histLines[i].split(';');
  
  const rupBaru = (cols[baruIdx] || '').trim();
  const rupLama = (cols[lamaIdx] || '').trim();
  
  if (plRups.has(rupBaru) || plRups.has(rupLama)) {
     matchedHistory.push({
         kd_rup_lama: rupLama,
         kd_rup_baru: rupBaru,
         jenis_revisi: cols[revisiIdx],
         tgl: cols[tglIdx],
         nama_paket: plRups.get(rupBaru) || plRups.get(rupLama)
     });
  }
}

console.log(`\nJumlah baris history yang terkait dengan Pengadaan Langsung: ${matchedHistory.length}`);
if (matchedHistory.length > 0) {
    console.log("Contoh 5 data histori perubahan:");
    console.log(matchedHistory.slice(0, 5));
}
