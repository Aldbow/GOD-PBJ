import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function fetchAll(table, select) {
  let all = [], offset = 0, limit = 1000;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + limit - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

function summarize(label, rows, keyFn) {
  const groups = {};
  for (const r of rows) {
    const k = keyFn(r);
    groups[k] = groups[k] || { count: 0, total: 0 };
    groups[k].count++;
    groups[k].total += Number(r.total) || 0;
  }
  console.log(`\n### ${label} — ${rows.length} paket`);
  Object.entries(groups)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([k, v]) => console.log(`  ${String(v.count).padStart(4)}  ${k}   (Rp ${v.total.toLocaleString('id-ID')})`));
}

const ep = await fetchAll('view_dashboard_epurchasing_v6',
  'kd_rup,satker,eselon1,nama_ppk,status,total,is_from_sirup');

const unkSatker = ep.filter((r) => r.satker === 'Tidak Diketahui');
const unkEselon = ep.filter((r) => r.eselon1 === 'Tidak Diketahui');

console.log('==================================================================');
console.log('DIAGNOSA E-PURCHASING');
console.log('==================================================================');
console.log(`Total paket E-Purchasing        : ${ep.length}`);
console.log(`satker  = 'Tidak Diketahui'     : ${unkSatker.length}`);
console.log(`eselon1 = 'Tidak Diketahui'     : ${unkEselon.length}`);

summarize("Unknown SATKER — breakdown by is_from_sirup", unkSatker,
  (r) => `is_from_sirup=${r.is_from_sirup}  eselon1=[${r.eselon1}]`);
summarize("Unknown ESELON1 — breakdown by is_from_sirup", unkEselon,
  (r) => `is_from_sirup=${r.is_from_sirup}  satker=[${r.satker}]`);

console.log('\n--- Contoh 15 baris unknown SATKER ---');
unkSatker.slice(0, 15).forEach((r) =>
  console.log(`  kd_rup=${r.kd_rup} sirup=${r.is_from_sirup} ppk=[${r.nama_ppk}] eselon1=[${r.eselon1}] status=${r.status}`));

// Cek juga gabungan (semua metode) utk satker unknown
try {
  const gab = await fetchAll('view_dashboard_gabungan_satker', 'kd_rup,satker,metode_pengadaan,total');
  const gunk = gab.filter((r) => r.satker === 'Tidak Diketahui' || r.satker === 'Satker Tidak Diketahui');
  console.log('\n==================================================================');
  console.log(`GABUNGAN SATKER — total ${gab.length}, unknown satker ${gunk.length}`);
  summarize("Unknown SATKER per METODE (gabungan)", gunk, (r) => r.metode_pengadaan);
} catch (e) {
  console.log('\n(gabungan tidak terbaca:', e.message, ')');
}
