-- ============================================================================
-- METODE PENGADAAN: fallback ke realisasi untuk paket ANOMALI
-- ----------------------------------------------------------------------------
-- MASALAH
--   Kolom metode_pengadaan di view_dashboard_pengadaan_langsung hanya diambil
--   dari SIRUP master (pl.metode_pengadaan). Paket ANOMALI (is_from_sirup=false,
--   tidak cocok RUP terumumkan — mis. kd_rup gabungan '62660189;62660191') tidak
--   punya baris master, sehingga metode jatuh ke 'Tidak Diketahui' — padahal di
--   realisasi non-tender (non_tender_selesai) jelas 'Pengadaan Langsung'.
--
-- SOLUSI
--   Bawa nts.mtd_pemilihan ke CTE transaksional, lalu jadikan fallback:
--     COALESCE(pl.metode_pengadaan, t.mtd_pemilihan, 'Tidak Diketahui')
--   Aman & sempit:
--     - Fallback hanya aktif saat pl NULL (khusus paket anomali). Paket yang
--       cocok SIRUP tetap memakai metode master — tidak berubah.
--     - CTE transaksional sudah difilter mtd_pemilihan IN ('Pengadaan Langsung',
--       'Dikecualikan'), jadi t.mtd_pemilihan tak mungkin melabeli metode lain.
--
-- CATATAN
--   - Hanya view Pengadaan Langsung yang perlu diubah. Cabang lain di
--     view_dashboard_gabungan_satker memaksa metode konstan (E-Purchasing,
--     Penunjukan Langsung, Swakelola) atau punya kolom metode sendiri (Tender).
--   - Definisi di bawah = lock_pagu_to_masterdata.sql (pagu terkunci ke master),
--     HANYA baris mtd_pemilihan yang ditambahkan. CREATE OR REPLACE menjaga
--     kolom output identik → view_dashboard_gabungan_satker tetap valid.
--   - Jalankan di Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE VIEW view_dashboard_pengadaan_langsung AS
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
    pl.status_kurasi, pl.catatan_kurasi, pl.rekomendasi_kurasi
FROM gabungan_rup g
LEFT JOIN (SELECT * FROM view_paket_penyedia_master_data WHERE metode_pengadaan IN ('Pengadaan Langsung', 'Dikecualikan')) pl ON CAST(pl.kd_rup AS text) = split_part(g.kd_rup, ';', 1)
LEFT JOIN pencatatan p ON p.kd_rup_paket = g.kd_rup LEFT JOIN transaksional t ON t.kd_rup = g.kd_rup
WHERE g.kd_rup NOT IN (SELECT kd_rup_lama::text FROM history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru);

-- ============================================================================
-- VERIFIKASI (opsional) — jalankan setelah di atas
-- ----------------------------------------------------------------------------
-- Paket anomali kini bermetode dari realisasi, bukan 'Tidak Diketahui':
--   SELECT kd_rup, metode_pengadaan, pagu, total, is_from_sirup
--   FROM view_dashboard_gabungan_satker
--   WHERE kd_rup = '62660189;62660191';   -- metode_pengadaan = 'Pengadaan Langsung', pagu = 0
--
-- Tidak ada lagi PL 'Tidak Diketahui' yang sebenarnya punya realisasi:
--   SELECT COUNT(*) FROM view_dashboard_pengadaan_langsung
--   WHERE metode_pengadaan = 'Tidak Diketahui' AND total > 0;   -- harus 0
-- ============================================================================
