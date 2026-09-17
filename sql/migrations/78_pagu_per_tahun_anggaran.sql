-- ============================================================================
-- PAGU PER TAHUN ANGGARAN DANA + perbaikan pagu Tender yang terhitung ganda
-- ----------------------------------------------------------------------------
-- MASALAH
--   CTE anggaran_penyedia di view_dashboard_tender (45_view_jenis_pengadaan.sql)
--   menghitung pagu begini:
--     SUM(CASE WHEN tahun_anggaran_dana = '2026' THEN utama.pagu
--              WHEN tahun_anggaran_dana = '2027' THEN (pendukung.pagu - utama.pagu)
--              ELSE utama.pagu END)
--   Cabang '2027' merekonstruksi porsi 2026 dari pagu terumumkan. Itu masuk akal
--   HANYA selama paket_anggaran_penyedia punya satu baris per kd_rup, kondisi
--   yang berlaku karena bug dedup di web-app (lihat RUNBOOK-UPDATE-DATA.md §10).
--   Sejak `npm run update-data-live` menarik langsung dari INAPROC, tabelnya utuh
--   (11.289 baris untuk 7.953 paket, sampai 27 baris anggaran per paket), dan
--   cabang itu jadi menjumlahkan porsi 2026 dua kali.
--
--   Contoh kd_rup 66411849 (Renovasi BPVP Kupang), pagu SIRUP 38.569.158.000:
--     baris 2026  pagu 38.367.049.000            -> dihitung 38.367.049.000
--     baris 2027  pagu    202.109.000            -> dihitung 38.367.049.000
--                                          total  = 76.734.098.000  (dobel)
--
--   27 paket tender/seleksi multi-tahun terdampak: 11 menggelembung, 16 justru
--   anjlok (kd_rup 67561347: pagu SIRUP 48.454.000.000 tampil 200.000.000).
--   Total pagu dashboard melonjak dari 1,47 T ke 1,97 T tanpa ada perubahan data.
--
-- SOLUSI
--   1. Cabang '2027' dibuang. SUM(utama.pagu) per kd_rup sudah SAMA PERSIS dengan
--      pagu terumumkan untuk seluruh 7.941 paket penyedia (diverifikasi terhadap
--      tarikan 17 September 2026, nol selisih). Tabel anggaran memang memecah
--      pagu satu paket per MAK/tahun dana, jadi memang untuk dijumlahkan. LEFT
--      JOIN ke api_paket_penyedia_terumumkan ikut hilang karena cuma dipakai
--      cabang itu.
--   2. View baru view_pagu_paket_per_tahun memecah pagu tiap paket per
--      tahun_anggaran_dana sebagai jsonb, mis. {"2026": 38367049000, "2027": 202109000}.
--   3. mv_dashboard_gabungan_satker dibangun ulang dengan kolom pagu_per_tahun
--      supaya halaman Ringkasan bisa memfilter pagu per tahun anggaran.
--      Kolom `pagu` TIDAK berubah artinya: tetap pagu penuh seluruh tahun.
--
--   Angka setelah migration ini (tarikan 17 September 2026):
--     tahun dana 2026   Rp 1.467.652.088.677
--     tahun dana 2027   Rp   650.820.222.250
--     seluruh tahun     Rp 2.115.096.610.927
--
-- CATATAN
--   - Empat view metode lain (PL, PnL, E-Purchasing, Swakelola) TIDAK disentuh.
--     Pagu di keempatnya sudah terkunci ke masterdata sejak 42_views_lock_pagu.sql
--     dan nilainya sudah benar; breakdown tahunannya ditempelkan di level mv saja.
--   - pagu_per_tahun sengaja NULL untuk paket anomali (is_from_sirup = false)
--     supaya aturan "pagu dikunci ke masterdata" di 42_views_lock_pagu.sql tetap
--     berlaku: paket yang tidak terumumkan di SIRUP tidak boleh punya pagu.
--   - Materialized view tidak bisa CREATE OR REPLACE, jadi harus DROP + CREATE.
--     Dibuat WITH DATA (bukan WITH NO DATA seperti migration 75) supaya halaman
--     Ringkasan tidak pernah melihat rekap kosong di tengah migration.
--   - Jalankan di Supabase SQL Editor, urut atas ke bawah.
-- ============================================================================

-- CREATE MATERIALIZED VIEW ... WITH DATA di langkah 3 menghitung ulang seluruh
-- view_dashboard_gabungan_satker sekali jalan; bawaan statement_timeout SQL
-- Editor terlalu pendek untuk itu (gejala yang sama ditangani di migration 77).
SET statement_timeout = '180s';

-- 1. PAGU PER TAHUN ANGGARAN DANA ---------------------------------------------
-- Penyedia dan swakelola digabung karena kd_rup keduanya tidak pernah bertabrakan.
-- Dua lapis GROUP BY: lapis dalam menjumlahkan baris MAK per (paket, tahun),
-- lapis luar menyusunnya jadi satu jsonb per paket.
CREATE OR REPLACE VIEW view_pagu_paket_per_tahun AS
SELECT
    kd_rup,
    jsonb_object_agg(tahun, pagu_tahun) AS pagu_per_tahun
