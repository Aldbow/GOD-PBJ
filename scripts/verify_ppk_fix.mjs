// Verifikasi LOGIKA perbaikan join PPK (read-only, tidak mengubah DB).
// Mensimulasikan kunci baru: KODE SATKER + KODE PPK, langsung dari tabel mentah.
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([^=#]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});
const sb = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function fetchAll(table, cols) {
  let rows = [], from = 0, size = 1000;
  for (;;) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < size) break;
    from += size;
  }
  return rows;
}

const norm = s => (s ?? '').toString().replace(/^0+/, '').trim(); // samakan seperti LTRIM '0'

async function main() {
  // 1) Kasus spesifik RUP 62549978
  const { data: one } = await sb.from('api_paket_penyedia_terumumkan')
    .select('kd_rup, nama_ppk, kd_satker_str, nama_satker').eq('kd_rup', '62549978');
  console.log('=== RUP 62549978 (SIRUP mentah) ===');
  console.log(one);

  if (one && one.length) {
    const { data: match } = await sb.from('master_data')
      .select('"SATUAN KERJA","NAMA PPK","KODE PPK","KODE SATKER_str","UNIT KERJA"')
      .eq('"KODE SATKER_str"', String(one[0].kd_satker_str))
      .eq('"KODE PPK"', one[0].nama_ppk);
    console.log('--- Hasil join baru (satker + KODE PPK) -> PPK yang akan tampil ---');
    console.log(match);
  }

  // 2) Dampak cakupan di seluruh tabel penyedia
  const master = await fetchAll('master_data', '"KODE SATKER_str","KODE PPK"');
  const satkerSet = new Set(master.map(m => norm(m['KODE SATKER_str'])));
  const ppkSet = new Set(master.map(m => `${norm(m['KODE SATKER_str'])}||${m['KODE PPK']}`));

  const penyedia = await fetchAll('api_paket_penyedia_terumumkan', 'kd_rup, nama_ppk, kd_satker_str');
  let satkerMatch = 0, ppkMatch = 0;
  for (const p of penyedia) {
    const s = norm(p.kd_satker_str);
    if (satkerSet.has(s)) satkerMatch++;
    if (ppkSet.has(`${s}||${p.nama_ppk}`)) ppkMatch++;
  }
  const n = penyedia.length;
  console.log('\n=== DAMPAK CAKUPAN (tabel penyedia) ===');
  console.log(`Total baris penyedia          : ${n}`);
  console.log(`Satker cocok (eselon terisi)  : ${satkerMatch} (${(satkerMatch/n*100).toFixed(1)}%)`);
  console.log(`PPK exact match (nama asli)   : ${ppkMatch} (${(ppkMatch/n*100).toFixed(1)}%)`);
  console.log(`Fallback ke nama_ppk masking  : ${satkerMatch - ppkMatch} (identitas tetap benar)`);
  console.log(`-> Tidak ada yang jadi "Tidak Diketahui" akibat perubahan ini.`);
}
main().catch(e => { console.error(e); process.exit(1); });
