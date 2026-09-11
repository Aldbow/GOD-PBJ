// ============================================================================
// Salin tarikan INAPROC lokal -> data/data_update/<nama_tabel>/
// ----------------------------------------------------------------------------
// Sumber default: D:\INAPROC-Data\sync-state\v1 (hasil sinkronisasi INAPROC di
// komputer ini). Isinya jauh lebih banyak daripada yang dipakai dashboard —
// script ini hanya menyalin file untuk 11 tabel yang terdaftar di TABLES milik
// scripts/update_from_data_update.mjs, satu folder per tabel.
//
// PEMAKAIAN
//   node scripts/sync_from_inaproc.mjs --dry-run
//   node scripts/sync_from_inaproc.mjs
//   node scripts/sync_from_inaproc.mjs --source "E:\lokasi\lain\v1"
//
// FLAG
//   --dry-run     hanya laporan, tidak menyalin/menghapus apa pun
//   --source <d>  folder sumber (menang atas semua konfigurasi di bawah)
//   --keep-extra  jangan hapus file lama di folder tujuan (default: dihapus)
//   --force       tetap salin walau file sumber LEBIH TUA dari yang sudah ada
//
// LOKASI TARIKAN LOKAL
//   Beda komputer, beda drive. Urutan yang dipakai, yang pertama ketemu menang:
//
//     1. --source <folder>
//     2. environment variable INAPROC_SYNC_DIR
//     3. INAPROC_SYNC_DIR di .env.local
//     4. bawaan: D:\INAPROC-Data\sync-state\v1
//
//   Di komputer baru cukup tambahkan satu baris di .env.local (file ini
//   di-gitignore, jadi tiap komputer punya isinya sendiri):
//
//     INAPROC_SYNC_DIR=E:\INAPROC-Data\sync-state\v1
//
//   Path relatif boleh — dihitung dari root repo, bukan dari folder tempat
//   perintah dijalankan.
//
// YANG DISALIN
//   Hanya .json + .meta.json pasangannya. .csv disalin cuma kalau tabel itu
//   memang tidak punya JSON di sumber (saat ini: data_afirmasi_pdn_perencanaan).
//   .xlsx tidak pernah disalin — updater selalu mengabaikannya dan ukurannya
//   besar (paket-penyedia-terumumkan saja 16 MB).
//
// KENAPA FILE LAMA DIHAPUS (prune)
//   findSourceFile() di updater memakai readdirSync().find() — file JSON/CSV
//   PERTAMA yang ketemu, bukan yang terbaru. data_afirmasi_pdn_perencanaan
//   namanya berstempel waktu (..._20260911_052049.csv), jadi kalau file lama
//   dibiarkan menumpuk, updater bisa memilih tarikan lama tanpa keluhan apa
//   pun. Sisa .csv/.xlsx dari tarikan sebelumnya juga cuma bikin bingung.
// ============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPDATE_DIR = path.join(ROOT, 'data', 'data_update');
const DEFAULT_SOURCE = 'D:\\INAPROC-Data\\sync-state\\v1';

// dir  = subfolder di dalam folder sumber ('.' = akar)
// stem = nama file tanpa akhiran _<tag>.<ext>; tag boleh tahun (2026) maupun
//        stempel waktu (20260911_052049). Kalau ada beberapa tag, dipilih yang
//        paling besar (= paling baru), JSON diutamakan daripada CSV.
const SOURCES = [
  { table: 'api_paket_penyedia_terumumkan', dir: 'rup', stem: 'paket-penyedia-terumumkan' },
  { table: 'api_paket_swakelola_terumumkan', dir: 'rup', stem: 'paket-swakelola-terumumkan' },
  { table: 'history_kaji_ulang', dir: 'rup', stem: 'history-kaji-ulang' },
  { table: 'paket_anggaran_penyedia', dir: 'rup', stem: 'paket-anggaran-penyedia' },
  { table: 'paket_anggaran_swakelola', dir: 'rup', stem: 'paket-anggaran-swakelola' },
  { table: 'paket_e_purchasing', dir: 'ekatalog', stem: 'paket-e-purchasing' },
  { table: 'pencatatan_non_tender_realisasi', dir: 'tender', stem: 'pencatatan-non-tender-realisasi' },
  { table: 'pencatatan_non_tender', dir: 'tender', stem: 'pencatatan-non-tender' },
  { table: 'non_tender_selesai', dir: 'tender', stem: 'non-tender-selesai' },
  { table: 'tender_selesai_nilai', dir: 'tender', stem: 'tender-selesai-nilai' },
  // Satu-satunya yang CSV: tidak ada padanan JSON di sumber. dashboard/afirmasi
  // BUKAN tabel ini — kolomnya soal pelaksanaan PDN, bukan perencanaan.
  { table: 'data_afirmasi_pdn_perencanaan', dir: '.', stem: 'data_afirmasi_pdn_perencanaan' },
];

