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

async function fetchAllIds(table, col) {
  const ids = new Set();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await sb.from(table).select(col).range(offset, offset + limit - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) ids.add(String(row[col]));
    if (data.length < limit) break;
    offset += limit;
  }
  return ids;
}

// Kode RUP lama yang sudah direvisi ke kode lain (kd_rup_lama <> kd_rup_baru) sengaja
// dikecualikan dari risiko_pengadaan (lihat src/lib/risiko/kajiUlangExclusion.ts). history_kaji_ulang
// berisi riwayat SEMUA revisi lintas tahun (~1.500+ baris) — sebagian besar kd_rup_lama-nya
// sudah tidak ada lagi di tabel master terumumkan sekarang untuk alasan lain (bukan exclusion
// ini). Jadi yang relevan HANYA irisan-nya dengan master saat ini, bukan raw count kaji_ulang.
async function fetchRevisedOldKdRupSet() {
  const excluded = new Set();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await sb.from('history_kaji_ulang').select('kd_rup_lama, kd_rup_baru').range(offset, offset + limit - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.kd_rup_lama != null && row.kd_rup_baru != null && String(row.kd_rup_lama) !== String(row.kd_rup_baru)) {
        excluded.add(String(row.kd_rup_lama));
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return excluded;
}

async function main() {
  const [masterPenyediaIds, masterSwakelolaIds, revisedOldKdRup] = await Promise.all([
    fetchAllIds('api_paket_penyedia_terumumkan', 'kd_rup'),
    fetchAllIds('api_paket_swakelola_terumumkan', 'kd_rup'),
    fetchRevisedOldKdRupSet(),
  ]);
  const masterPenyediaCount = masterPenyediaIds.size;
  const masterSwakelolaCount = masterSwakelolaIds.size;
  const masterCount = masterPenyediaCount + masterSwakelolaCount;
  const { count: riskCount } = await sb.from('risiko_pengadaan').select('*', { count: 'exact', head: true });

  // Hanya kd_rup_lama yang MASIH ada di master saat ini yang relevan sebagai exclusion.
  const excludedInPenyedia = [...masterPenyediaIds].filter((k) => revisedOldKdRup.has(k)).length;
  const excludedInSwakelola = [...masterSwakelolaIds].filter((k) => revisedOldKdRup.has(k)).length;
  const expectedCount = masterCount - excludedInPenyedia - excludedInSwakelola;

  console.log(`Master Penyedia (api_paket_penyedia_terumumkan): ${masterPenyediaCount} baris`);
  console.log(`Master Swakelola (api_paket_swakelola_terumumkan): ${masterSwakelolaCount} baris`);
  console.log(`Total master: ${masterCount} baris`);
  console.log(`RUP lama-yang-masih-ada-di-master (dikecualikan, lihat kajiUlangExclusion.ts): Penyedia ${excludedInPenyedia}, Swakelola ${excludedInSwakelola}`);
  console.log(`Total master setelah exclusion (angka target risiko_pengadaan): ${expectedCount} baris`);
  console.log(`risiko_pengadaan terisi: ${riskCount} baris`);
  if ((riskCount ?? 0) < expectedCount) {
    console.log(`-> Belum lengkap, sisa ${expectedCount - (riskCount ?? 0)} paket (klik "Hitung Ulang" lagi sampai remaining=0 di kedua endpoint).`);
  } else if ((riskCount ?? 0) > expectedCount) {
    console.log(`-> Lebih banyak dari target (${(riskCount ?? 0) - expectedCount} baris) — kemungkinan ada orphan/RUP revisi yang belum dibersihkan, jalankan "Hitung Ulang" lagi (recalculate men-jalankan prune di awal setiap siklus offset=0).`);
  } else {
    console.log('-> Lengkap dan konsisten dengan master data + exclusion revisi.');
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
