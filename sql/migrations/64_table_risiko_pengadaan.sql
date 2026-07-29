-- Tabel hasil agregat modul "Risiko Pengadaan" — satu baris per kd_rup (bisa berupa string
-- gabungan "a;b" untuk paket yang punya beberapa RUP dalam satu transaksi, karenanya PK TEXT
-- bukan BIGINT seperti ai_kurasi_paket). Diisi oleh POST /api/risiko/recalculate/{penyedia,swakelola}
-- (mirip pola ai_kurasi_paket -> lihat 18_table_ai_kurasi_paket.sql), dibaca langsung oleh
-- frontend halaman Risiko Pengadaan. Tidak pakai RLS, konsisten dengan seluruh tabel data lain
-- di proyek ini (RLS untuk tabel data didokumentasikan sebagai fase lanjutan di 00_rbac_schema.sql).
CREATE TABLE IF NOT EXISTS risiko_pengadaan (
    kd_rup TEXT PRIMARY KEY,
    jenis_paket TEXT NOT NULL,
    nama_paket TEXT,
    satker TEXT,
    eselon1 TEXT,
    nama_ppk TEXT,
    tahun_anggaran INTEGER,
    pagu NUMERIC,
    metode_pengadaan TEXT,
    jenis_pengadaan TEXT,
    sumber_dana TEXT,
    tipe_swakelola TEXT,
    total_score NUMERIC,
    max_score NUMERIC NOT NULL,
    kategori TEXT NOT NULL,
    main_risk_driver TEXT,
    execution_status TEXT,
    execution_evidence_source TEXT,
    execution_evidence_date DATE,
    jumlah_revisi INTEGER,
    data_quality_flags TEXT[] NOT NULL DEFAULT '{}',
    components_json JSONB,
    revision_chain_json JSONB,
    transaction_refs_json JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    rules_version TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risiko_pengadaan_kategori ON risiko_pengadaan (kategori);
CREATE INDEX IF NOT EXISTS idx_risiko_pengadaan_jenis_paket ON risiko_pengadaan (jenis_paket);
