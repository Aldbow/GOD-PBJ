"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';

export function EPurchasingView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drill-down states
  const [selectedEselon1, setSelectedEselon1] = useState<string | null>(null);
  const [selectedSatker, setSelectedSatker] = useState<string | null>(null);
  const [selectedPPK, setSelectedPPK] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch realisasi (exclude cancelled)
        const { data: realisasi, error: err1 } = await supabase
          .from('paket_e_purchasing')
          .select('*')
          .not('status', 'ilike', '%cancel%')
          .limit(2000);
        if (err1) throw err1;

        if (!realisasi || realisasi.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // 2. Extract RUPs to join
        const rups = realisasi.map(r => r.rup_code).filter(Boolean);

        // 3. Fetch matching master data to get PAGU, Eselon 1, Satker, PPK
        let paketMap: Record<string, any> = {};
        if (rups.length > 0) {
          const { data: paket, error: err2 } = await supabase
            .from('view_paket_penyedia_master_data')
            .select('kd_rup, pagu, tgl_pengumuman_paket, status_aktif_rup, MASTER_NAMA_PPK, "UNIT KERJA", "SATUAN KERJA"')
            .in('kd_rup', rups);
            
          if (err2) throw err2;
          
          if (paket) {
            paket.forEach(p => {
              paketMap[p.kd_rup] = p;
            });
          }
        }

        // 4. Join them
        const combined = realisasi.map(r => {
          const p = paketMap[r.rup_code];
          return {
            ...r,
            pagu: p?.pagu || 0,
            tgl_pengumuman_paket: p?.tgl_pengumuman_paket,
            status_aktif_rup: p?.status_aktif_rup,
            nama_ppk: p?.MASTER_NAMA_PPK || 'Tidak Diketahui',
            eselon1: p?.['UNIT KERJA'] || 'Tidak Diketahui',
            satker: p?.['SATUAN KERJA'] || r.nama_satker || 'Tidak Diketahui',
          };
        });

        setData(combined);
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

  const uniqueStatuses = Array.from(new Set(data.map(p => p.status).filter(Boolean)));

  const filteredData = data.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (p.rup_name && p.rup_name.toLowerCase().includes(query)) ||
      (p.rup_code && String(p.rup_code).toLowerCase().includes(query)) ||
      (p.kode_penyedia && p.kode_penyedia.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    // Apply drill-down filters
    const matchesEselon1 = !selectedEselon1 || p.eselon1 === selectedEselon1;
    const matchesSatker = !selectedSatker || p.satker === selectedSatker;
    const matchesPPK = !selectedPPK || p.nama_ppk === selectedPPK;

    return matchesSearch && matchesStatus && matchesEselon1 && matchesSatker && matchesPPK;
  });

  // Calculate stats based on current view
  const totalPaket = filteredData.length;
  const totalPagu = filteredData.reduce((s, d) => s + (d.pagu || 0), 0);
  const totalRealisasi = filteredData.reduce((s, d) => s + (d.total || 0), 0);
  const persentase = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : 0;

  // Hierarchical Data Grouping (only relevant when we are not viewing the deepest level)
  let groupedData: { name: string; totalPagu: number; totalRealisasi: number; count: number }[] = [];
  let viewMode = 'ESELON1'; // ESELON1, SATKER, PPK, PAKET

  if (!selectedEselon1) {
    viewMode = 'ESELON1';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.eselon1;
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (p.pagu || 0);
      groups[key].totalRealisasi += (p.total || 0);
      groups[key].count += 1;
    });
    groupedData = Object.values(groups).sort((a, b) => b.totalPagu - a.totalPagu);
  } else if (!selectedSatker) {
    viewMode = 'SATKER';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.satker;
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (p.pagu || 0);
      groups[key].totalRealisasi += (p.total || 0);
      groups[key].count += 1;
    });
    groupedData = Object.values(groups).sort((a, b) => b.totalPagu - a.totalPagu);
  } else if (!selectedPPK) {
    viewMode = 'PPK';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.nama_ppk;
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (p.pagu || 0);
      groups[key].totalRealisasi += (p.total || 0);
      groups[key].count += 1;
    });
    groupedData = Object.values(groups).sort((a, b) => b.totalPagu - a.totalPagu);
  } else {
    viewMode = 'PAKET';
  }

  const handleGroupClick = (name: string) => {
    if (viewMode === 'ESELON1') setSelectedEselon1(name);
    else if (viewMode === 'SATKER') setSelectedSatker(name);
    else if (viewMode === 'PPK') setSelectedPPK(name);
  };

  const handleBreadcrumbClick = (level: string) => {
    if (level === 'ALL') {
      setSelectedEselon1(null);
      setSelectedSatker(null);
      setSelectedPPK(null);
    } else if (level === 'ESELON1') {
      setSelectedSatker(null);
      setSelectedPPK(null);
    } else if (level === 'SATKER') {
      setSelectedPPK(null);
    }
  };

  // Pagination for Paket view
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedEselon1, selectedSatker, selectedPPK]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const renderHierarchyCard = (item: { name: string; totalPagu: number; totalRealisasi: number; count: number }) => {
    const pct = item.totalPagu > 0 ? (item.totalRealisasi / item.totalPagu) * 100 : 0;
    const clampedPct = Math.min(Math.max(pct, 0), 100);
    const sisaPagu = Math.max(item.totalPagu - item.totalRealisasi, 0);
    
    // Dynamic glow and color based on realization percentage
    const themeColor = clampedPct > 75 ? '#06b6d4' : clampedPct > 40 ? '#f97316' : '#ef4444'; // Neon Cyan, Orange, Red
    const glowColor = clampedPct > 75 ? 'rgba(6, 182, 212, 0.4)' : clampedPct > 40 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const bgTint = clampedPct > 75 ? 'rgba(6, 182, 212, 0.03)' : clampedPct > 40 ? 'rgba(249, 115, 22, 0.03)' : 'rgba(239, 68, 68, 0.03)';

    return (
      <motion.div
        key={item.name}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01, y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
        transition={{ duration: 0.2 }}
        style={{ 
          background: `linear-gradient(135deg, var(--surface) 40%, ${bgTint})`, 
          border: '1px solid var(--border)', 
          borderRadius: '24px', 
          padding: '28px', 
          cursor: 'pointer', 
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => handleGroupClick(item.name)}
      >
        {/* Top: Title & Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.3, flex: 1, paddingRight: 16 }}>{item.name}</h3>
          <span style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: '30px', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{item.count} Paket</span>
        </div>

        {/* Middle: Data-Rich Progress Bar */}
        <div style={{ position: 'relative', padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            <span>0%</span>
            <span style={{ color: themeColor, fontSize: 22, transform: 'translateY(-6px)' }}>{pct.toFixed(1)}%</span>
            <span>100%</span>
          </div>
          
          <div style={{ position: 'relative', width: '100%', height: 16, background: 'var(--gray-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${clampedPct}%`, 
                background: themeColor,
                boxShadow: `0 0 12px ${glowColor}`,
                borderRadius: 8,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} 
            />
          </div>
          
          {/* Markers */}
          <div style={{ position: 'absolute', bottom: -2, left: '50%', width: 2, height: 8, background: 'var(--gray-400)' }}></div>
          <div style={{ position: 'absolute', bottom: -2, left: '25%', width: 1, height: 6, background: 'var(--gray-300)' }}></div>
          <div style={{ position: 'absolute', bottom: -2, left: '75%', width: 1, height: 6, background: 'var(--gray-300)' }}></div>
        </div>

        {/* Bottom: Detailed Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, background: 'var(--bg-page)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: 6 }}>Total Pagu</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-primary)' }}>{fmtRupiah(item.totalPagu)}</strong>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: 6 }}>Total Realisasi</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: themeColor, textShadow: `0 0 10px ${glowColor}` }}>{fmtRupiah(item.totalRealisasi)}</strong>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: 6 }}>Sisa Pagu</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-secondary)' }}>{fmtRupiah(sisaPagu)}</strong>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>Realisasi E-Purchasing V6</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Data langsung dari Supabase Database (Gabungan INAPROC & SIRUP)</p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          {error}. Pastikan URL dan KEY Supabase di .env.local valid.
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data dari Supabase...</p>
      ) : (
        <>
          {/* Breadcrumbs Navigation - Only shown when inside a level */}
          {selectedEselon1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
              <button onClick={() => handleBreadcrumbClick('ALL')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Semua Eselon 1</button>
              <span>/</span>
              {selectedSatker ? (
                <>
                  <button onClick={() => handleBreadcrumbClick('ESELON1')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>{selectedEselon1}</button>
                  <span>/</span>
                  {selectedPPK ? (
                    <>
                      <button onClick={() => handleBreadcrumbClick('SATKER')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>{selectedSatker}</button>
                      <span>/</span>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedPPK}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-primary)' }}>{selectedSatker}</span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--text-primary)' }}>{selectedEselon1}</span>
              )}
            </div>
          )}

          {/* Filters & Search - Shared across all views */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cari nama paket, kode RUP, penyedia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: '1 1 300px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ flex: '0 0 auto', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">Semua Status</option>
              {uniqueStatuses.map((status: any) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Summary Cards */}
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

          {/* Dynamic Render based on ViewMode */}
          {viewMode === 'PAKET' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentData.map((p, i) => (
                <motion.div
                  key={p.order_id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01, borderColor: 'var(--info-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  transition={{ duration: 0.15 }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', willChange: 'transform' }}
                  onClick={() => { setSelectedItem(p); setIsModalOpen(true); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{p.rup_name}</p>
                    <Badge variant={p.status === 'COMPLETED' ? 'rendah' : 'sedang'}>{p.status}</Badge>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, fontSize: 12 }}>
                    <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Penyedia</span><span style={{ fontFamily: 'var(--font-mono)' }}>{p.kode_penyedia || '-'}</span></div>
                    <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(p.pagu)}</span></div>
                    <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Realisasi</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(p.total)}</span></div>
                    <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Persentase</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-600)' }}>{p.pagu > 0 ? ((p.total / p.pagu) * 100).toFixed(1) : 0}%</span></div>
                  </div>
                </motion.div>
              ))}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <button 
                    onClick={handlePrevPage} 
                    disabled={currentPage === 1}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === 1 ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Halaman <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> dari {totalPages}
                  </span>
                  <button 
                    onClick={handleNextPage} 
                    disabled={currentPage === totalPages}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === totalPages ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {groupedData.map(renderHierarchyCard)}
            </div>
          )}
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail E-Purchasing">
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedItem.rup_name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Penyedia: <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.kode_penyedia || '-'}</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Kode RUP</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selectedItem.rup_code}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Metode Pengadaan</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>E-Purchasing</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{fmtRupiah(selectedItem.pagu)}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Realisasi</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal-600)' }}>{fmtRupiah(selectedItem.total)}</span></div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Informasi Instansi & Satker</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Instansi: {selectedItem.kode_klpd || '-'}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Satuan Kerja: {selectedItem.satker}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>PPK: {selectedItem.nama_ppk}</p>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Detail Status</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Paket: <strong style={{ color: 'var(--info-600)' }}>{selectedItem.status}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Aktif RUP: {selectedItem.status_aktif_rup === true ? 'Aktif' : 'Tidak / N/A'}</p>
              {selectedItem.tgl_pengumuman_paket && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Tanggal Pengumuman: {new Date(selectedItem.tgl_pengumuman_paket).toLocaleDateString('id-ID')}</p>}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
