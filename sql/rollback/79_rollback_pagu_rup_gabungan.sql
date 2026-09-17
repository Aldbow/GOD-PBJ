-- ============================================================================
-- ROLLBACK migration 79 (pagu baris RUP gabungan) -- BUKAN bagian urutan build
-- ----------------------------------------------------------------------------
-- BACA INI DULU
--   File ini SENGAJA ditaruh di luar sql/migrations/ supaya tidak ikut terjalan
--   saat membangun database dari Supabase kosong. Menjalankannya di database
--   baru akan membatalkan perbaikan yang belum pernah diterapkan.
--
-- APA YANG DIKEMBALIKAN
--   Seluruh objek dikembalikan ke keadaan SESUDAH migration 78 dan SEBELUM 79:
--     view_dashboard_pengadaan_langsung   <- definisi 73_view_pl_status_paket_pencatatan.sql
--     view_dashboard_penunjukan_langsung  <- definisi 45_view_jenis_pengadaan.sql
--     view_dashboard_tender               <- definisi 78_pagu_per_tahun_anggaran.sql
--     mv_dashboard_gabungan_satker        <- definisi 78, join pagu_per_tahun lewat split_part
--   Perbaikan migration 78 (pagu Tender tidak lagi dobel karena cabang '2027',
--   plus kolom pagu_per_tahun) TETAP UTUH. Yang dibatalkan hanya 79.
--
-- KONSEKUENSI YANG DISENGAJA
--   Pagu Rp350.180.000 kembali terhitung dua kali pada 3 baris RUP gabungan:
--     65598940;66447219                            Rp258.140.000
--     65599008;65599009;65599036;65599037;66447219 Rp 70.000.000
--     65599027;66445498                            Rp 22.040.000
--   Total pagu tahun 2026 kembali dari Rp1.463.651.400.677 ke Rp1.464.001.580.677.
--   Itu memang cacatnya; rollback ini untuk memulihkan layanan, bukan kebenaran
--   angka. Kalau dipakai, catat alasannya dan jadwalkan 79 dijalankan lagi.
--
-- KODE APLIKASI TIDAK PERLU IKUT DI-ROLLBACK
--   Migration 79 tidak menambah, menghapus, atau mengubah tipe satu kolom pun.
--   Halaman Ringkasan membaca kolom yang sama persis di kedua keadaan, jadi
--   build yang sedang tayang tetap jalan tanpa deploy ulang.
--
-- CATATAN
--   - Materialized view di-DROP lalu dibuat ulang WITH DATA. Ada jeda beberapa
--     puluh detik tanpa mv, sama seperti saat menjalankan 78 dan 79.
--   - Realisasi tidak disentuh sama sekali, baik oleh 79 maupun oleh rollback ini.
--   - Jalankan di Supabase SQL Editor, urut atas ke bawah.
-- ============================================================================

SET statement_timeout = '180s';

