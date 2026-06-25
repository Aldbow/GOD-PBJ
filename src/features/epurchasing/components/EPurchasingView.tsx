"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';

export function EPurchasingView() {
  const [rawData, setRawData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down states
  const [viewLevel, setViewLevel] = useState<'eselon' | 'satker' | 'paket'>('eselon');
  const [selectedEselon, setSelectedEselon] = useState<string | null>(null);
  const [selectedSatker, setSelectedSatker] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination for paket level
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // 1. Fetch realisasi
        const { data: realisasi, error: err1 } = await supabase.from('realisasi_inaproc').select('*').limit(1000);
        if (err1) throw err1;
        if (!realisasi || realisasi.length === 0) {
          setRawData([]);
          return;
        }

        // 2. Fetch paket
        const rups = realisasi.map(r => r['Kode RUP']).filter(Boolean);
        let paketMap: Record<string, any> = {};
        let satkerStrs: string[] = [];
        if (rups.length > 0) {
          const { data: paket, error: err2 } = await supabase
            .from('api_paket_penyedia_terumumkan')
            .select('kd_rup, pagu, kd_satker_str, tgl_pengumuman_paket, status_aktif_rup, nama_ppk')
            .in('kd_rup', rups);
          if (err2) throw err2;
          if (paket) {
            paket.forEach(p => {
              paketMap[p.kd_rup] = p;
              if (p.kd_satker_str) satkerStrs.push(p.kd_satker_str);
            });
          }
        }

        // 3. Fetch kode_satker
        let kodeSatkerMap: Record<string, string> = {};
        if (satkerStrs.length > 0) {
          const { data: kodeSatkers, error: err3 } = await supabase
            .from('kode_satker')
            .select('kd_satker_str, nama_satker')
            .in('kd_satker_str', satkerStrs);
          if (err3) throw err3;
          if (kodeSatkers) {
            kodeSatkers.forEach(k => {
              kodeSatkerMap[k.kd_satker_str] = k.nama_satker;
            });
          }
        }

        // 4. Fetch nama_satker (Eselon mapping & Master Hierarchy)
        const { data: eselonData, error: err4 } = await supabase.from('nama_satker').select('*');
        if (err4) throw err4;
        
        let eselonMap = new Map<string, string>();
        let masterHierarchy: Record<string, string[]> = {};
        
        if (eselonData) {
          eselonData.forEach(e => {
            const eselon = e['ESELON I'];
            const satuanKerja = e['SATUAN KERJA'];
            if (!eselon || !satuanKerja) return;

            // Map strict SATUAN KERJA to Eselon I
            eselonMap.set(satuanKerja.toLowerCase().trim(), eselon);

            // Build Master Hierarchy
            if (!masterHierarchy[eselon]) masterHierarchy[eselon] = [];
            if (!masterHierarchy[eselon].includes(satuanKerja)) {
              masterHierarchy[eselon].push(satuanKerja);
            }
          });
        }

        // 5. Build flattened array of active packages
        const combined = realisasi.map(r => {
          const p = paketMap[r['Kode RUP']];
          const kdSatkerStr = p?.kd_satker_str;
          const namaSatkerFromKode = kdSatkerStr ? (kodeSatkerMap[kdSatkerStr] || "") : "";
          
          const cleanSatker = namaSatkerFromKode.toLowerCase().trim();
          
          // STRICT MAPPING to SATUAN KERJA
          const eselon = eselonMap.get(cleanSatker) || "Lainnya / Belum Dipetakan";
          // We must find the EXACT casing for the SATUAN KERJA from our master list so grouping works perfectly
          const masterSatuanKerja = eselonData?.find(e => e['SATUAN KERJA']?.toLowerCase().trim() === cleanSatker)?.['SATUAN KERJA'] || namaSatkerFromKode;

          return {
            ...r,
            pagu: p?.pagu || 0,
            tgl_pengumuman_paket: p?.tgl_pengumuman_paket,
            status_aktif_rup: p?.status_aktif_rup,
            nama_ppk: p?.nama_ppk,
            kd_satker_str: kdSatkerStr,
            nama_satker_original: namaSatkerFromKode,
            satuan_kerja_master: masterSatuanKerja,
            eselon_i: eselon
          };
        });

        setRawData({ packages: combined, hierarchy: masterHierarchy });
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Gagal memuat data dari Supabase.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const fmtRupiah = (m: number) => {
    if (!m) return 'Rp 0';
    if (m >= 1e9) return 'Rp ' + (m / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (m >= 1e6) return 'Rp ' + (m / 1e6).toFixed(2).replace('.', ',') + ' Jt';
    return 'Rp ' + m.toLocaleString('id-ID');
  };

  const { packages = [], hierarchy = {} } = rawData as any;

  // Filter Packages based on Level
  let currentPackages = packages;
  if (viewLevel === 'satker' || viewLevel === 'paket') {
    currentPackages = currentPackages.filter((d: any) => d.eselon_i === selectedEselon);
  }
  if (viewLevel === 'paket') {
    currentPackages = currentPackages.filter((d: any) => d.satuan_kerja_master === selectedSatker);
  }

  // Dynamic Metrics
  const totalPaket = currentPackages.length;
  const totalPagu = currentPackages.reduce((s: number, d: any) => s + (d.pagu || 0), 0);
  const totalRealisasi = currentPackages.reduce((s: number, d: any) => s + (d['Total Nilai (Rp)'] || 0), 0);
  const persentase = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : '0.0';

  // Grouping for Eselon Level (FORCING MASTER LIST)
  const masterEselons = Object.keys(hierarchy).sort();
  // Include "Lainnya / Belum Dipetakan" if there are unmapped packages
  const unmappedEselon = packages.filter((p: any) => p.eselon_i === "Lainnya / Belum Dipetakan");
  if (unmappedEselon.length > 0 && !masterEselons.includes("Lainnya / Belum Dipetakan")) {
    masterEselons.push("Lainnya / Belum Dipetakan");
    hierarchy["Lainnya / Belum Dipetakan"] = Array.from(new Set(unmappedEselon.map((p: any) => p.satuan_kerja_master)));
  }

  const eselonGroups = masterEselons.map(eselonName => {
    const items = packages.filter((d: any) => d.eselon_i === eselonName);
    const pagu = items.reduce((s: number, d: any) => s + (d.pagu || 0), 0);
    const realisasi = items.reduce((s: number, d: any) => s + (d['Total Nilai (Rp)'] || 0), 0);
    return { name: eselonName, count: items.length, pagu, realisasi };
  });

  // Grouping for Satker Level (FORCING MASTER LIST)
  const masterSatkers = selectedEselon && hierarchy[selectedEselon] ? hierarchy[selectedEselon] : [];
  const satkerGroups = masterSatkers.map((satkerName: string) => {
    const items = packages.filter((d: any) => d.eselon_i === selectedEselon && d.satuan_kerja_master === satkerName);
    const pagu = items.reduce((s: number, d: any) => s + (d.pagu || 0), 0);
    const realisasi = items.reduce((s: number, d: any) => s + (d['Total Nilai (Rp)'] || 0), 0);
    return { name: satkerName, count: items.length, pagu, realisasi };
  });

  // Paket Pagination
  const totalPages = Math.ceil(currentPackages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPaket = viewLevel === 'paket' ? currentPackages.slice(startIndex, startIndex + itemsPerPage) : [];

  const handleBreadcrumbClick = (level: 'eselon' | 'satker') => {
    setViewLevel(level);
    setCurrentPage(1);
    if (level === 'eselon') {
      setSelectedEselon(null);
      setSelectedSatker(null);
    } else if (level === 'satker') {
      setSelectedSatker(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>Realisasi E-Purchasing V6</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Drill-down: Eselon I → Satuan Kerja → Daftar Paket</p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          {error}. Pastikan tabel Anda sudah diimport dan RLS dimatikan.
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data dari Supabase...</p>
      ) : (
        <>
          {/* BREADCRUMB */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, fontSize: 14 }}>
            <span 
              onClick={() => handleBreadcrumbClick('eselon')}
              style={{ cursor: 'pointer', fontWeight: viewLevel === 'eselon' ? 600 : 400, color: viewLevel === 'eselon' ? 'var(--text-primary)' : 'var(--info-600)' }}
            >
              Semua Eselon I
            </span>
            {selectedEselon && (
              <>
                <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                <span 
                  onClick={() => handleBreadcrumbClick('satker')}
                  style={{ cursor: 'pointer', fontWeight: viewLevel === 'satker' ? 600 : 400, color: viewLevel === 'satker' ? 'var(--text-primary)' : 'var(--info-600)' }}
                >
                  {selectedEselon}
                </span>
              </>
            )}
            {selectedSatker && (
              <>
                <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedSatker}
                </span>
              </>
            )}
          </div>

          {/* DYNAMIC METRICS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Jumlah Paket</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{totalPaket}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Total Nilai Pagu</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{fmtRupiah(totalPagu)}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Total Realisasi</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0, color: 'var(--teal-600)' }}>{fmtRupiah(totalRealisasi)}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Persentase Realisasi</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{persentase}<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span></p>
            </Card>
          </div>

          <AnimatePresence mode="wait">
            {/* LEVEL 1: ESELON I */}
            {viewLevel === 'eselon' && (
              <motion.div key="eselon" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {eselonGroups.map((e: any) => (
                  <motion.div
                    key={e.name}
                    whileHover={{ scale: 1.02, borderColor: 'var(--info-600)' }}
                    onClick={() => { setSelectedEselon(e.name); setViewLevel('satker'); }}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  >
                    <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-primary)' }}>{e.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Jumlah Paket</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{e.count}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Pagu</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(e.pagu)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Realisasi</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-600)' }}>{fmtRupiah(e.realisasi)}</strong>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* LEVEL 2: SATKER */}
            {viewLevel === 'satker' && (
              <motion.div key="satker" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {satkerGroups.map((s: any) => (
                  <motion.div
                    key={s.name}
                    whileHover={{ scale: 1.02, borderColor: 'var(--amber-600)' }}
                    onClick={() => { setSelectedSatker(s.name); setViewLevel('paket'); setCurrentPage(1); }}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  >
                    <h3 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--text-primary)' }}>{s.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Jumlah Paket</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{s.count}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Pagu</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(s.pagu)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Realisasi</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-600)' }}>{fmtRupiah(s.realisasi)}</strong>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* LEVEL 3: PAKET ROWS */}
            {viewLevel === 'paket' && (
              <motion.div key="paket" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {paginatedPaket.map((p: any, i: number) => (
                  <div
                    key={p.id}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--info-600)'; e.currentTarget.style.transform = 'scale(1.01)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    onClick={() => { setSelectedItem(p); setIsModalOpen(true); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{p['Nama Paket']}</p>
                      <Badge variant={p['Status Paket'] === 'COMPLETED' ? 'rendah' : 'sedang'}>{p['Status Paket']}</Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, fontSize: 12 }}>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Penyedia</span><span style={{ fontFamily: 'var(--font-mono)' }}>{p['Nama Penyedia']}</span></div>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(p.pagu)}</span></div>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Realisasi</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(p['Total Nilai (Rp)'])}</span></div>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Persentase</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-600)' }}>{p.pagu > 0 ? ((p['Total Nilai (Rp)'] / p.pagu) * 100).toFixed(1) : 0}%</span></div>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === 1 ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                    >
                      Sebelumnya
                    </button>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Halaman <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> dari {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === totalPages ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* MODAL DETAIL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail E-Purchasing">
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedItem['Nama Paket']}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Penyedia: <strong style={{ color: 'var(--text-primary)' }}>{selectedItem['Nama Penyedia']}</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Kode RUP</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selectedItem['Kode RUP']}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Metode Pengadaan</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selectedItem['Metode Pengadaan']}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{fmtRupiah(selectedItem.pagu)}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Realisasi</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal-600)' }}>{fmtRupiah(selectedItem['Total Nilai (Rp)'])}</span></div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Hierarki Instansi</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Eselon I: <strong>{selectedItem.eselon_i}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Satker Terpetakan: <strong>{selectedItem.satuan_kerja_master}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0', fontStyle: 'italic' }}>*Satker Original Inaproc: {selectedItem['Nama Satuan Kerja']}</p>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Detail Status</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Paket INAPROC: <strong style={{ color: 'var(--info-600)' }}>{selectedItem['Status Paket']}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Aktif RUP: {selectedItem.status_aktif_rup === true ? 'Aktif' : 'Tidak / N/A'}</p>
              {selectedItem.tgl_pengumuman_paket && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Tanggal Pengumuman: {new Date(selectedItem.tgl_pengumuman_paket).toLocaleDateString('id-ID')}</p>}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
