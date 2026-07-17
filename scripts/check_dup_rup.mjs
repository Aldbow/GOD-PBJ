import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([^=#]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});
const sb = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

const ppk = 'A**** A***, S.P*';
const { data, error } = await sb.from('view_dashboard_gabungan_satker')
  .select('kd_rup, total').eq('nama_ppk', ppk);
if (error) { console.error(error); process.exit(1); }

// hitung duplikat mentah
const counts = {};
data.forEach(r => { counts[r.kd_rup] = (counts[r.kd_rup] || 0) + 1; });
const dups = Object.entries(counts).filter(([, c]) => c > 1);
console.log(`PPK "${ppk}"`);
console.log(`Total baris mentah      : ${data.length}`);
console.log(`kd_rup unik             : ${Object.keys(counts).length}`);
console.log(`kd_rup yang kembar      : ${dups.length}  ${dups.length ? JSON.stringify(dups) : ''}`);

// simulasikan agregasi API
const byRup = new Map();
for (const row of data) {
  const k = String(row.kd_rup);
  if (byRup.has(k)) byRup.get(k).total += Number(row.total) || 0;
  else byRup.set(k, { total: Number(row.total) || 0 });
}
const keys = Array.from(byRup.keys());
console.log(`Setelah agregasi API    : ${keys.length} paket, duplikat = ${keys.length - new Set(keys).size}`);
