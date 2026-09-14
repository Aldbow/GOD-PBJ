-- ============================================================================
-- MATERIALIZED VIEW: mv_dashboard_gabungan_satker — rekap tersimpan untuk
-- halaman Ringkasan (dashboard utama)
-- ----------------------------------------------------------------------------
-- MASALAH
--   view_dashboard_gabungan_satker adalah UNION ALL dari 5 view (tender,
--   e-purchasing, pengadaan langsung, penunjukan langsung, swakelola), yang
--   masing-masing berisi window function, recursive CTE (view_rup_final), dan
--   subquery correlated LTRIM per baris — semuanya DIHITUNG ULANG oleh Postgres
--   setiap kali view ini di-SELECT. Halaman Ringkasan menarik SELURUH baris
--   (~8.000 dan terus bertambah tiap tahun) TANPA filter, setiap kali dibuka
--   siapa pun. Supabase membatasi ±10-15 koneksi bersamaan — beban ini
--   sudah pernah membuat sistem timeout sebelumnya (lihat
--   sql/add_index_realisasi_dashboard.sql) dan diproyeksikan kolaps di ±50
--   pengguna bersamaan (lihat docs/LAPORAN-ANALISIS-PERFORMA.md).
--
-- SOLUSI
--   Bekukan hasil view_dashboard_gabungan_satker jadi materialized view (tabel
--   fisik + index), di-refresh HANYA saat data sumber berubah (dipicu dari
--   scripts/update_from_data_update.mjs tepat setelah semua tabel target
--   sukses ditulis), BUKAN pada tiap pembukaan halaman dan BUKAN pada jadwal
--   waktu tetap. Bentuk baris & nama kolom SAMA PERSIS dengan view asli
--   (lihat SELECT_COLS di src/features/ringkasan/lib/ringkasanData.ts) — TIDAK
--   ADA logika bisnis (definisi anomali, kurasi, exclusion is_from_sirup, dst)
--   yang dipindah atau ditulis ulang di SQL. Itu semua tetap satu sumber
--   kebenaran di TypeScript; materialized view ini murni mempercepat SUMBER
--   datanya, bukan mengganti cara menghitungnya.
--
-- CATATAN
--   - Ini MATERIALIZED VIEW PERTAMA di proyek ini. Tidak ada pg_cron; refresh
--     dipicu app-level (lihat scripts/update_from_data_update.mjs).
--   - View asli view_dashboard_gabungan_satker TIDAK dihapus dan TIDAK diubah
--     — tetap ada permanen sebagai jaring pengaman/rollback.
--   - UNIQUE INDEX pada (kd_rup, metode_pengadaan) WAJIB ada agar REFRESH
--     MATERIALIZED VIEW CONCURRENTLY bisa dipakai (non-blocking terhadap
--     SELECT yang sedang berjalan). Sudah diverifikasi manual (9 Sept 2026,
--     7.982 baris) TIDAK ADA duplikat pada kombinasi ini. Kalau di kemudian
--     hari REFRESH CONCURRENTLY gagal dengan "could not create unique index",
--     itu SINYAL BUG BARU di view sumber — investigasi dulu, jangan
--     dilonggarkan jadi index non-unique (itu membatalkan manfaat
--     CONCURRENTLY).
--   - Fungsi refresh_dashboard_gabungan_satker() dibuat SECURITY DEFINER supaya
--     bisa dipanggil lewat anon key (REFRESH MATERIALIZED VIEW butuh privilege
--     pemilik object; script updater proyek ini bisa jalan hanya dengan anon
--     key — lihat docs/RUNBOOK-UPDATE-DATA.md §2). SECURITY DEFINER
--     menjalankan isi fungsi sebagai pembuatnya (role yang menjalankan
--     migration ini di SQL Editor, biasanya postgres/owner), bukan sebagai
--     pemanggil.
--   - Materialized view dibuat WITH NO DATA — KOSONG sampai di-REFRESH manual
--     pertama kali (lihat blok VERIFIKASI di bawah). Jangan arahkan kode
--     aplikasi ke sini sebelum refresh pertama dilakukan.
--   - Jalankan di Supabase SQL Editor setelah 45_view_jenis_pengadaan.sql.
-- ============================================================================

-- 1. MATERIALIZED VIEW --------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_gabungan_satker AS
SELECT
    kd_rup,
    rup_name,
    satker,
    nama_ppk,
    metode_pengadaan,
    jenis_pengadaan,
    pagu,
    total,
    status,
    status_kurasi,
    catatan_kurasi,
    rekomendasi_kurasi,
    is_from_sirup
FROM view_dashboard_gabungan_satker
WITH NO DATA;

-- 2. UNIQUE INDEX (wajib untuk REFRESH ... CONCURRENTLY) ----------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_kd_rup_metode
    ON mv_dashboard_gabungan_satker (kd_rup, metode_pengadaan);

