-- ============================================================================
-- Tabel ai_kurasi_paket (hasil AI Kurasi) — DDL bersih untuk setup baru.
-- ----------------------------------------------------------------------------
-- Diekstrak dari migrate_kurasi_to_separate_table.sql, TANPA bagian migrasi data
-- dari kolom lama (INSERT ... SELECT) yang hanya relevan untuk DB lama.
-- Di setup baru tabel ini boleh mulai KOSONG; diisi oleh fitur AI Kurasi aplikasi.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_kurasi_paket (
    kd_rup BIGINT PRIMARY KEY,
    status_kurasi TEXT,
    catatan_kurasi TEXT,
    rekomendasi_kurasi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
