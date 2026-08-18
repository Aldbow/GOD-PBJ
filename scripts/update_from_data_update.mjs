// ============================================================================
// Update data Supabase dari folder data/data_update/
// ----------------------------------------------------------------------------
// Mengganti isi tabel dengan data terbaru hasil tarikan API SIRUP/INAPROC yang
// ada di data/data_update/<nama_tabel>/. Format sumber yang dipakai: JSON
// (paling aman — null tetap null, "021212" tidak kehilangan nol depan). CSV
// hanya dipakai kalau tidak ada JSON di folder tersebut.
//
// PEMAKAIAN
//   node scripts/update_from_data_update.mjs --dry-run --all
//   node scripts/update_from_data_update.mjs --table paket_e_purchasing
//   node scripts/update_from_data_update.mjs --all --yes
//
// FLAG
//   --all           proses semua tabel yang terdaftar di TABLES
//   --table <nama>  proses satu tabel (boleh diulang)
//   --dry-run       hanya validasi + laporan, tidak menulis apa pun ke DB
//   --yes           lewati konfirmasi interaktif
//   --force         lewati gerbang pengaman "baris turun drastis"
//   --no-backup     lewati backup (hanya berlaku untuk mode upsert)
//
// DUA MODE
//   upsert  — tabel punya kunci alami di file (kd_rup, order_id, dst).
//             Alur: UPSERT semua baris baru -> hapus baris lama yang tidak ada
//             di file. Tabel tidak pernah kosong; kalau gagal di tengah, data
//             lama masih utuh.
//   replace — tabel tidak punya kunci alami di file (id-nya digenerate DB).
//             Alur: backup -> hapus semua -> insert. Ada jeda tabel kosong;
//             kalau insert gagal, isi lama dipulihkan otomatis dari backup.
//
// YANG TIDAK DILAKUKAN SCRIPT INI
//   Tidak mengubah/menormalisasi nilai apa pun. Nilai dari file dikirim apa
//   adanya; hanya key yang bukan kolom tabel yang ditolak (dan script berhenti,
//   bukan diam-diam membuang). Kolom yang punya default DB (id, created_at)
//   tidak pernah dikirim.
// ============================================================================

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPDATE_DIR = path.join(ROOT, 'data', 'data_update');
const BACKUP_DIR = path.join(ROOT, 'data', 'backup');

// keyCol = kunci alami yang ADA di file sumber (dipakai upsert + prune).
// idCol  = primary key tabel di DB (dipakai untuk order, delete-all, restore).
const TABLES = [
  { table: 'api_paket_penyedia_terumumkan', mode: 'upsert', keyCol: 'kd_rup', idCol: 'kd_rup' },
  { table: 'api_paket_swakelola_terumumkan', mode: 'upsert', keyCol: 'kd_rup', idCol: 'kd_rup' },
  { table: 'history_kaji_ulang', mode: 'replace', keyCol: null, idCol: 'id' },
  { table: 'paket_anggaran_penyedia', mode: 'upsert', keyCol: 'id_paket_anggaran_penyedia', idCol: 'id_paket_anggaran_penyedia' },
  { table: 'paket_anggaran_swakelola', mode: 'upsert', keyCol: 'id_paket_anggaran_swakelola', idCol: 'id_paket_anggaran_swakelola' },
  { table: 'paket_e_purchasing', mode: 'upsert', keyCol: 'order_id', idCol: 'order_id' },
  { table: 'pencatatan_non_tender_realisasi', mode: 'replace', keyCol: null, idCol: 'id' },
  { table: 'non_tender_selesai', mode: 'replace', keyCol: null, idCol: 'id' },
  { table: 'tender_selesai_nilai', mode: 'upsert', keyCol: 'kd_tender', idCol: 'kd_tender' },
  { table: 'data_afirmasi_pdn_perencanaan', mode: 'replace', keyCol: null, idCol: 'id' },
];

const CHUNK_WRITE = 500; // baris per request insert/upsert
const CHUNK_DELETE = 100; // nilai per request delete .in() — jaga panjang URL
const PAGE = 1000; // batas baris per request select PostgREST
const DROP_GUARD = 0.8; // batal kalau baris baru < 80% baris DB, kecuali --force

