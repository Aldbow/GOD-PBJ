// Upload data/csv/master_data_pn_rows*.csv atau data/csv/master_data_ro_rows*.csv
// ke Supabase langsung lewat API — dipakai sebagai pengganti import CSV manual
// di Supabase Table Editor, yang MENOLAK file ini karena Table Editor mensyaratkan
// header CSV sama persis dengan nama kolom tabel (tidak ada mode "petakan manual").
// Header di CSV sumber pakai label Indonesia berspasi ("Kode RO", "% Capaian
// Anggaran", dst), bukan snake_case, jadi Table Editor selalu menolaknya duluan
// sebelum sempat menawarkan pemetaan kolom.
//
// Pemakaian:
//   node scripts/import_master_data_pn_ro.mjs pn "data/csv/master_data_pn_rows (1).csv"
//   node scripts/import_master_data_pn_ro.mjs ro "data/csv/master_data_ro_rows (1).csv"
//
// Untuk tabel "ro": jalankan dulu sql/migrations/66_alter_master_data_ro_kolom_realisasi.sql
// (menambah kolom jenis_pengadaan/lokasi/waktu_pengadaan/kendala/mitigasi/realisasi
// yang belum ada di tabel, tapi sudah ada di CSV sumber).

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

// Kolom "id" CSV sengaja TIDAK dipetakan ke mana pun di kedua map di bawah —
// nilainya (UUID acak di pn, angka spreadsheet biasa di ro) bukan sesuatu yang
// perlu dipertahankan; biarkan Postgres generate id barunya sendiri (default).
const COLUMN_MAP = {
  pn: {
    table: 'master_data_pn',
    headers: {
      No: 'no',
      Unit: 'unit',
      'Kode RO': 'kode_ro',
      'Nama RO': 'nama_ro',
      Satuan: 'satuan',
      'Target Volume (Capaian)': 'target_volume',
      'Pagu (Capaian)': 'pagu',
      'Realisasi Anggaran': 'realisasi_anggaran',
      'Realisasi Volume': 'realisasi_volume',
      '% Capaian Anggaran': 'capaian_anggaran_pct',
      '% Capaian Fisik/Volume': 'capaian_fisik_pct',
      'Selisih Pagu': 'selisih_pagu',
      Status: 'status',
    },
  },
  ro: {
    table: 'master_data_ro',
    headers: {
      No: 'no',
      'Kode/ID paket': 'kd_rup',
      'Nama paket': 'nama_paket',
      'Jenis Pengadaan (barang/jasa/konstruksi/lainnya)': 'jenis_pengadaan',
      'Nilai Paket (Rp)': 'nilai_paket',
      Lokasi: 'lokasi',
      'Waktu pengadaan (bulan/triwulan)': 'waktu_pengadaan',
      'Skema (tender/e-purchasing/katalog/lainnya)': 'skema',
      Kendala: 'kendala',
      Mitigasi: 'mitigasi',
      RO: 'nama_ro',
      REALISASI: 'realisasi',
    },
  },
};

// Parser CSV kecil (tanpa dependency papaparse — proyek ini punya papaparse di
// import-csv.mjs tapi paketnya TIDAK terpasang di node_modules, jadi dihindari
// di sini). Menangani field berkutip yang berisi koma/baris baru, dan quote
// ganda "" sebagai escape tanda kutip literal.
// Sumber CSV proyek ini konsisten pakai ';' sebagai pemisah (lihat catatan di
// sql/migrations/25_IMPORT_DATA_CSV.sql), bukan ',' — walau field bisa berisi
// koma literal (mis. "DKI Jakarta, Jakarta Selatan (Kota)") tanpa perlu dikutip.
function parseCsv(text, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushField();
    } else if (c === '\r') {
      // skip, \n berikutnya yang menutup baris
    } else if (c === '\n') {
      pushRow();
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

const [, , kind, csvPath, flag] = process.argv;
const config = COLUMN_MAP[kind];
if (!config || !csvPath) {
  console.error('Pemakaian: node scripts/import_master_data_pn_ro.mjs <pn|ro> <path-csv> [--dry-run]');
  process.exit(1);
}
const dryRun = flag === '--dry-run';

const text = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(text);
const csvHeaders = rows[0];
const dataRows = rows.slice(1);

const unmapped = csvHeaders.filter((h) => h !== 'id' && !config.headers[h]);
if (unmapped.length > 0) {
  console.error(`Header CSV tidak dikenali (perlu ditambahkan ke COLUMN_MAP): ${JSON.stringify(unmapped)}`);
  process.exit(1);
}

const records = dataRows.map((cols) => {
  const rec = {};
  csvHeaders.forEach((h, idx) => {
    if (h === 'id') return; // biarkan Postgres generate id sendiri
    const dbCol = config.headers[h];
    const value = cols[idx];
    rec[dbCol] = value === '' ? null : value;
  });
  return rec;
});

console.log(`Membaca ${records.length} baris dari ${csvPath} -> tabel ${config.table}...`);

if (dryRun) {
  console.log('--dry-run: tidak mengirim apapun ke Supabase. Contoh 2 baris pertama setelah dipetakan:');
  console.log(JSON.stringify(records.slice(0, 2), null, 2));
  process.exit(0);
}

const chunkSize = 500;
let totalInserted = 0;
for (let i = 0; i < records.length; i += chunkSize) {
  const chunk = records.slice(i, i + chunkSize);
  const { error, count } = await supabase.from(config.table).insert(chunk, { count: 'exact' });
  if (error) {
    console.error(`Gagal upload baris ${i + 1}-${i + chunk.length}:`, error.message);
    process.exit(1);
  }
  totalInserted += count ?? chunk.length;
  console.log(`  -> baris ${i + 1}-${i + chunk.length} tersimpan.`);
}

console.log(`Selesai. Total ${totalInserted} baris masuk ke ${config.table}.`);
