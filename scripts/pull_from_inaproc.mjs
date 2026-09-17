// ============================================================================
// Tarik langsung dari API INAPROC -> data/data_update/<nama_tabel>/
// ----------------------------------------------------------------------------
// Pengganti alur "web-app pull:v1 -> sync_from_inaproc.mjs" untuk 10 dari 11
// tabel yang punya endpoint v1 (lihat ENDPOINTS di bawah): script ini memanggil
// data.inaproc.id langsung dan menulis hasilnya ke folder yang sama yang dibaca
// scripts/update_from_data_update.mjs, tanpa perlu tarikan lokal web-app di
// komputer ini.
//
// PEMAKAIAN
//   node scripts/pull_from_inaproc.mjs                        semua 10 tabel, tahun berjalan
//   node scripts/pull_from_inaproc.mjs --year 2026
//   node scripts/pull_from_inaproc.mjs --table non_tender_selesai
//   node scripts/pull_from_inaproc.mjs --dry-run
//
// FLAG
//   --year <YYYY>   tahun yang diminta ke API (default: tahun berjalan)
//   --table <nama>  tarik satu tabel saja (boleh diulang)
//   --dry-run       tarik dan laporkan saja, tidak ada file yang ditulis
//
// KREDENSIAL (.env.local, lihat .env.example)
//   JWT_TOKEN               wajib -- token Bearer LKPP, sama seperti punya web-app
//   INAPROC_KODE_KLPD       opsional, default K34
//   INAPROC_API_BASE_URL    opsional, default https://data.inaproc.id/api
//
// TABEL YANG TIDAK DICAKUP
//   data_afirmasi_pdn_perencanaan -- tidak ada endpoint v1 untuk data ini
//   (dashboard/afirmasi BUKAN sumber yang sama -- lihat runbook §4). Folder
//   data/data_update/data_afirmasi_pdn_perencanaan/ tidak pernah disentuh
//   script ini; user mengisinya manual.
//
// KEGAGALAN SATU TABEL
//   File lama tabel itu TIDAK ditimpa (supaya update_from_data_update.mjs tidak
//   menulis campuran data baru+basi ke Supabase), script lanjut menarik tabel
//   lain, tapi exit code di akhir tetap 1 kalau ada yang gagal -- orkestrator
//   (scripts/refresh_data.mjs --live) berhenti sebelum menyentuh Supabase.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPDATE_DIR = path.join(ROOT, 'data', 'data_update');

const BATCH_SIZE = 100;
const INTER_PAGE_DELAY_MS = 200; // jeda sopan antar-halaman, sama seperti web-app/scripts/pull-v1-all.ts
const INTER_TABLE_DELAY_MS = 300;
const MAX_PAGES_SAFETY_VALVE = 20_000; // jaga-jaga kalau loop upstream rusak, bukan batas normal

// stem sengaja sama dengan SOURCES di scripts/sync_from_inaproc.mjs, supaya nama file
// yang dihasilkan konsisten dengan yang sudah ada di repo kalau dibandingkan manual.
const ENDPOINTS = [
  { table: 'api_paket_penyedia_terumumkan', endpoint: '/v1/rup/paket-penyedia-terumumkan', stem: 'paket-penyedia-terumumkan' },
  { table: 'api_paket_swakelola_terumumkan', endpoint: '/v1/rup/paket-swakelola-terumumkan', stem: 'paket-swakelola-terumumkan' },
  { table: 'history_kaji_ulang', endpoint: '/v1/rup/history-kaji-ulang', stem: 'history-kaji-ulang' },
  { table: 'paket_anggaran_penyedia', endpoint: '/v1/rup/paket-anggaran-penyedia', stem: 'paket-anggaran-penyedia' },
  { table: 'paket_anggaran_swakelola', endpoint: '/v1/rup/paket-anggaran-swakelola', stem: 'paket-anggaran-swakelola' },
  { table: 'paket_e_purchasing', endpoint: '/v1/ekatalog/paket-e-purchasing', stem: 'paket-e-purchasing' },
  { table: 'pencatatan_non_tender', endpoint: '/v1/tender/pencatatan-non-tender', stem: 'pencatatan-non-tender' },
  { table: 'pencatatan_non_tender_realisasi', endpoint: '/v1/tender/pencatatan-non-tender-realisasi', stem: 'pencatatan-non-tender-realisasi' },
  { table: 'non_tender_selesai', endpoint: '/v1/tender/non-tender-selesai', stem: 'non-tender-selesai' },
  { table: 'tender_selesai_nilai', endpoint: '/v1/tender/tender-selesai-nilai', stem: 'tender-selesai-nilai' },
];

