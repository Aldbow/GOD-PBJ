-- ============================================================================
-- PAGU BARIS RUP GABUNGAN "A;B" TIDAK LAGI TERHITUNG DUA KALI
-- ----------------------------------------------------------------------------
-- MASALAH
--   Satu realisasi bisa menaungi beberapa RUP sekaligus; non_tender_selesai
--   menyimpannya sebagai kd_rup "A;B". Baris itu masuk ke dashboard lewat CTE
--   transaksional, lalu di-join ke masterdata dengan:
--     LEFT JOIN ... pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
--   Karena join memakai kepala kode saja, baris "A;B" ikut mewarisi pagu milik A,
--   padahal A hampir selalu punya barisnya sendiri dari sisi masterdata dengan
--   pagu yang sama. Pagu A jadi terhitung dua kali.
--
--   Terverifikasi di data 17 September 2026, Rp350.180.000 terhitung ganda:
--     65598940;66447219                            Rp258.140.000
--     65599008;65599009;65599036;65599037;66447219 Rp 70.000.000
--     65599027;66445498                            Rp 22.040.000
--   Ketiganya Pengadaan Langsung, dan ketiga kepala kodenya punya baris sendiri
--   dengan pagu yang persis sama.
--
--   Ini juga membuat perlakuan antarbaris gabungan tidak konsisten: 62660189;62660191
--   berpagu 0 (dipakai sebagai contoh anomali di 42_views_lock_pagu.sql) karena
--   kepala kodenya kebetulan tidak ada di masterdata, sedangkan 65598940;66447219
--   berpagu penuh. Bedanya kebetulan, bukan aturan.
--
-- SOLUSI
--   Pagu hanya diambil kalau join-nya PERSIS, bukan lewat kepala kode:
--     CASE WHEN CAST(pl.kd_rup AS text) = g.kd_rup THEN COALESCE(pl.pagu::numeric, 0) ELSE 0 END
--   Baris gabungan jadi berpagu 0 dan hanya menyumbang realisasi, sesuai maksud
--   42_views_lock_pagu.sql. Join split_part TETAP dipakai untuk nama paket, PPK,
--   satker, eselon1, jenis, dan kurasi, jadi baris itu tidak kehilangan identitas
--   dan tidak berpindah metode.
--
--   Angka sesudah migration ini (tarikan 17 September 2026):
--     tahun dana 2026   Rp 1.463.651.400.677   (dari 1.464.001.580.677)
--     tahun dana 2027   Rp   650.820.222.250   (tidak berubah)
--     seluruh tahun     Rp 2.114.471.622.927   (dari 2.114.821.802.927)
--
-- CATATAN
--   - Realisasi, total_pencatatan, total_transaksional, dan status TIDAK diubah.
--     Yang bergeser hanya pagu pada baris ber-kd_rup gabungan.
--   - Join pagu_per_tahun di mv ikut jadi kecocokan persis supaya breakdown
--     tahunan tetap menjumlah ke kolom pagu.
--   - Definisi PL disalin dari 73_view_pl_status_paket_pencatatan.sql, PnL dari
--     45_view_jenis_pengadaan.sql, Tender dari 78_pagu_per_tahun_anggaran.sql,
--     masing-masing definisi terkini. Hanya ekspresi pagu yang berubah.
--   - Jalankan di Supabase SQL Editor setelah migration 78.
-- ============================================================================

SET statement_timeout = '180s';

-- 1. PENGADAAN LANGSUNG -------------------------------------------------------
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
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, CASE WHEN CAST(pl.kd_rup AS text) = g.kd_rup THEN COALESCE(pl.pagu::numeric, 0) ELSE 0 END AS pagu,
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

-- 2. PENUNJUKAN LANGSUNG ------------------------------------------------------
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
    g.kd_rup, COALESCE(pl.nama_paket, t.nama_paket, 'Paket Tidak Diketahui') AS rup_name, CASE WHEN CAST(pl.kd_rup AS text) = g.kd_rup THEN COALESCE(pl.pagu::numeric, 0) ELSE 0 END AS pagu,
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

-- 3. TENDER -------------------------------------------------------------------
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
    g.kd_rup, COALESCE(pl.nama_paket, 'Paket Tidak Diketahui') AS rup_name, CASE WHEN pap_sum.kd_rup = g.kd_rup THEN COALESCE(pap_sum.pagu, 0) ELSE 0 END AS pagu, COALESCE(t.total, 0) AS total,
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

-- 4. REKAP TERSIMPAN: bangun ulang, join pagu_per_tahun jadi kecocokan persis ---
-- Untuk kd_rup tanpa ';' hasilnya sama seperti sebelumnya. Untuk baris gabungan,
-- pagu_per_tahun jadi NULL, sejalan dengan pagu yang sekarang 0.
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
LEFT JOIN view_pagu_paket_per_tahun pt ON pt.kd_rup = g.kd_rup::text
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
-- VERIFIKASI (jalankan setelah migration di atas)
-- ----------------------------------------------------------------------------
--   -- 1) Tidak ada lagi baris RUP gabungan yang berpagu. Harus 0 baris.
--   SELECT kd_rup, metode_pengadaan, pagu, total
--   FROM mv_dashboard_gabungan_satker
--   WHERE kd_rup::text LIKE '%;%' AND (pagu > 0 OR pagu_per_tahun IS NOT NULL);
--
--   -- 2) Total pagu per tahun. Harap 2026 -> 1.463.651.400.677,
--   --    2027 -> 650.820.222.250
--   SELECT tahun, SUM(nilai::numeric) AS pagu
--   FROM mv_dashboard_gabungan_satker, jsonb_each_text(pagu_per_tahun) AS x(tahun, nilai)
--   GROUP BY tahun ORDER BY tahun;
--
--   -- 3) Breakdown tahunan tetap menjumlah persis ke kolom pagu. Harus 0 baris.
--   SELECT kd_rup, metode_pengadaan, pagu
--   FROM mv_dashboard_gabungan_satker
--   WHERE pagu_per_tahun IS NOT NULL
--     AND ABS(pagu - (SELECT SUM(nilai::numeric) FROM jsonb_each_text(pagu_per_tahun) AS x(t, nilai))) > 1;
--
--   -- 4) Realisasi TIDAK boleh bergeser. Harap tetap 662.896.786.425.
--   SELECT SUM(total) FROM mv_dashboard_gabungan_satker;
--
--   -- 5) Ketiga baris yang dulu dobel harus berpagu 0, sementara kepala kodenya
--   --    tetap membawa pagu penuh.
--   SELECT kd_rup, pagu, total FROM mv_dashboard_gabungan_satker
--   WHERE kd_rup::text IN ('65598940;66447219','65598940',
--                          '65599027;66445498','65599027',
--                          '65599008;65599009;65599036;65599037;66447219','65599008')
--   ORDER BY kd_rup;
--
--   -- 6) Refresh harus tetap jalan.
--   SELECT refresh_dashboard_gabungan_satker();
-- ============================================================================