// ---------------------------------------------------------------- argumen CLI
const argv = process.argv.slice(2);
const flags = {
  all: argv.includes('--all'),
  dryRun: argv.includes('--dry-run'),
  yes: argv.includes('--yes'),
  force: argv.includes('--force'),
  noBackup: argv.includes('--no-backup'),
};
const wanted = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--table') {
    if (!argv[i + 1]) fail('--table butuh nama tabel');
    wanted.push(argv[++i]);
  }
}
if (!flags.all && wanted.length === 0) {
  console.log('Pilih tabel dengan --table <nama> atau proses semua dengan --all.\n');
  console.log('Tabel yang terdaftar:');
  for (const t of TABLES) console.log('  ' + t.table + '  (' + t.mode + ')');
  process.exit(1);
}
const targets = flags.all ? TABLES : wanted.map((name) => {
  const cfg = TABLES.find((t) => t.table === name);
  if (!cfg) fail('Tabel tidak dikenal: ' + name);
  return cfg;
});

// ------------------------------------------------------------------- supabase
const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^=#]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
// service_role dipakai kalau ada (mem-bypass RLS); kalau tidak, anon key —
// tabel-tabel ini saat ini memang masih bisa ditulis anon.
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) fail('NEXT_PUBLIC_SUPABASE_URL / KEY tidak ditemukan di .env.local');
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// --------------------------------------------------------------- util umum
function fail(msg) {
  console.error('\n[GAGAL] ' + msg + '\n');
  process.exit(1);
}

function rupiahless(n) {
  return n.toLocaleString('id-ID');
}

function chunked(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Daftar kolom tabel dibaca dari database.types.ts (hasil `supabase gen types`),
// jadi otomatis ikut kalau skema berubah dan tipe di-regenerate.
const typesSrc = fs
  .readFileSync(path.join(ROOT, 'database.types.ts'), 'utf8')
  .split(String.fromCharCode(13))
  .join('');

function columnsFromTypes(table) {
  const marker = '\n      ' + table + ': {\n        Row: {\n';
  const i = typesSrc.indexOf(marker);
  if (i < 0) return null;
  const from = i + marker.length;
  const j = typesSrc.indexOf('\n        }', from);
  return typesSrc
    .slice(from, j)
    .split('\n')
    .map((l) => l.trim().split(':')[0].replace(/^"/, '').replace(/"$/, ''))
    .filter(Boolean);
}

// Cek apakah sebuah kolom benar-benar ada di DB (dipakai untuk kolom yang sudah
// ditambah lewat migration tapi database.types.ts belum di-regenerate).
async function columnExists(table, col) {
  const { error } = await sb.from(table).select(col).limit(1);
  return !error;
}

// -------------------------------------------------------------- baca sumber
function findSourceFile(table) {
  const dir = path.join(UPDATE_DIR, table);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const json = files.find((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
  if (json) return { file: path.join(dir, json), kind: 'json' };
  const csv = files.find((f) => f.toLowerCase().endsWith('.csv'));
  if (csv) return { file: path.join(dir, csv), kind: 'csv' };
  return null;
}

// Parser CSV RFC4180 seadanya: cukup untuk file ekspor SIRUP (kutip ganda,
// escape "" di dalam kutip, newline di dalam kutip). Pemisah dideteksi otomatis
// karena ekspor INAPROC ada yang pakai koma dan ada yang pakai titik koma
// (mis. non-tender-selesai_2026.csv).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  const headerLine = src.slice(0, src.indexOf('\n') === -1 ? src.length : src.indexOf('\n'));
  const SEP = (headerLine.split(';').length > headerLine.split(',').length) ? ';' : ',';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === SEP) { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), r[idx] === '' || r[idx] === undefined ? null : r[idx]])));
}

function readSource(src) {
  const raw = fs.readFileSync(src.file, 'utf8');
  if (src.kind === 'json') {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) fail('File JSON bukan array: ' + src.file);
    return parsed;
  }
  return parseCsv(raw);
}

// ------------------------------------------------------- operasi baca ke DB
async function countRows(table) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error('count ' + table + ': ' + error.message);
  return count ?? 0;
}

async function fetchAll(table, select, orderCol) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error('select ' + table + ': ' + error.message);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