// ---------------------------------------------------------------- argumen CLI
const argv = process.argv.slice(2);
function fail(msg) {
  console.error('\n[GAGAL] ' + msg + '\n');
  process.exit(1);
}

let year = String(new Date().getFullYear());
const wanted = [];
let dryRun = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--year') {
    if (!argv[i + 1]) fail('--year butuh nilai, mis. --year 2026');
    year = argv[++i];
  } else if (argv[i] === '--table') {
    if (!argv[i + 1]) fail('--table butuh nama tabel');
    wanted.push(argv[++i]);
  } else if (argv[i] === '--dry-run') {
    dryRun = true;
  }
}
if (!/^\d{4}$/.test(year)) fail('--year harus 4 digit, dapat: ' + year);

const targets = wanted.length
  ? wanted.map((name) => {
      const cfg = ENDPOINTS.find((e) => e.table === name);
      if (!cfg) fail('Tabel tidak dikenal (atau tidak punya endpoint v1): ' + name);
      return cfg;
    })
  : ENDPOINTS;

// ------------------------------------------------------------------- env
function readEnvLocal() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^([^=#]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* tidak ada .env.local -- ditangkap di bawah lewat cek JWT_TOKEN kosong */
  }
  return out;
}
const envLocal = readEnvLocal();
const JWT_TOKEN = process.env.JWT_TOKEN || envLocal.JWT_TOKEN;
const KODE_KLPD = process.env.INAPROC_KODE_KLPD || envLocal.INAPROC_KODE_KLPD || 'K34';
const API_BASE_URL = (process.env.INAPROC_API_BASE_URL || envLocal.INAPROC_API_BASE_URL || 'https://data.inaproc.id/api').replace(/\/+$/, '');

if (!JWT_TOKEN) {
  fail(
    'JWT_TOKEN tidak ditemukan di .env.local.\n' +
      '         Salin dari .env.example, isi JWT_TOKEN dengan token LKPP yang sama\n' +
      '         seperti dipakai web-app.'
  );
}

// --------------------------------------------------------------- util umum
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function rupiahless(n) {
  return n.toLocaleString('id-ID');
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ------------------------------------------------------------ klien HTTP
// Pola sama seperti web-app/src/lib/inaproc-client.ts: retry dengan backoff untuk
// status transient, timeout per percobaan, Bearer token di header.
const RETRY = { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10_000, timeoutMs: 30_000 };
const RETRIABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 0; attempt < RETRY.maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(RETRY.initialDelayMs * 2 ** (attempt - 1), RETRY.maxDelayMs);
      await sleep(delay);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RETRY.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + JWT_TOKEN, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (RETRIABLE_STATUSES.has(response.status)) {
        lastError = new Error('Upstream mengembalikan status ' + response.status);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Permintaan ke upstream gagal');
}

function buildUrl(endpoint, { cursor, limit }) {
  const query = new URLSearchParams();
  query.set('tahun', year);
  query.set('kode_klpd', KODE_KLPD);
  if (limit) query.set('limit', String(limit));
  if (cursor) query.set('cursor', cursor);
  return API_BASE_URL + endpoint + '?' + query.toString();
}

// Menormalisasi envelope respons INAPROC -- porting ringkas dari
// web-app/src/lib/response-adapter.ts, dipangkas ke bentuk yang benar-benar dipakai
// 10 endpoint v1Dataset di atas ({ data: [...], meta: { cursor, has_more } }, kadang
// 'rs' sebagai alias 'data', dan { success:false, error } untuk penolakan bisnis).
function adaptResponse(payload) {
  if (Array.isArray(payload)) return { rows: payload.filter(isPlainObject), cursor: null, hasMore: false, apiError: null };
  if (!isPlainObject(payload)) return { rows: [], cursor: null, hasMore: false, apiError: null };

  if (payload.success === false) {
    const err = isPlainObject(payload.error) ? payload.error : {};
    return {
      rows: [],
      cursor: null,
      hasMore: false,
      apiError: { code: err.code || 'unknown', message: err.message || 'Permintaan ditolak API' },
    };
  }

  const meta = isPlainObject(payload.meta) ? payload.meta : null;
  const cursorRaw = payload.cursor ?? meta?.cursor;
  const cursor = typeof cursorRaw === 'string' && cursorRaw.length > 0 ? cursorRaw : null;
  const hasMoreFlag = typeof meta?.has_more === 'boolean' ? meta.has_more : payload.has_more;
  const hasMore = cursor ? (typeof hasMoreFlag === 'boolean' ? hasMoreFlag : true) : false;

  const container = payload.data ?? payload.rs;
  const rows = Array.isArray(container) ? container.filter(isPlainObject) : [];
  return { rows, cursor, hasMore, apiError: null };
}

// -------------------------------------------------------------- tarik 1 tabel
async function pullTable(entry) {
  const rows = [];
  let cursor = null;
  let pages = 0;

  while (pages < MAX_PAGES_SAFETY_VALVE) {
    const url = buildUrl(entry.endpoint, { cursor, limit: BATCH_SIZE });
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error('HTTP ' + response.status + (detail ? ': ' + detail.slice(0, 200) : ''));
    }
    const payload = await response.json();
    const page = adaptResponse(payload);
    if (page.apiError) throw new Error('API menolak (' + page.apiError.code + '): ' + page.apiError.message);

    rows.push(...page.rows);
    pages++;

    if (!page.hasMore || page.rows.length === 0) break;
    cursor = page.cursor;
    await sleep(INTER_PAGE_DELAY_MS);
  }

  return { rows, pages };
}

