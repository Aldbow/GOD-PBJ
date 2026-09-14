CREATE TABLE IF NOT EXISTS history_kaji_ulang (
    id SERIAL PRIMARY KEY,
    jenis_klpd VARCHAR(255),
    jenis_revisi VARCHAR(255),
    kd_satker BIGINT,
    kd_satker_str VARCHAR(255),
    tahun_anggaran INTEGER,
    jenis_paket VARCHAR(255),
    kd_klpd VARCHAR(255),
    nama_klpd VARCHAR(255),
    nama_satker VARCHAR(255),
    tgl_kaji_ulang TIMESTAMPTZ,
    alasan_kajiulang TEXT,
    kd_rup_baru BIGINT,
    kd_rup_lama BIGINT,
    last_update_ref VARCHAR(255)
);