-- 1. PENGADAAN LANGSUNG: kembali ke join split_part untuk pagu ------------------
CREATE OR REPLACE VIEW view_dashboard_pengadaan_langsung AS
WITH pencatatan AS (
    SELECT COALESCE(rf.final_rup::text, pnr.kd_rup_paket) as kd_rup_paket,
        SUM(CAST(REPLACE(CAST(pnr.nilai_realisasi AS text), ',', '.') AS numeric)) as total,
        MAX(pnr.nama_penyedia) as nama_penyedia,
        -- split nilai realisasi menurut status paket induknya
        SUM(CASE WHEN pnt.status_nontender_pct_ket = 'Paket Selesai'
                 THEN CAST(REPLACE(CAST(pnr.nilai_realisasi AS text), ',', '.') AS numeric)
                 ELSE 0 END) as total_selesai,
        SUM(CASE WHEN pnt.status_nontender_pct_ket = 'Paket Sedang Berjalan'
                 THEN CAST(REPLACE(CAST(pnr.nilai_realisasi AS text), ',', '.') AS numeric)
                 ELSE 0 END) as total_berjalan,
        -- satu kd_rup bisa menaungi beberapa paket pencatatan dgn status berbeda
        CASE WHEN COUNT(DISTINCT pnt.status_nontender_pct_ket) > 1 THEN 'Campuran'
             ELSE MAX(pnt.status_nontender_pct_ket) END as status_paket
    FROM pencatatan_non_tender_realisasi pnr
    LEFT JOIN pencatatan_non_tender pnt ON pnt.kd_nontender_pct = pnr.kd_nontender_pct
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = pnr.kd_rup_paket
    WHERE pnr.nilai_realisasi IS NOT NULL AND pnr.nilai_realisasi != '' GROUP BY COALESCE(rf.final_rup::text, pnr.kd_rup_paket)
),
transaksional AS (
    SELECT COALESCE(rf.final_rup::text, nts.kd_rup) as kd_rup,
        SUM(CAST(REPLACE(COALESCE(NULLIF(nts.nilai_kontrak, ''), NULLIF(nts.nilai_negosiasi, ''), '0'), ',', '.') AS numeric)) as total,
        MAX(nts.nama_penyedia) as nama_penyedia, MAX(nts.nama_paket) as nama_paket, MAX(nts.pagu) as pagu, MAX(nts.nama_satker) as nama_satker, MAX(nts.kd_satker_str) as kd_satker_str,
        MAX(nts.mtd_pemilihan) as mtd_pemilihan
    FROM non_tender_selesai nts
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = nts.kd_rup
    WHERE nts.mtd_pemilihan IN ('Pengadaan Langsung', 'Dikecualikan') GROUP BY COALESCE(rf.final_rup::text, nts.kd_rup)
),
gabungan_rup AS (
    SELECT CAST(kd_rup AS text) as kd_rup FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Pengadaan Langsung', 'Dikecualikan') UNION SELECT kd_rup FROM transaksional
)
SELECT
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pl.pagu::numeric, 0) AS pagu,
    COALESCE(p.total, 0) AS total_pencatatan, COALESCE(t.total, 0) AS total_transaksional, (COALESCE(p.total, 0) + COALESCE(t.total, 0)) AS total,
    COALESCE(pl."MASTER_NAMA_PPK", pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk, COALESCE(pl."SATUAN KERJA", pl.nama_satker, t.nama_satker, 'Satker Tidak Diketahui') AS satker,
    COALESCE(pl."UNIT KERJA", (SELECT m."UNIT KERJA" FROM master_data m WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(COALESCE(CAST(pl.kd_satker_str AS text), t.kd_satker_str), '0') AND m."UNIT KERJA" IS NOT NULL LIMIT 1)) AS eselon1,
    pl.status_aktif_rup, COALESCE(t.nama_penyedia, p.nama_penyedia) AS kode_penyedia,
    CASE WHEN g.kd_rup LIKE '%;%' THEN true ELSE false END AS is_multiple_rup, CASE WHEN pl.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    COALESCE(pl.metode_pengadaan, t.mtd_pemilihan, 'Tidak Diketahui') AS metode_pengadaan,
    CASE WHEN (COALESCE(p.total, 0) + COALESCE(t.total, 0)) > 0 THEN 'COMPLETED' ELSE 'BELUM REALISASI' END AS status,
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi,
    pl.jenis_pengadaan,
    -- >>> kolom baru, WAJIB di akhir agar CREATE OR REPLACE VIEW tetap valid <<<
    COALESCE(p.total_selesai, 0) AS total_pencatatan_selesai,
    COALESCE(p.total_berjalan, 0) AS total_pencatatan_berjalan,
    p.status_paket AS status_paket_pencatatan
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Pengadaan Langsung', 'Dikecualikan')) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 2. PENUNJUKAN LANGSUNG: kembali ke join split_part untuk pagu ---------------
CREATE OR REPLACE VIEW view_dashboard_penunjukan_langsung AS
WITH pencatatan AS (
    SELECT COALESCE(rf.final_rup::text, pnr.kd_rup_paket) as kd_rup_paket,
        SUM(CAST(REPLACE(CAST(pnr.nilai_realisasi AS text), ',', '.') AS numeric)) as total, MAX(pnr.nama_penyedia) as nama_penyedia
    FROM pencatatan_non_tender_realisasi pnr
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = pnr.kd_rup_paket
    WHERE pnr.nilai_realisasi IS NOT NULL AND pnr.nilai_realisasi != '' GROUP BY COALESCE(rf.final_rup::text, pnr.kd_rup_paket)
),
transaksional AS (
    SELECT COALESCE(rf.final_rup::text, nts.kd_rup) as kd_rup,
        SUM(CAST(REPLACE(COALESCE(NULLIF(nts.nilai_kontrak, ''), NULLIF(nts.nilai_negosiasi, ''), '0'), ',', '.') AS numeric)) as total,
        MAX(nts.nama_penyedia) as nama_penyedia, MAX(nts.nama_paket) as nama_paket, MAX(nts.pagu) as pagu, MAX(nts.nama_satker) as nama_satker, MAX(nts.kd_satker_str) as kd_satker_str
    FROM non_tender_selesai nts
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = nts.kd_rup
    WHERE nts.mtd_pemilihan = 'Penunjukan Langsung' GROUP BY COALESCE(rf.final_rup::text, nts.kd_rup)
),
gabungan_rup AS (
    SELECT CAST(kd_rup AS text) as kd_rup FROM view_paket_penyedia_master_data WHERE metode_pengadaan = 'Penunjukan Langsung' UNION SELECT kd_rup FROM transaksional
)
SELECT
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pl.pagu::numeric, 0) AS pagu,
    COALESCE(p.total, 0) AS total_pencatatan, COALESCE(t.total, 0) AS total_transaksional, (COALESCE(p.total, 0) + COALESCE(t.total, 0)) AS total,
    COALESCE(pl."MASTER_NAMA_PPK", pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk, COALESCE(pl."SATUAN KERJA", pl.nama_satker, t.nama_satker, 'Satker Tidak Diketahui') AS satker,
    COALESCE(pl."UNIT KERJA", (SELECT m."UNIT KERJA" FROM master_data m WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(COALESCE(CAST(pl.kd_satker_str AS text), t.kd_satker_str), '0') AND m."UNIT KERJA" IS NOT NULL LIMIT 1)) AS eselon1,
    pl.status_aktif_rup, COALESCE(t.nama_penyedia, p.nama_penyedia) AS kode_penyedia,
    CASE WHEN g.kd_rup LIKE '%;%' THEN true ELSE false END AS is_multiple_rup, CASE WHEN pl.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    CASE WHEN (COALESCE(p.total, 0) + COALESCE(t.total, 0)) > 0 THEN 'COMPLETED' ELSE 'BELUM REALISASI' END AS status,
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi,
    pl.jenis_pengadaan
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan = 'Penunjukan Langsung') pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 3. TENDER: kembali ke join split_part untuk pagu (perbaikan 78 tetap ada) ---
CREATE OR REPLACE VIEW view_dashboard_tender AS
WITH transaksional AS (
    SELECT COALESCE(rf.final_rup::text, tsn.kd_rup_paket) as kd_rup,
        MAX(tsn.nama_penyedia) as nama_penyedia, MAX(tsn.kd_penyedia) as kode_penyedia,
        SUM(COALESCE(NULLIF(tsn.nilai_kontrak, 0), NULLIF(tsn.nilai_negosiasi, 0), NULLIF(tsn.nilai_terkoreksi, 0), NULLIF(tsn.nilai_penawaran, 0), NULLIF(tsn.hps, 0), 0)) as total
    FROM tender_selesai_nilai tsn
    LEFT JOIN view_rup_final rf ON rf.origin_rup::text = tsn.kd_rup_paket
    GROUP BY COALESCE(rf.final_rup::text, tsn.kd_rup_paket)
),
anggaran_penyedia AS (
    SELECT CAST(utama.kd_rup AS text) as kd_rup, SUM(COALESCE(utama.pagu, 0)) as pagu
    FROM paket_anggaran_penyedia utama GROUP BY utama.kd_rup
),
gabungan_rup AS (
    SELECT pap.kd_rup FROM anggaran_penyedia pap JOIN view_paket_penyedia_master_data v ON CAST(v.kd_rup AS text) = pap.kd_rup WHERE v.metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')
    UNION SELECT kd_rup FROM transaksional
)
SELECT
    g.kd_rup, COALESCE(pl.nama_paket, 'Paket Tidak Diketahui') AS rup_name, COALESCE(pap_sum.pagu, 0) AS pagu, COALESCE(t.total, 0) AS total,
    COALESCE(pl."MASTER_NAMA_PPK", pl.nama_ppk, 'Anomali/Tidak Diketahui') AS nama_ppk, COALESCE(pl."SATUAN KERJA", pl.nama_satker, 'Satker Tidak Diketahui') AS satker,
    COALESCE(pl."UNIT KERJA", (SELECT m."UNIT KERJA" FROM master_data m WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(CAST(pl.kd_satker_str AS text), '0') AND m."UNIT KERJA" IS NOT NULL LIMIT 1)) AS eselon1,
    pl.status_aktif_rup, COALESCE(t.nama_penyedia, t.kode_penyedia) AS kode_penyedia,
    CASE WHEN g.kd_rup LIKE '%;%' THEN true ELSE false END AS is_multiple_rup, CASE WHEN pl.kd_rup IS NOT NULL THEN true ELSE false END AS is_from_sirup,
    COALESCE(pl.metode_pengadaan, 'Tidak Diketahui') AS metode_pengadaan,
    CASE WHEN COALESCE(t.total, 0) > 0 THEN 'COMPLETED' ELSE 'BELUM REALISASI' END AS status,
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi,
    pl.jenis_pengadaan
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup LEFT JOIN anggaran_penyedia pap_sum ON pap_sum.kd_rup = split_part(g.kd_rup, ';', 1)
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- 4. REKAP TERSIMPAN: kembali ke join split_part -------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_gabungan_satker;

