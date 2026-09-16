// ============================================================================
// Sekali jalan: tarikan INAPROC -> data/data_update/ -> Supabase
// ----------------------------------------------------------------------------
// Menjalankan tiga langkah berurutan, berhenti begitu ada yang gagal:
//
//   1. salin/tarik data mentah ke data/data_update/ (dua cara, lihat --live)
//   2. node scripts/update_from_data_update.mjs --dry-run --all    periksa
//   3. node scripts/update_from_data_update.mjs --all              tulis ke DB
//
// Langkah 2 wajib dan tidak bisa dilewati — itu prosedur di
// docs/RUNBOOK-UPDATE-DATA.md §5. Kalau satu tabel saja tidak lolos periksa,
// langkah 3 tidak dijalankan sama sekali dan database tidak tersentuh.
//
// Langkah 3 tetap meminta konfirmasi "ya" dari updater-nya sendiri. Pakai
// --yes kalau dijalankan dari scheduler/non-TTY.
//
// DUA CARA LANGKAH 1
//   default   scripts/sync_from_inaproc.mjs -- menyalin file JSON dari folder
//             tarikan lokal (hasil `web-app`) ke data/data_update/. Butuh
//             komputer yang punya folder tarikan itu (lihat INAPROC_SYNC_DIR).
//   --live    scripts/pull_from_inaproc.mjs -- menarik LANGSUNG dari
//             data.inaproc.id (butuh JWT_TOKEN di .env.local, lihat
//             .env.example). Tidak butuh web-app / folder tarikan lokal sama
//             sekali. Ini cara yang dipakai npm run update-data-live.
//
// PEMAKAIAN
//   node scripts/refresh_data.mjs
//   npm run update-data
//   node scripts/refresh_data.mjs --live                tarik langsung dari API
//   node scripts/refresh_data.mjs --live --year 2026
//   node scripts/refresh_data.mjs --dry-run        salin/tarik + periksa saja
//   node scripts/refresh_data.mjs --yes            tanpa konfirmasi interaktif
//
// LOKASI TARIKAN LOKAL (hanya relevan tanpa --live)
//   Diatur sekali per komputer lewat .env.local (file ini di-gitignore):
//
//     INAPROC_SYNC_DIR=E:\INAPROC-Data\sync-state\v1
//
//   Urutan yang menang: --source > env proses > .env.local > bawaan
//   D:\INAPROC-Data\sync-state\v1. Detailnya di scripts/sync_from_inaproc.mjs.
//
// FLAG
//   --dry-run       berhenti setelah langkah 2; tidak ada file/DB yang berubah
//   --live          langkah 1 tarik langsung dari API (lihat di atas)
//   --year <YYYY>   hanya dengan --live -- tahun yang diminta ke API
//   --source <dir>  hanya tanpa --live -- folder tarikan INAPROC untuk sekali jalan ini saja
//   --skip-sync     langsung ke langkah 2, pakai isi data/data_update/ apa adanya
//   --keep-extra    hanya tanpa --live -- jangan hapus file tarikan lama di data/data_update/
//   --force-older   hanya tanpa --live -- izinkan menyalin file sumber yang lebih tua dari yang ada
//   --yes           lewati konfirmasi "ya" di langkah 3
//   --force         lewati gerbang "baris turun drastis" di updater
// ============================================================================

import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);

let source = null;
let year = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--source') {
    if (!argv[i + 1]) {
      console.error('\n[GAGAL] --source butuh path folder\n');
      process.exit(1);
    }
    source = argv[++i];
  } else if (argv[i] === '--year') {
    if (!argv[i + 1]) {
      console.error('\n[GAGAL] --year butuh nilai, mis. --year 2026\n');
      process.exit(1);
    }
    year = argv[++i];
  }
}

const langkah = [];

if (!has('--skip-sync')) {
  let a;
  let judul;
  if (has('--live')) {
    a = ['scripts/pull_from_inaproc.mjs'];
    if (year) a.push('--year', year);
    judul = 'LANGKAH 1/3 — tarik langsung dari INAPROC ke data/data_update/';
  } else {
    a = ['scripts/sync_from_inaproc.mjs'];
    if (source) a.push('--source', source);
    if (has('--dry-run')) a.push('--dry-run');
    if (has('--keep-extra')) a.push('--keep-extra');
    if (has('--force-older')) a.push('--force');
    judul = 'LANGKAH 1/3 — salin tarikan INAPROC ke data/data_update/';
  }
  langkah.push({ judul, args: a });
}

const cekArgs = ['scripts/update_from_data_update.mjs', '--dry-run', '--all'];
if (has('--force')) cekArgs.push('--force');
langkah.push({ judul: 'LANGKAH 2/3 — periksa (dry run, tidak menulis apa pun)', args: cekArgs });

if (!has('--dry-run')) {
  const tulisArgs = ['scripts/update_from_data_update.mjs', '--all'];
  if (has('--yes')) tulisArgs.push('--yes');
  if (has('--force')) tulisArgs.push('--force');
  langkah.push({ judul: 'LANGKAH 3/3 — tulis ke Supabase', args: tulisArgs });
}

const garis = '='.repeat(76);
for (const [i, l] of langkah.entries()) {
  console.log((i ? '\n\n' : '') + garis + '\n' + l.judul + '\n' + garis);
  const r = spawnSync(process.execPath, l.args, { cwd: ROOT, stdio: 'inherit' });
  if (r.error) {
    console.error('\n[GAGAL] tidak bisa menjalankan node: ' + r.error.message + '\n');
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error('\n[BERHENTI] "' + l.judul.split('—')[0].trim() + '" keluar dengan kode ' + r.status + '. Langkah berikutnya tidak dijalankan.\n');
    process.exit(r.status ?? 1);
  }
}

console.log(
  '\n' +
    garis +
    '\n' +
    (has('--dry-run')
      ? 'DRY RUN selesai. Tidak ada perubahan di database. Jalankan lagi tanpa --dry-run untuk menulis.'
      : 'SELESAI. Data di Supabase sudah sesuai tarikan terbaru, stempel "Diperbarui ..." di topbar ikut maju.') +
    '\n' +
    garis
);