// --------------------------------------------------------------- validasi
async function validate(cfg) {
  const src = findSourceFile(cfg.table);
  if (!src) throw new Error('Tidak ada file JSON/CSV di data/data_update/' + cfg.table + '/');

  const rows = readSource(src);
  if (rows.length === 0) throw new Error('File sumber kosong: ' + src.file);

  const dbCols = columnsFromTypes(cfg.table);
  if (!dbCols) throw new Error('Tabel ' + cfg.table + ' tidak ditemukan di database.types.ts');

  // union key seluruh baris — API kadang menghilangkan field yang null
  const fileCols = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!fileCols.includes(k)) fileCols.push(k);

  const unknown = fileCols.filter((c) => !dbCols.includes(c));
  const lateCols = [];
  for (const c of unknown) {
    if (await columnExists(cfg.table, c)) lateCols.push(c);
  }
  const missingInDb = unknown.filter((c) => !lateCols.includes(c));
  if (missingInDb.length) {
    throw new Error(
      'Field berikut ada di file tapi tidak ada kolomnya di tabel ' + cfg.table + ': ' + missingInDb.join(', ') +
      '\n         Tambahkan kolomnya lewat migration di sql/migrations/, atau hapus field itu dari file sumber.'
    );
  }

  const allowed = fileCols.filter((c) => dbCols.includes(c) || lateCols.includes(c));
  const payload = rows.map((r) => {
    const o = {};
    for (const c of allowed) o[c] = r[c] ?? null; // undefined -> null; false/0/"" tetap
    return o;
  });

  // duplikat kunci alami akan menggagalkan upsert (ON CONFLICT dua kali sasaran sama)
  let dupKeys = [];
  if (cfg.keyCol) {
    const seen = new Map();
    for (const r of payload) {
      const k = r[cfg.keyCol];
      if (k === null || k === undefined) throw new Error(cfg.keyCol + ' null di file sumber ' + cfg.table);
      const s = String(k);
      seen.set(s, (seen.get(s) || 0) + 1);
    }
    dupKeys = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    if (dupKeys.length) {
      throw new Error('Kunci ' + cfg.keyCol + ' duplikat di file (' + dupKeys.length + '): ' + dupKeys.slice(0, 5).join(', '));
    }
  }

  const dbCount = await countRows(cfg.table);

  // hitung baris usang (ada di DB, tidak ada di file) untuk mode upsert
  let stale = [];
  if (cfg.keyCol) {
    const dbKeys = await fetchAll(cfg.table, cfg.keyCol, cfg.idCol);
    const fileKeys = new Set(payload.map((r) => String(r[cfg.keyCol])));
    stale = dbKeys.map((r) => r[cfg.keyCol]).filter((k) => !fileKeys.has(String(k)));
  }

  return { src, payload, allowed, lateCols, dbCount, stale };
}

// ------------------------------------------------------------------ backup
async function backup(cfg) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const rows = await fetchAll(cfg.table, '*', cfg.idCol);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, cfg.table + '_' + stamp + '.json');
  fs.writeFileSync(file, JSON.stringify(rows, null, 0));
  console.log('   backup  : ' + rupiahless(rows.length) + ' baris -> ' + path.relative(ROOT, file));
  return { file, rows };
}

// ------------------------------------------------------------------- tulis
async function writeChunks(table, rows, opts) {
  let done = 0;
  for (const chunk of chunked(rows, CHUNK_WRITE)) {
    const q = opts && opts.onConflict
      ? sb.from(table).upsert(chunk, { onConflict: opts.onConflict })
      : sb.from(table).insert(chunk);
    const { error } = await q;
    if (error) {
      const err = new Error(error.message + (error.details ? ' | ' + error.details : '') + ' [' + error.code + ']');
      err.doneRows = done;
      throw err;
    }
    done += chunk.length;
    process.stdout.write('\r   tulis   : ' + rupiahless(done) + '/' + rupiahless(rows.length) + ' baris');
  }
  process.stdout.write('\n');
}

async function deleteKeys(cfg, keys) {
  let done = 0;
  for (const chunk of chunked(keys, CHUNK_DELETE)) {
    const { error } = await sb.from(cfg.table).delete().in(cfg.keyCol, chunk);
    if (error) throw new Error('hapus baris usang: ' + error.message);
    done += chunk.length;
    process.stdout.write('\r   hapus   : ' + rupiahless(done) + '/' + rupiahless(keys.length) + ' baris usang');
  }
  if (keys.length) process.stdout.write('\n');
}

async function deleteAll(cfg) {
  const { error } = await sb.from(cfg.table).delete().not(cfg.idCol, 'is', null);
  if (error) throw new Error('hapus semua baris: ' + error.message);
  const left = await countRows(cfg.table);
  if (left !== 0) throw new Error('tabel masih berisi ' + left + ' baris setelah delete — dibatalkan');
}

