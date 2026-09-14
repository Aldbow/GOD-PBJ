-- ============================================================================
-- CROSSWALK KODE SATKER (ALIAS) — jembatani kode satker feed E-Purchasing ke
-- KODE SATKER_str resmi di master_data.
-- ----------------------------------------------------------------------------
-- MASALAH
--   Sebagian paket di tabel realisasi E-Purchasing memakai kode satker yang
--   TIDAK ada di RUP terumumkan maupun di master_data. Kode itu sebenarnya
--   unit yang sama, hanya kodenya berbeda di feed E-Purchasing:
--     450922 (BIRO PERENCANAAN)        -> 450938 (Sekretariat Jenderal)
--     451310 (DITJEN PHI DAN JAMSOS)   -> 451270 (Ditjen PHI dan Jamsos)
--   Akibatnya paket E-Purchasing yang TIDAK punya RUP (tidak bisa di-link ke
--   master lewat kd_rup) gagal di-rollup: eselon1 jatuh ke 'Tidak Diketahui'.
--
-- SOLUSI (Opsi 1 — berbasis KODE, bukan nama)
--   Tabel crosswalk kode_alias -> kode_master (KODE SATKER_str di master_data).
--   View E-Purchasing memakai tabel ini sebagai fallback tambahan (lihat
--   create_view_dashboard_epurchasing_v6.sql). Karena UNIT KERJA (eselon1)
--   konstan per KODE SATKER_str, resolusi via kode aman & deterministik.
--
-- CARA PAKAI
--   1. Jalankan file ini di Supabase SQL Editor (buat + seed tabel).
--   2. Jalankan create_view_dashboard_epurchasing_v6.sql (view yang sudah
--      memakai tabel ini).
--   3. Untuk menambah alias baru, INSERT baris baru (lihat query deteksi di
--      bagian bawah untuk menemukan kode E-Purchasing yang belum terpetakan).
-- ============================================================================

CREATE TABLE IF NOT EXISTS satker_kode_alias (
    kode_alias   TEXT PRIMARY KEY,   -- kode_satker sebagaimana muncul di paket_e_purchasing
    kode_master  TEXT NOT NULL,      -- KODE SATKER_str yang sah di master_data
    satuan_kerja TEXT,               -- nama satker kanonik utk display (opsional)
    keterangan   TEXT
);

-- Seed alias yang sudah teridentifikasi (idempotent) --------------------------
INSERT INTO satker_kode_alias (kode_alias, kode_master, satuan_kerja, keterangan) VALUES
    ('450922', '450938', 'Biro Perencanaan dan Manajemen Kinerja',
     'E-Purchasing-only; unit = Biro Perencanaan (Sekretariat Jenderal)'),
    ('451310', '451270', 'Ditjen Pembinaan Hubungan Industrial dan Jaminan Sosial Tenaga Kerja',
     'E-Purchasing-only; unit = Ditjen PHI dan Jamsos')
ON CONFLICT (kode_alias) DO UPDATE
    SET kode_master  = EXCLUDED.kode_master,
        satuan_kerja = EXCLUDED.satuan_kerja,
        keterangan   = EXCLUDED.keterangan;

-- ============================================================================
-- DETEKSI kode E-Purchasing yang BELUM terpetakan (kandidat alias baru)
-- ----------------------------------------------------------------------------
-- Kode satker E-Purchasing yang tidak ada di master_data (via LTRIM leading-0)
-- dan belum ada di crosswalk. Jalankan berkala untuk menjaga cakupan.
--
--   SELECT e.kode_satker,
--          MAX(e.nama_satker)             AS nama_satker_epurchasing,
--          COUNT(*)                        AS jumlah_paket,
--          SUM(COALESCE(e.total, 0))       AS total_realisasi
--   FROM paket_e_purchasing e
--   WHERE e.kode_satker IS NOT NULL
--     AND NOT EXISTS (
--         SELECT 1 FROM master_data m
--         WHERE LTRIM(m."KODE SATKER_str", '0') = LTRIM(e.kode_satker, '0')
--     )
--     AND NOT EXISTS (
--         SELECT 1 FROM satker_kode_alias a
--         WHERE LTRIM(a.kode_alias, '0') = LTRIM(e.kode_satker, '0')
--     )
--   GROUP BY e.kode_satker
--   ORDER BY total_realisasi DESC;
-- ============================================================================
