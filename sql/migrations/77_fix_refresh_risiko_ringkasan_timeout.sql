-- ============================================================================
-- FIX: refresh_risiko_ringkasan() kena statement timeout
-- ----------------------------------------------------------------------------
-- MASALAH
--   Dipanggil lewat PostgREST (anon/authenticated role, dari
--   scripts/update_from_data_update.mjs dan tombol "Hitung Ulang"), gagal
--   dengan "canceling statement due to statement timeout" -- terkonfirmasi
--   16 September 2026 setelah hitung ulang penuh 7.937 baris Penyedia + 43
--   Swakelola. Bukan bug logika: REFRESH MATERIALIZED VIEW CONCURRENTLY
--   ~8.000 baris (diffing baris lama vs baru, plus rebuild components_json
--   lewat correlated subquery per baris) kadang melewati statement_timeout
--   default yang berlaku untuk role anon/authenticated di Supabase hosted
--   (jauh lebih pendek daripada request biasa lewat dashboard/SQL Editor).
--
-- KENAPA BUKAN GANTI KE REFRESH TANPA CONCURRENTLY
--   REFRESH MATERIALIZED VIEW biasa (tanpa CONCURRENTLY) mengunci
--   mv_risiko_ringkasan (ACCESS EXCLUSIVE) selama refresh -- SELECT dari
--   RisikoInsightPanel (dibuka tiap kali halaman Ringkasan diakses) akan
--   diblokir sampai refresh selesai. CONCURRENTLY sengaja dipilih di migration
--   76 supaya pembaca tidak pernah terhalang; solusinya menaikkan batas waktu,
--   bukan mengorbankan sifat non-blocking itu.
--
-- SOLUSI
--   Tambah SET statement_timeout di level fungsi (bukan ALTER ROLE global) --
--   berlaku HANYA selama eksekusi fungsi ini, otomatis kembali ke nilai role
--   setelah selesai. Tidak menyentuh timeout query lain di aplikasi.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_risiko_ringkasan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '180s'
AS $$
BEGIN
    -- CONCURRENTLY butuh unique index (lihat migration 76) DAN mv sudah
    -- terisi minimal sekali -- refresh PERTAMA harus manual tanpa
    -- CONCURRENTLY (lihat blok VERIFIKASI di migration 76).
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_risiko_ringkasan;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_risiko_ringkasan() TO anon, authenticated;

-- ============================================================================
-- VERIFIKASI
-- ----------------------------------------------------------------------------
--   -- 1) Jalankan migration ini di Supabase SQL Editor, lalu panggil lewat
--      RPC yang sama seperti aplikasi (bukan SQL Editor -- SQL Editor punya
--      timeout sendiri yang biasanya sudah longgar dan tidak membuktikan
--      apa-apa soal jalur anon/authenticated):
--        node scripts/update_from_data_update.mjs --all --yes --skip-risiko=false
--      atau tombol "Hitung Ulang" di halaman Risiko Pengadaan.
--   -- 2) Cek fungsi memang membawa setting barunya:
--   SELECT proconfig FROM pg_proc WHERE proname = 'refresh_risiko_ringkasan';
--   -- harus memuat 'statement_timeout=180s' di antara elemen array-nya.
--   -- 3) Kalau masih timeout di 180s, tabel/koneksi mungkin lebih berat dari
--      perkiraan -- naikkan angkanya (mis. '300s') lewat CREATE OR REPLACE
--      yang sama, bukan menambah migration baru untuk perubahan angka semata.
-- ============================================================================
