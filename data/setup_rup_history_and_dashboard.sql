-- 1. Create a Recursive View to find the ultimate newest RUP for any older RUP.
CREATE OR REPLACE VIEW view_rup_final AS
WITH RECURSIVE rup_chain(origin_rup, final_rup, depth, path) AS (
    -- Base: all initial transitions (exclude self-loops A -> A)
    SELECT 
        kd_rup_lama as origin_rup, 
        kd_rup_baru as final_rup, 
        1 as depth,
        ARRAY[kd_rup_lama] as path
    FROM history_kaji_ulang
    WHERE kd_rup_lama <> kd_rup_baru
    
    UNION ALL
    
    -- Recursive step: link the final_rup to the next transition's kd_rup_lama
    SELECT 
        c.origin_rup, 
        h.kd_rup_baru as final_rup, 
        c.depth + 1,
        c.path || h.kd_rup_lama
    FROM rup_chain c
    JOIN history_kaji_ulang h ON c.final_rup = h.kd_rup_lama
    WHERE h.kd_rup_lama <> h.kd_rup_baru 
      AND NOT (h.kd_rup_baru = ANY(c.path)) -- Prevent infinite loops
)
-- We only want the record with the maximum depth (the final destination) for each origin
SELECT origin_rup, final_rup
FROM (
    SELECT origin_rup, final_rup,
           ROW_NUMBER() OVER(PARTITION BY origin_rup ORDER BY depth DESC) as rn
    FROM rup_chain
) sub
WHERE rn = 1;


-- 2. Update view_dashboard_epurchasing_v6 to use the mapping.
CREATE OR REPLACE VIEW view_dashboard_epurchasing_v6 AS
SELECT 
    COALESCE(m.kd_rup, mapped_e.resolved_rup) as kd_rup, 
    COALESCE(m.nama_paket, mapped_e.rup_name) as rup_name,
    COALESCE(m.pagu, 0) as pagu, 
    m.tgl_pengumuman_paket, 
    m.status_aktif_rup, 
    COALESCE(m."MASTER_NAMA_PPK", 'Tidak Diketahui') as nama_ppk, 
    COALESCE(m."UNIT KERJA", 'Tidak Diketahui') as eselon1, 
    COALESCE(m."SATUAN KERJA", mapped_e.nama_satker, 'Tidak Diketahui') as satker,
    COALESCE(m.kd_klpd, mapped_e.kode_klpd) as kode_klpd,
    
    COALESCE(mapped_e.status, 'BELUM REALISASI') as status,
    COALESCE(mapped_e.total, 0) as total,
    mapped_e.kode_penyedia,
    mapped_e.order_id
FROM view_paket_penyedia_master_data m
FULL OUTER JOIN (
    -- Resolve realisasi RUP to its final destination RUP
    SELECT 
        COALESCE(rf.final_rup, e.rup_code::bigint) as resolved_rup,
        e.rup_name,
        e.nama_satker,
        e.kode_klpd,
        e.status,
        e.total,
        e.kode_penyedia,
        e.order_id
    FROM paket_e_purchasing e
    LEFT JOIN view_rup_final rf ON e.rup_code::bigint = rf.origin_rup
) mapped_e ON m.kd_rup = mapped_e.resolved_rup
WHERE (mapped_e.status NOT ILIKE '%cancel%' OR mapped_e.status IS NULL);


-- 3. Create an RPC function for the frontend to fetch history given a final RUP.
CREATE OR REPLACE FUNCTION get_rup_history(target_rup BIGINT)
RETURNS TABLE (
    kd_rup_lama BIGINT,
    kd_rup_baru BIGINT,
    jenis_revisi VARCHAR,
    alasan_kajiulang TEXT,
    tgl_kaji_ulang TIMESTAMPTZ,
    step INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE reverse_chain AS (
        -- Start with the record that targets our requested RUP
        SELECT 
            h.kd_rup_lama, h.kd_rup_baru, h.jenis_revisi, h.alasan_kajiulang, h.tgl_kaji_ulang, 
            1 as step,
            ARRAY[h.kd_rup_baru] as path
        FROM history_kaji_ulang h
        WHERE h.kd_rup_baru = target_rup AND h.kd_rup_lama <> h.kd_rup_baru
        
        UNION ALL
        
        -- Walk backwards in time
        SELECT 
            h.kd_rup_lama, h.kd_rup_baru, h.jenis_revisi, h.alasan_kajiulang, h.tgl_kaji_ulang, 
            c.step + 1,
            c.path || h.kd_rup_baru
        FROM reverse_chain c
        JOIN history_kaji_ulang h ON h.kd_rup_baru = c.kd_rup_lama
        WHERE h.kd_rup_lama <> h.kd_rup_baru 
          AND NOT (h.kd_rup_lama = ANY(c.path)) -- Prevent infinite loops
    )
    SELECT rc.kd_rup_lama, rc.kd_rup_baru, rc.jenis_revisi, rc.alasan_kajiulang, rc.tgl_kaji_ulang, rc.step 
    FROM reverse_chain rc
    ORDER BY rc.step DESC;
END;
$$ LANGUAGE plpgsql;