// ---------------------------------------------------------------- argumen CLI
const argv = process.argv.slice(2);
const flags = {
  dryRun: argv.includes('--dry-run'),
  keepExtra: argv.includes('--keep-extra'),
  force: argv.includes('--force'),
};
function fail(msg) {
  console.error('\n[GAGAL] ' + msg + '\n');
  process.exit(1);
}

// .env.local dibaca sendiri (tanpa dependency) — sama seperti yang dilakukan
// update_from_data_update.mjs. Bedanya: di sini file itu BOLEH tidak ada, karena
// script ini tidak butuh kredensial Supabase sama sekali.
function readEnvLocal() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^([^=#]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* tidak ada .env.local — pakai default saja */
  }
  return out;
}

// Urutan menang: --source > env proses > .env.local > bawaan.
let sourceArg = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--source') {
    if (!argv[i + 1]) fail('--source butuh path folder');
    sourceArg = argv[++i];
  }
}
const envLocal = readEnvLocal();
const asal = sourceArg
  ? { nilai: sourceArg, dari: '--source' }
  : process.env.INAPROC_SYNC_DIR
    ? { nilai: process.env.INAPROC_SYNC_DIR, dari: 'env INAPROC_SYNC_DIR' }
    : envLocal.INAPROC_SYNC_DIR
      ? { nilai: envLocal.INAPROC_SYNC_DIR, dari: '.env.local' }
      : { nilai: DEFAULT_SOURCE, dari: 'bawaan script' };
// Path relatif dihitung dari root repo, bukan dari cwd — supaya hasilnya sama
// dari mana pun perintah dijalankan.
const SOURCE_ROOT = path.resolve(ROOT, asal.nilai);

function sha1(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
}

