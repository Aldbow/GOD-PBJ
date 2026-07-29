// Verifikasi (read-only, live DB) hasil kalkulasi risiko_pengadaan setelah menjalankan
// POST /api/risiko/recalculate/{penyedia,swakelola}. Jalankan setelah proses "Hitung Ulang" selesai.
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach((l) => {
  const m = l.match(/^([^=#]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});
const sb = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function main() {
  const { count: masterPenyediaCount } = await sb.from('api_paket_penyedia_terumumkan').select('*', { count: 'exact', head: true });
  const { count: masterSwakelolaCount } = await sb.from('api_paket_swakelola_terumumkan').select('*', { count: 'exact', head: true });
  const masterCount = (masterPenyediaCount ?? 0) + (masterSwakelolaCount ?? 0);
  const { count: riskCount } = await sb.from('risiko_pengadaan').select('*', { count: 'exact', head: true });
  console.log(`Master Penyedia (api_paket_penyedia_terumumkan): ${masterPenyediaCount} baris`);
  console.log(`Master Swakelola (api_paket_swakelola_terumumkan): ${masterSwakelolaCount} baris`);
  console.log(`Total master: ${masterCount} baris`);
  console.log(`risiko_pengadaan terisi: ${riskCount} baris`);
  if ((riskCount ?? 0) < masterCount) {
    console.log(`-> Belum lengkap, sisa ${masterCount - (riskCount ?? 0)} paket (klik "Hitung Ulang" lagi sampai remaining=0 di kedua endpoint).`);
  }

  console.log('\n=== Per jenis paket ===');
  for (const jenis of ['Penyedia', 'Swakelola']) {
    const { count } = await sb.from('risiko_pengadaan').select('*', { count: 'exact', head: true }).eq('jenis_paket', jenis);
    console.log(`  ${jenis}: ${count}`);
  }

  console.log('\n=== Distribusi kategori ===');
  for (const kategori of ['RENDAH', 'SEDANG', 'TINGGI', 'DATA_TIDAK_LENGKAP']) {
    const { count } = await sb.from('risiko_pengadaan').select('*', { count: 'exact', head: true }).eq('kategori', kategori);
    console.log(`  ${kategori}: ${count}`);
  }

  console.log('\n=== Sanity check: DATA_TIDAK_LENGKAP tidak boleh punya total_score terisi ===');
  const { data: badRows } = await sb.from('risiko_pengadaan').select('kd_rup, total_score').eq('kategori', 'DATA_TIDAK_LENGKAP').not('total_score', 'is', null).limit(5);
  console.log(badRows && badRows.length > 0 ? `GAGAL: ${badRows.length} baris DATA_TIDAK_LENGKAP punya total_score terisi` : 'OK: tidak ada.');

  console.log('\n=== Sanity check: RENDAH/SEDANG/TINGGI tidak boleh punya total_score null ===');
  const { data: badRows2 } = await sb.from('risiko_pengadaan').select('kd_rup, total_score').in('kategori', ['RENDAH', 'SEDANG', 'TINGGI']).is('total_score', null).limit(5);
  console.log(badRows2 && badRows2.length > 0 ? `GAGAL: ${badRows2.length} baris berkategori tapi total_score null` : 'OK: tidak ada.');

  console.log('\n=== Sampel 3 baris Penyedia (untuk eyeball manual) ===');
  const { data: sampleP } = await sb
    .from('risiko_pengadaan')
    .select('kd_rup, nama_paket, pagu, metode_pengadaan, total_score, max_score, kategori, execution_status, jumlah_revisi, data_quality_flags')
    .eq('jenis_paket', 'Penyedia')
    .order('total_score', { ascending: false, nullsFirst: false })
    .limit(3);
  console.log(sampleP);

  console.log('\n=== Sampel 3 baris Swakelola (untuk eyeball manual) ===');
  const { data: sampleS } = await sb
    .from('risiko_pengadaan')
    .select('kd_rup, nama_paket, pagu, tipe_swakelola, total_score, max_score, kategori, execution_status, jumlah_revisi, data_quality_flags')
    .eq('jenis_paket', 'Swakelola')
    .order('total_score', { ascending: false, nullsFirst: false })
    .limit(3);
  console.log(sampleS);

  console.log('\n=== Sanity check Swakelola: metode/jenis/sumber_dana harus NULL (Tidak Berlaku, bukan 0) ===');
  const { data: badSwakelola } = await sb
    .from('risiko_pengadaan')
    .select('kd_rup, metode_pengadaan, jenis_pengadaan, sumber_dana')
    .eq('jenis_paket', 'Swakelola')
    .or('metode_pengadaan.not.is.null,jenis_pengadaan.not.is.null,sumber_dana.not.is.null')
    .limit(5);
  console.log(badSwakelola && badSwakelola.length > 0 ? `GAGAL: ${badSwakelola.length} baris Swakelola punya metode/jenis/sumber_dana terisi` : 'OK: tidak ada.');

  console.log('\n=== Distribusi status pelaksanaan ===');
  for (const status of ['SUDAH_DILAKSANAKAN', 'BELUM_DILAKSANAKAN', 'TIDAK_DAPAT_DITENTUKAN']) {
    const { count } = await sb.from('risiko_pengadaan').select('*', { count: 'exact', head: true }).eq('execution_status', status);
    console.log(`  ${status}: ${count}`);
  }
}

main().catch((e) => {
  console.error('Gagal verifikasi:', e.message);
  process.exit(1);
});
