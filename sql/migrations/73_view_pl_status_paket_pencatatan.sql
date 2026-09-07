-- ============================================================================
-- view_dashboard_pengadaan_langsung — tambah rincian status paket pencatatan
-- ----------------------------------------------------------------------------
-- TUJUAN
--   Halaman Realisasi Pengadaan Langsung perlu membedakan:
--     1. realisasi datang dari PENCATATAN atau TRANSAKSIONAL (sudah bisa dihitung
--        di layer TS dari total_pencatatan / total_transaksional yang sudah ada),
--     2. untuk yang pencatatan: paketnya "Paket Sedang Berjalan" atau
--        "Paket Selesai" — kolom status_nontender_pct_ket dari tabel
--        pencatatan_non_tender (level paket, diimpor lewat migration 72).
--
-- KENAPA HARUS DI SQL, BUKAN JOIN DI CLIENT
--   Tabel pencatatan_non_tender memakai kd_rup ASAL. View ini memetakan RUP lama
--   -> RUP final lewat view_rup_final (hasil kaji ulang). Join di sisi klien
--   memakai kd_rup mentah akan meleset untuk paket yang pernah dikaji ulang —
--   pada data 2026 salah satunya "Belanja Langganan Listrik" (kd_rup 66901203 ->
--   67692059) yang nilainya Rp4,87 miliar, jadi salah labelnya bukan hal kecil.
--
-- KENAPA JOIN LEWAT kd_nontender_pct, BUKAN kd_rup
--   kd_nontender_pct adalah PK pencatatan_non_tender, jadi join N:1 dan TIDAK
--   menggandakan baris realisasi. kd_rup hanya unik 55 dari 65 paket (satu RUP
--   bisa dipecah jadi beberapa paket pencatatan) — join lewat kd_rup akan fan-out
--   dan menggandakan nilai realisasi.
--
-- YANG BERUBAH
--   Definisi di bawah = salinan persis definisi final saat ini
--   (45_view_jenis_pengadaan.sql bagian 3, sudah diverifikasi sama dengan view
--   live: 19 kolom, urutan sama), dengan TIGA kolom ditambahkan DI AKHIR:
--     - total_pencatatan_selesai   numeric
--     - total_pencatatan_berjalan  numeric
--     - status_paket_pencatatan    text  ('Paket Selesai' / 'Paket Sedang
--                                         Berjalan' / 'Campuran' / NULL)
--   Ditambahkan di akhir agar CREATE OR REPLACE VIEW tetap valid untuk
--   view_dashboard_gabungan_satker yang bergantung padanya.
--
--   total_pencatatan, total_transaksional, total, status TIDAK diubah sama
--   sekali — angka dashboard yang sudah ada tidak bergeser.
--
-- ANGKA HARAPAN (data 2026, sudah diverifikasi sebelum migration ditulis)
--   total_pencatatan_selesai   =   976.931.385
--   total_pencatatan_berjalan  = 5.442.180.575
--   jumlah                     = 6.419.111.960  = SUM(total_pencatatan) sekarang
--   kd_rup berstatus 'Campuran': 1 (kd_rup 66453149, BPVP Belitung)
--
-- Paket berstatus 'Paket Dibatalkan' tidak punya baris realisasi sama sekali
-- (0 dari 130), jadi tidak ikut terhitung. Kalau suatu saat muncul, nilainya
-- tetap masuk total_pencatatan tapi tidak masuk kedua kolom split — selisihnya
-- sengaja dibiarkan terlihat, bukan disembunyikan.
--
-- Jalankan di Supabase SQL Editor. Sesudahnya segarkan tipe TypeScript:
--   npx supabase gen types typescript --project-id bsskoapfeejutazpsyvd --schema public > database.types.ts
-- ============================================================================

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

-- ============================================================================
-- VERIFIKASI (jalankan setelah CREATE OR REPLACE di atas)
--   Angka 1 & 2 harus persis sama; angka 3 harus 0.
-- ============================================================================
-- 1. split harus menjumlah kembali ke total_pencatatan
-- SELECT SUM(total_pencatatan)             AS total_pencatatan,
--        SUM(total_pencatatan_selesai)     AS selesai,      -- harap   976.931.385
--        SUM(total_pencatatan_berjalan)    AS berjalan,     -- harap 5.442.180.575
--        SUM(total_pencatatan) - SUM(total_pencatatan_selesai) - SUM(total_pencatatan_berjalan) AS selisih
--   FROM view_dashboard_pengadaan_langsung;
--
-- 2. total keseluruhan tidak boleh bergeser (harap 6.419.111.960)
-- SELECT SUM(total_pencatatan) FROM view_dashboard_pengadaan_langsung;
--
-- 3. sebaran label status
-- SELECT status_paket_pencatatan, COUNT(*) FROM view_dashboard_pengadaan_langsung
--  WHERE total_pencatatan > 0 GROUP BY 1 ORDER BY 2 DESC;