// ------------------------------------------------------------- tulis ke disk
function writeTableFiles(entry, rows) {
  const dir = path.join(UPDATE_DIR, entry.table);
  fs.mkdirSync(dir, { recursive: true });

  const stemTagged = entry.stem + '_' + year;
  const jsonName = stemTagged + '.json';
  const metaName = stemTagged + '.meta.json';

  // Buang file lama di folder ini (json/csv/xlsx/meta) supaya findSourceFile() di
  // update_from_data_update.mjs tidak salah pilih tarikan basi kalau tahun berganti --
  // sama seperti prune yang dilakukan scripts/sync_from_inaproc.mjs.
  for (const name of fs.readdirSync(dir)) {
    if (name === jsonName || name === metaName) continue;
    fs.rmSync(path.join(dir, name));
  }

  fs.writeFileSync(path.join(dir, jsonName), JSON.stringify(rows));
  fs.writeFileSync(
    path.join(dir, metaName),
    JSON.stringify({ lastUpdated: new Date().toISOString(), rowCount: rows.length, endpoint: entry.endpoint, tahun: year }, null, 2)
  );
}

// ------------------------------------------------------------------- main
console.log('Sumber   : ' + API_BASE_URL + ' (kode_klpd=' + KODE_KLPD + ', tahun=' + year + ')');
console.log('Tujuan   : ' + UPDATE_DIR + (dryRun ? ' (DRY RUN, tidak ada file yang ditulis)' : ''));
console.log('Tabel    : ' + targets.length + '\n');

const hasil = [];
for (const [i, entry] of targets.entries()) {
  process.stdout.write('[' + (i + 1) + '/' + targets.length + '] ' + entry.table + ' ... ');
  try {
    const { rows, pages } = await pullTable(entry);
    if (!dryRun) writeTableFiles(entry, rows);
    console.log(rupiahless(rows.length) + ' baris (' + pages + ' halaman)' + (dryRun ? ' -- tidak ditulis' : ''));
    hasil.push({ table: entry.table, ok: true, rows: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('GAGAL -- ' + message);
    console.log('         file lama tabel ini TIDAK ditimpa.');
    hasil.push({ table: entry.table, ok: false, error: message });
  }
  if (i < targets.length - 1) await sleep(INTER_TABLE_DELAY_MS);
}

const gagal = hasil.filter((h) => !h.ok);
console.log('\n=== RINGKASAN TARIKAN ===');
for (const h of hasil) {
  console.log((h.ok ? '[OK]  ' : '[GAGAL]') + ' ' + h.table.padEnd(34) + (h.ok ? rupiahless(h.rows) + ' baris' : h.error));
}

if (gagal.length) {
  console.log(
    '\n' + gagal.length + ' dari ' + targets.length + ' tabel gagal ditarik. TIDAK lanjut ke Supabase --' +
      ' jalankan ulang setelah masalah di atas beres (file tabel yang gagal masih yang lama).'
  );
  process.exit(1);
}

console.log('\nSemua tabel berhasil ditarik. Lanjut ke pemeriksaan + update Supabase.');