// -------------------------------------------------------------- jalankan 1
async function run(cfg, v) {
  console.log('\n== ' + cfg.table + ' (' + cfg.mode + ') ==');
  let bak = null;

  if (cfg.mode === 'replace' || !flags.noBackup) bak = await backup(cfg);

  if (cfg.mode === 'upsert') {
    await writeChunks(cfg.table, v.payload, { onConflict: cfg.keyCol });
    await deleteKeys(cfg, v.stale);
  } else {
    await deleteAll(cfg);
    try {
      await writeChunks(cfg.table, v.payload);
    } catch (e) {
      console.error('\n   INSERT GAGAL: ' + e.message);
      console.error('   memulihkan ' + rupiahless(bak.rows.length) + ' baris dari backup...');
      // kolom id dilepas supaya DB men-generate ulang (sequence sudah maju)
      const restore = bak.rows.map((r) => {
        const o = { ...r };
        delete o[cfg.idCol];
        return o;
      });
      await deleteAll(cfg);
      await writeChunks(cfg.table, restore);
      console.error('   pulih. Isi tabel kembali seperti sebelum script jalan (kolom ' + cfg.idCol + ' bernilai baru).');
      throw e;
    }
  }

  const after = await countRows(cfg.table);
  const ok = after === v.payload.length;
  console.log('   hasil   : ' + rupiahless(v.dbCount) + ' -> ' + rupiahless(after) + ' baris ' + (ok ? '[OK]' : '[TIDAK COCOK, harusnya ' + rupiahless(v.payload.length) + ']'));
  return { table: cfg.table, before: v.dbCount, after, expected: v.payload.length, ok };
}

// ------------------------------------------------------------------- main
console.log('Supabase : ' + SUPABASE_URL);
console.log('Key      : ' + (env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'));
console.log('Mode     : ' + (flags.dryRun ? 'DRY RUN (tidak menulis apa pun)' : 'TULIS KE DATABASE'));

const plans = [];
const masalah = [];
for (const cfg of targets) {
  process.stdout.write('\nmemeriksa ' + cfg.table + ' ... ');
  let v;
  try {
    v = await validate(cfg);
  } catch (e) {
    console.log('GAGAL');
    console.log('   ' + e.message);
    masalah.push(cfg.table + ': ' + e.message);
    continue;
  }
  console.log('ok');
  console.log('   sumber  : ' + path.relative(ROOT, v.src.file) + ' (' + v.src.kind + ')');
  console.log('   kolom   : ' + v.allowed.length + ' kolom dipakai' + (v.lateCols.length ? ' (' + v.lateCols.join(', ') + ' ada di DB tapi belum di database.types.ts — regenerate tipe setelah ini)' : ''));
  console.log('   baris   : file ' + rupiahless(v.payload.length) + '  |  DB sekarang ' + rupiahless(v.dbCount) + '  |  selisih ' + (v.payload.length - v.dbCount >= 0 ? '+' : '') + rupiahless(v.payload.length - v.dbCount));
  if (cfg.keyCol) console.log('   usang   : ' + rupiahless(v.stale.length) + ' baris akan dihapus (' + cfg.keyCol + ': ' + (v.stale.slice(0, 5).join(', ') || '-') + (v.stale.length > 5 ? ', ...' : '') + ')');

  if (v.dbCount > 0 && v.payload.length < v.dbCount * DROP_GUARD && !flags.force) {
    const m = 'baris baru (' + v.payload.length + ') < ' + Math.round(DROP_GUARD * 100) + '% baris sekarang (' + v.dbCount + '). File sumber kemungkinan tidak lengkap. Kalau memang disengaja, ulangi dengan --force.';
    console.log('   TERTAHAN: ' + m);
    masalah.push(cfg.table + ': ' + m);
    continue;
  }
  plans.push({ cfg, v });
}

if (masalah.length) {
  console.log('\n=== TABEL YANG TIDAK LOLOS PEMERIKSAAN (' + masalah.length + ') ===');
  for (const m of masalah) console.log('  - ' + m);
  fail('Tidak ada yang ditulis ke database. Bereskan dulu masalah di atas, atau jalankan hanya tabel yang lolos dengan --table.');
}

if (flags.dryRun) {
  console.log('\nDRY RUN selesai. Tidak ada perubahan di database.');
  process.exit(0);
}

if (!flags.yes && process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const jawab = await new Promise((res) => rl.question('\nLanjut menulis ke database? ketik "ya": ', res));
  rl.close();
  if (jawab.trim().toLowerCase() !== 'ya') fail('Dibatalkan.');
}

const hasil = [];
for (const { cfg, v } of plans) {
  hasil.push(await run(cfg, v));
}

console.log('\n=== RINGKASAN ===');
for (const h of hasil) {
  console.log((h.ok ? '[OK]  ' : '[BEDA]') + ' ' + h.table.padEnd(34) + rupiahless(h.before) + ' -> ' + rupiahless(h.after));
}
const gagal = hasil.filter((h) => !h.ok);
console.log(gagal.length ? '\n' + gagal.length + ' tabel jumlah barisnya tidak sesuai file. Periksa manual.' : '\nSemua tabel sesuai jumlah baris file sumber.');
process.exit(gagal.length ? 1 : 0);