CREATE MATERIALIZED VIEW mv_dashboard_gabungan_satker AS
SELECT
    g.kd_rup,
    g.rup_name,
    g.satker,
    g.nama_ppk,
    g.metode_pengadaan,
    g.jenis_pengadaan,
    g.pagu,
    CASE WHEN g.is_from_sirup THEN pt.pagu_per_tahun END AS pagu_per_tahun,
    g.total,
    g.status,
    g.status_kurasi,
    g.catatan_kurasi,
    g.rekomendasi_kurasi,
    g.is_from_sirup
FROM view_dashboard_gabungan_satker g
LEFT JOIN view_pagu_paket_per_tahun pt ON pt.kd_rup = split_part(g.kd_rup::text, ';', 1)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_kd_rup_metode
    ON mv_dashboard_gabungan_satker (kd_rup, metode_pengadaan);
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_satker
    ON mv_dashboard_gabungan_satker (satker);
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_ppk
    ON mv_dashboard_gabungan_satker (nama_ppk);

GRANT SELECT ON mv_dashboard_gabungan_satker TO anon, authenticated;

CREATE OR REPLACE FUNCTION refresh_dashboard_gabungan_satker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '180s'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_gabungan_satker;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_dashboard_gabungan_satker() TO anon, authenticated;

-- ============================================================================
-- VERIFIKASI ROLLBACK (jalankan setelah blok di atas)
-- ----------------------------------------------------------------------------
--   -- 1) Ketiga baris gabungan harus MEMBAWA pagu lagi (inilah cacat yang
--   --    sengaja dikembalikan). Harap 3 baris.
--   SELECT kd_rup, metode_pengadaan, pagu FROM mv_dashboard_gabungan_satker
--   WHERE kd_rup::text LIKE '%;%' AND pagu > 0;
--
--   -- 2) Total pagu per tahun kembali ke angka pra-79.
--   --    Harap 2026 -> 1.464.001.580.677, 2027 -> 650.820.222.250
--   SELECT tahun, SUM(nilai::numeric) AS pagu
--   FROM mv_dashboard_gabungan_satker, jsonb_each_text(pagu_per_tahun) AS x(tahun, nilai)
--   GROUP BY tahun ORDER BY tahun;
--
--   -- 3) Perbaikan migration 78 harus TETAP ada: pagu tender sama dengan SIRUP.
--   --    Harus 0 baris. Kalau ada isinya, rollback kebablasan sampai membatalkan 78.
--   SELECT m.kd_rup, m.pagu, p.pagu AS pagu_sirup
--   FROM mv_dashboard_gabungan_satker m
--   JOIN api_paket_penyedia_terumumkan p ON CAST(p.kd_rup AS text) = split_part(m.kd_rup::text, ';', 1)
--   WHERE m.metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')
--     AND ABS(m.pagu - p.pagu) > 1;
--
--   -- 4) Realisasi tidak boleh bergeser sedikit pun. Harap 662.896.786.425.
--   SELECT SUM(total) FROM mv_dashboard_gabungan_satker;
--
--   -- 5) Refresh harus tetap jalan.
--   SELECT refresh_dashboard_gabungan_satker();
-- ============================================================================