-- Index pendukung filter yang dipakai TS (satker, nama_ppk exact match di
-- filterRows()). Opsional untuk Langkah 1 ini (seluruh baris tetap ditarik ke
-- client), tapi murah dipasang sekarang dan berguna kalau agregasi dipindah
-- ke server (Langkah 3, di luar lingkup migration ini).
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_satker
    ON mv_dashboard_gabungan_satker (satker);
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_ppk
    ON mv_dashboard_gabungan_satker (nama_ppk);

-- 3. FUNGSI RPC REFRESH (SECURITY DEFINER) ------------------------------------
CREATE OR REPLACE FUNCTION refresh_dashboard_gabungan_satker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- CONCURRENTLY: tidak mengunci SELECT yang sedang berjalan (halaman
    -- Ringkasan tetap bisa dibaca saat refresh berjalan). Butuh unique index
    -- di atas DAN mv sudah terisi minimal sekali (lihat CATATAN "WITH NO DATA"
    -- di atas) — refresh PERTAMA harus dilakukan manual tanpa CONCURRENTLY
    -- (lihat blok VERIFIKASI di bawah), baru fungsi ini dipakai untuk
    -- refresh-refresh berikutnya.
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_gabungan_satker;
END;
$$;

-- Dipanggil dari scripts/update_from_data_update.mjs lewat sb.rpc(...), yang
-- memakai anon key kalau SUPABASE_SERVICE_ROLE_KEY tidak diisi — jadi anon
-- (dan authenticated, untuk konsistensi kalau nanti dipanggil dari route
-- admin) perlu izin EXECUTE eksplisit.
GRANT EXECUTE ON FUNCTION refresh_dashboard_gabungan_satker() TO anon, authenticated;

-- ============================================================================
-- VERIFIKASI (jalankan berurutan setelah migration ini, SEBELUM mengubah kode
-- aplikasi mana pun)
-- ----------------------------------------------------------------------------
--   -- 1) Refresh pertama, WAJIB tanpa CONCURRENTLY (mv masih kosong):
--   REFRESH MATERIALIZED VIEW mv_dashboard_gabungan_satker;
--
--   -- 2) Jumlah baris harus sama persis dengan view asli:
--   SELECT
--     (SELECT COUNT(*) FROM mv_dashboard_gabungan_satker) AS mv_count,
--     (SELECT COUNT(*) FROM view_dashboard_gabungan_satker) AS view_count;
--
--   -- 3) Tidak ada baris hilang/berubah nilainya (harus 0 baris hasil).
--   --    CATATAN: TIDAK BOLEH pakai "SELECT *" di sini -- EXCEPT/UNION
--   --    membandingkan berdasarkan POSISI kolom, bukan nama, dan
--   --    view_dashboard_gabungan_satker punya 14 kolom (termasuk
--   --    status_aktif_rup yang sengaja TIDAK dimaterialized di sini karena
--   --    tidak dipakai SELECT_COLS di ringkasanData.ts) dengan urutan yang
--   --    beda dari mv ini (13 kolom). "SELECT *" akan gagal dengan error
--   --    "each EXCEPT query must have the same number of columns", atau kalau
--   --    kolomnya kebetulan sama banyak, akan membandingkan kolom yang salah
--   --    berdasarkan posisi. Sebut kolom eksplisit, identik urutannya di
--   --    kedua sisi, persis SELECT_COLS:
--   (SELECT kd_rup, rup_name, satker, nama_ppk, metode_pengadaan, jenis_pengadaan,
--           pagu, total, status, status_kurasi, catatan_kurasi, rekomendasi_kurasi,
--           is_from_sirup
--    FROM view_dashboard_gabungan_satker
--    EXCEPT
--    SELECT kd_rup, rup_name, satker, nama_ppk, metode_pengadaan, jenis_pengadaan,
--           pagu, total, status, status_kurasi, catatan_kurasi, rekomendasi_kurasi,
--           is_from_sirup
--    FROM mv_dashboard_gabungan_satker)
--   UNION ALL
--   (SELECT kd_rup, rup_name, satker, nama_ppk, metode_pengadaan, jenis_pengadaan,
--           pagu, total, status, status_kurasi, catatan_kurasi, rekomendasi_kurasi,
--           is_from_sirup
--    FROM mv_dashboard_gabungan_satker
--    EXCEPT
--    SELECT kd_rup, rup_name, satker, nama_ppk, metode_pengadaan, jenis_pengadaan,
--           pagu, total, status, status_kurasi, catatan_kurasi, rekomendasi_kurasi,
--           is_from_sirup
--    FROM view_dashboard_gabungan_satker);
--
--   -- 4) Sekarang mv sudah terisi, uji fungsi refresh (CONCURRENTLY valid):
--   SELECT refresh_dashboard_gabungan_satker();
--
--   -- 5) Cek status kapan saja (kolom ispopulated harus true):
--   SELECT matviewname, ispopulated FROM pg_matviews
--   WHERE matviewname = 'mv_dashboard_gabungan_satker';
-- ============================================================================