function mb(bytes) {
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function readMeta(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// Cari file sumber terbaik untuk satu tabel: tag terbesar, JSON di atas CSV.
function findSource(entry) {
  const dir = path.join(SOURCE_ROOT, entry.dir);
  if (!fs.existsSync(dir)) return { error: 'folder sumber tidak ada: ' + dir };
  const re = new RegExp('^' + entry.stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_(.+)\\.(json|csv)$', 'i');
  const found = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.meta.json')) continue;
    const m = name.match(re);
    if (m) found.push({ name, tag: m[1], ext: m[2].toLowerCase() });
  }
  if (!found.length) return { error: 'tidak ada file ' + entry.stem + '_*.json/.csv di ' + dir };

  const tag = found.map((f) => f.tag).sort().reverse()[0];
  const sameTag = found.filter((f) => f.tag === tag);
  const pick = sameTag.find((f) => f.ext === 'json') || sameTag[0];
  const others = found.filter((f) => f.tag !== tag).map((f) => f.name);

  const file = path.join(dir, pick.name);
  const metaName = pick.name.replace(/\.(json|csv)$/i, '.meta.json');
  const metaFile = path.join(dir, metaName);
  return {
    file,
    name: pick.name,
    kind: pick.ext,
    meta: fs.existsSync(metaFile) ? { file: metaFile, name: metaName } : null,
    tagLain: others,
  };
}

function copy(src, dest) {
  if (!flags.dryRun) fs.copyFileSync(src, dest);
}

// --------------------------------------------------------------------- jalan
console.log('Sinkronisasi tarikan INAPROC -> data/data_update/');
console.log('  sumber : ' + SOURCE_ROOT + '   (dari ' + asal.dari + ')');
console.log('  tujuan : ' + UPDATE_DIR);
if (flags.dryRun) console.log('  mode   : DRY RUN (tidak ada file yang disalin/dihapus)');
console.log('');

if (!fs.existsSync(SOURCE_ROOT)) {
  fail(
    'Folder sumber tidak ditemukan: ' +
      SOURCE_ROOT +
      '  (dari ' +
      asal.dari +
      ')\n         Di komputer ini tarikan INAPROC ada di mana? Tambahkan satu baris' +
      '\n         di .env.local, misalnya:\n' +
      '\n             INAPROC_SYNC_DIR=E:\\INAPROC-Data\\sync-state\\v1\n' +
      '\n         Atau sekali jalan saja: --source "E:\\INAPROC-Data\\sync-state\\v1"'
  );
}

const masalah = [];
const ringkasan = [];

for (const entry of SOURCES) {
  process.stdout.write(entry.table.padEnd(34) + '... ');
  const src = findSource(entry);
  if (src.error) {
    console.log('TIDAK ADA SUMBER');
    console.log('   ' + src.error);
    masalah.push(entry.table + ': ' + src.error);
    continue;
  }

  const destDir = path.join(UPDATE_DIR, entry.table);
  if (!fs.existsSync(destDir) && !flags.dryRun) fs.mkdirSync(destDir, { recursive: true });

  const destFile = path.join(destDir, src.name);
  const metaBaru = src.meta ? readMeta(src.meta.file) : null;

  // Gerbang "mundur": jangan timpa tarikan baru dengan yang lebih tua.
  const metaLamaFile = path.join(destDir, src.name.replace(/\.(json|csv)$/i, '.meta.json'));
  const metaLama = fs.existsSync(metaLamaFile) ? readMeta(metaLamaFile) : null;
  if (
    !flags.force &&
    metaBaru &&
    metaBaru.lastUpdated &&
    metaLama &&
    metaLama.lastUpdated &&
    Date.parse(metaBaru.lastUpdated) < Date.parse(metaLama.lastUpdated)
  ) {
    console.log('TERTAHAN');
    const m =
      'file sumber (' +
      metaBaru.lastUpdated +
      ') lebih tua dari yang sudah ada (' +
      metaLama.lastUpdated +
      '). Pakai --force kalau memang disengaja.';
    console.log('   ' + m);
    masalah.push(entry.table + ': ' + m);
    continue;
  }

  // Salin file utama kalau isinya memang beda.
  const adaSebelumnya = fs.existsSync(destFile);
  const sama =
    adaSebelumnya &&
    fs.statSync(destFile).size === fs.statSync(src.file).size &&
    sha1(destFile) === sha1(src.file);
  const aksi = sama ? 'sama' : adaSebelumnya ? 'diperbarui' : 'baru';
  if (!sama) copy(src.file, destFile);

  const disalin = new Set([src.name]);
  if (src.meta) {
    copy(src.meta.file, path.join(destDir, src.meta.name));
    disalin.add(src.meta.name);
  }

  // Buang sisa tarikan lama (termasuk .csv/.xlsx dan stempel waktu kadaluwarsa).
  const dibuang = [];
  if (!flags.keepExtra && fs.existsSync(destDir)) {
    for (const name of fs.readdirSync(destDir)) {
      if (disalin.has(name)) continue;
      dibuang.push(name);
      if (!flags.dryRun) fs.rmSync(path.join(destDir, name));
    }
  }

  console.log(aksi);
  console.log(
    '   sumber  : ' +
      path.relative(SOURCE_ROOT, src.file).replace(/\\/g, '/') +
      '  (' +
      src.kind +
      ', ' +
      mb(fs.statSync(src.file).size) +
      ')'
  );
  if (metaBaru) {
    console.log(
      '   tarikan : ' +
        (metaBaru.lastUpdated || '-') +
        (metaBaru.rowCount != null ? '  |  ' + metaBaru.rowCount.toLocaleString('id-ID') + ' baris' : '')
    );
  } else {
    console.log('   tarikan : tidak ada .meta.json (source_pulled_at akan kosong)');
  }
  if (src.tagLain.length) console.log('   catatan : tarikan lain diabaikan — ' + src.tagLain.join(', '));
  if (dibuang.length) console.log('   dibuang : ' + dibuang.join(', '));

  ringkasan.push({ table: entry.table, aksi, rowCount: metaBaru && metaBaru.rowCount != null ? metaBaru.rowCount : null });
}

console.log('\n=== RINGKASAN SALIN ===');
for (const r of ringkasan) {
  console.log(
    '  ' +
      r.table.padEnd(34) +
      r.aksi.padEnd(12) +
      (r.rowCount != null ? r.rowCount.toLocaleString('id-ID') + ' baris' : '(baris tidak diketahui)')
  );
}
if (masalah.length) {
  console.log('\n=== TABEL TANPA SUMBER / TERTAHAN (' + masalah.length + ') ===');
  for (const m of masalah) console.log('  - ' + m);
  fail(masalah.length + ' tabel tidak tersalin. Perbaiki dulu sebelum menjalankan updater.');
}
const berubah = ringkasan.filter((r) => r.aksi !== 'sama').length;
console.log(
  '\n' + ringkasan.length + ' tabel siap, ' + berubah + ' file berubah' + (flags.dryRun ? ' (dry run — belum ada yang ditulis).' : '.')
);
process.exit(0);