FROM (
    SELECT kd_rup, tahun, SUM(pagu_tahun) AS pagu_tahun
    FROM (
        SELECT
            CAST(kd_rup AS text) AS kd_rup,
            COALESCE(NULLIF(TRIM(tahun_anggaran_dana), ''), 'Tanpa Tahun') AS tahun,
            SUM(COALESCE(pagu, 0)) AS pagu_tahun
        FROM paket_anggaran_penyedia
        GROUP BY 1, 2
        UNION ALL
        SELECT
            CAST(kd_rup AS text) AS kd_rup,
            COALESCE(NULLIF(TRIM(tahun_anggaran_dana), ''), 'Tanpa Tahun') AS tahun,
            SUM(COALESCE(pagu, 0)) AS pagu_tahun
        FROM paket_anggaran_swakelola
        GROUP BY 1, 2
    ) gabungan
    GROUP BY kd_rup, tahun
) per_tahun
GROUP BY kd_rup;

GRANT SELECT ON view_pagu_paket_per_tahun TO anon, authenticated;

-- 2. TENDER: pagu tidak lagi direkonstruksi dari pagu terumumkan ---------------
-- Definisi di bawah = definisi terkini (45_view_jenis_pengadaan.sql), yang berubah
-- HANYA CTE anggaran_penyedia. Kolom output identik supaya
-- view_dashboard_gabungan_satker yang bergantung padanya tetap valid.
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

-- 3. REKAP TERSIMPAN: bangun ulang dengan kolom pagu_per_tahun -----------------
-- Index dan fungsi refresh ikut hilang saat DROP, jadi dibuat ulang di bawah.
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
-- kd_rup gabungan hasil kaji ulang berbentuk "A;B"; baris anggarannya menempel
-- pada kode pertama, pola yang sama dipakai LEFT JOIN pap_sum di view tender.
LEFT JOIN view_pagu_paket_per_tahun pt ON pt.kd_rup = split_part(g.kd_rup::text, ';', 1)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_kd_rup_metode
    ON mv_dashboard_gabungan_satker (kd_rup, metode_pengadaan);
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_satker
    ON mv_dashboard_gabungan_satker (satker);
CREATE INDEX IF NOT EXISTS idx_mv_dashboard_gabungan_satker_ppk
    ON mv_dashboard_gabungan_satker (nama_ppk);

GRANT SELECT ON mv_dashboard_gabungan_satker TO anon, authenticated;

-- Fungsinya harus dibuat ulang karena mv yang dirujuknya sempat di-DROP. Beda
-- dari 75_materialized_view_gabungan_satker.sql cuma statement_timeout: refresh
-- sekarang ikut menghitung join ke view_pagu_paket_per_tahun, jadi dipagari
-- dengan cara yang sama seperti refresh_risiko_ringkasan() di migration 77.
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
--   -- 1) Total pagu per tahun anggaran dana. Untuk tarikan 17 September 2026:
--   --    2026 -> 1.467.652.088.677, 2027 -> 650.820.222.250
--   SELECT tahun, SUM(nilai::numeric) AS pagu
--   FROM mv_dashboard_gabungan_satker, jsonb_each_text(pagu_per_tahun) AS x(tahun, nilai)
--   GROUP BY tahun ORDER BY tahun;
--
--   -- 2) Breakdown tahunan harus menjumlah persis ke kolom pagu. Harus 0 baris.
--   SELECT kd_rup, metode_pengadaan, pagu,
--          (SELECT SUM(nilai::numeric) FROM jsonb_each_text(pagu_per_tahun) AS x(t, nilai)) AS jumlah_per_tahun
--   FROM mv_dashboard_gabungan_satker
--   WHERE pagu_per_tahun IS NOT NULL
--     AND ABS(pagu - (SELECT SUM(nilai::numeric) FROM jsonb_each_text(pagu_per_tahun) AS x(t, nilai))) > 1;
--
--   -- 3) Paket anomali tetap tanpa pagu dan tanpa breakdown. Harus 0 baris.
--   SELECT COUNT(*) FROM mv_dashboard_gabungan_satker
--   WHERE is_from_sirup = false AND (pagu > 0 OR pagu_per_tahun IS NOT NULL);
--
--   -- 4) 27 paket tender/seleksi multi-tahun yang dulu salah, sekarang harus
--   --    sama dengan pagu terumumkan di SIRUP. Harus 0 baris.
--   SELECT m.kd_rup, m.pagu, p.pagu AS pagu_sirup
--   FROM mv_dashboard_gabungan_satker m
--   JOIN api_paket_penyedia_terumumkan p ON CAST(p.kd_rup AS text) = split_part(m.kd_rup::text, ';', 1)
--   WHERE m.metode_pengadaan IN ('Tender', 'Seleksi', 'Tender Cepat', 'Pembayaran untuk Kontrak Tahun Jamak')
--     AND ABS(m.pagu - p.pagu) > 1;
--
--   -- 5) REFRESH CONCURRENTLY harus jalan (mv sudah terisi dari WITH DATA):
--   SELECT refresh_dashboard_gabungan_satker();
-- ============================================================================
