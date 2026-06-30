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
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('PCT_DESC');
  const [showAbnormal, setShowAbnormal] = useState(false);

  // Drill-down states
  const [selectedEselon1, setSelectedEselon1] = useState<string | null>(null);
  const [selectedSatker, setSelectedSatker] = useState<string | null>(null);
  const [selectedPPK, setSelectedPPK] = useState<string | null>(null);
  
  // History State
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch History Effect
  useEffect(() => {
    if (isModalOpen && selectedItem) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const { data, error } = await supabase.rpc('get_rup_history', {
            target_rup: parseInt(selectedItem.rup_code)
          });
          if (error) throw error;
          setHistoryData(data || []);
        } catch (e) {
          console.error("Failed to fetch history", e);
          setHistoryData([]);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    } else {
      setHistoryData([]);
    }
  }, [isModalOpen, selectedItem]);

  useEffect(() => {
    async function fetchData() {
      try {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from('view_dashboard_epurchasing_v6')
            .select('*')
            .range(offset, offset + limit - 1);
            
          if (error) throw error;
          if (!data || data.length === 0) break;
          
          allData = [...allData, ...data];
          if (data.length < limit) break;
          offset += limit;
        }

        if (allData.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const formattedData = allData.map(r => ({
          rup_code: r.kd_rup,
          rup_name: r.rup_name || 'Tanpa Nama',
          pagu: Number(r.pagu) || 0,
          total: Number(r.total) || 0,
          status: r.status,
          kode_penyedia: r.kode_penyedia,
          order_id: r.order_id,
          tgl_pengumuman_paket: r.tgl_pengumuman_paket,
          status_aktif_rup: r.status_aktif_rup,
          nama_ppk: r.nama_ppk || 'Tidak Diketahui',
          eselon1: r.eselon1 || 'Tidak Diketahui',
          satker: r.satker || 'Tidak Diketahui',
          kode_klpd: r.kode_klpd
        }));

        setData(formattedData);
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

  const STATUS_CLUSTERS = [
    { label: 'SUDAH REALISASI', values: ['PAYMENT_OUTSIDE_SYSTEM', 'COMPLETED'] },
    { label: 'PROSES', values: ['ON_PROCESS', 'WAITING_PPK_REVIEW', 'ON_NEGOTIATION', 'WAITING_SELLER_CONFIRMATION'] },
    { label: 'BELUM REALISASI', values: ['BELUM REALISASI'] },
  ];

  // First apply only the hierarchical drill-down filters to get the "Base" Context for Total Pagu
  const baseData = data.filter((p) => {
    const matchesEselon1 = !selectedEselon1 || p.eselon1 === selectedEselon1;
    const matchesSatker = !selectedSatker || p.satker === selectedSatker;
    const matchesPPK = !selectedPPK || p.nama_ppk === selectedPPK;
    return matchesEselon1 && matchesSatker && matchesPPK;
  });

  // Then apply search and status filters on top of the base data
  const filteredData = baseData.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (p.rup_name && p.rup_name.toLowerCase().includes(query)) ||
      (p.rup_code && String(p.rup_code).toLowerCase().includes(query)) ||
      (p.kode_penyedia && p.kode_penyedia.toLowerCase().includes(query));

    const matchesStatus = statusFilter.length === 0 || statusFilter.some(clusterLabel => {
      const cluster = STATUS_CLUSTERS.find(c => c.label === clusterLabel);
      return cluster ? cluster.values.includes(p.status) : false;
    });
    const matchesAbnormal = !showAbnormal || ((p.total || 0) > (p.pagu || 0));

    return matchesSearch && matchesStatus && matchesAbnormal;
  });

  // Calculate stats based on current view
  const totalPaket = filteredData.length;
  // Total Pagu is locked to the original base data (ignores search & status filters)
  const totalPagu = baseData.reduce((s, d) => s + (d.pagu || 0), 0);
  // Total Realisasi strictly follows what is currently filtered
  const totalRealisasi = filteredData.reduce((s, d) => s + (d.total || 0), 0);
  const persentase = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : 0;

  // Hierarchical Data Grouping (only relevant when we are not viewing the deepest level)
  let groupedData: { name: string; totalPagu: number; totalRealisasi: number; count: number }[] = [];
  let viewMode = 'ESELON1'; // ESELON1, SATKER, PPK, PAKET

  const sortGroupedData = (groups: Record<string, any>) => {
    return Object.values(groups).sort((a, b) => {
      const pctA = a.totalPagu > 0 ? (a.totalRealisasi / a.totalPagu) * 100 : 0;
      const pctB = b.totalPagu > 0 ? (b.totalRealisasi / b.totalPagu) * 100 : 0;
      switch (sortBy) {
        case 'PAGU_ASC': return a.totalPagu - b.totalPagu;
        case 'REAL_DESC': return b.totalRealisasi - a.totalRealisasi;
        case 'REAL_ASC': return a.totalRealisasi - b.totalRealisasi;
        case 'PCT_DESC': return pctB - pctA;
        case 'PCT_ASC': return pctA - pctB;
        case 'PAGU_DESC':
        default: return b.totalPagu - a.totalPagu;
      }
    });
  };

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
    groupedData = sortGroupedData(groups);
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
    groupedData = sortGroupedData(groups);
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
    groupedData = sortGroupedData(groups);
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
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, selectedEselon1, selectedSatker, selectedPPK]);

  // Sort packages for the lowest level view
  const sortedPackages = [...filteredData].sort((a, b) => {
    const paguA = a.pagu || 0;
    const paguB = b.pagu || 0;
    const realA = a.total || 0;
    const realB = b.total || 0;
    const pctA = paguA > 0 ? (realA / paguA) * 100 : 0;
    const pctB = paguB > 0 ? (realB / paguB) * 100 : 0;
    
    switch (sortBy) {
      case 'PAGU_ASC': return paguA - paguB;
      case 'REAL_DESC': return realB - realA;
      case 'REAL_ASC': return realA - realB;
      case 'PCT_DESC': return pctB - pctA;
      case 'PCT_ASC': return pctA - pctB;
      case 'PAGU_DESC':
      default: return paguB - paguA;
    }
  });

  const totalPages = Math.ceil(sortedPackages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = sortedPackages.slice(startIndex, startIndex + itemsPerPage);

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
          borderRadius: '12px', 
          padding: '14px 16px', 
          cursor: 'pointer', 
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => handleGroupClick(item.name)}
      >
        {/* Top: Title & Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.2px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 12 }} title={item.name}>{item.name}</h3>
          <span style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{item.count} Paket</span>
        </div>

        {/* Middle: Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${clampedPct}%`, 
                background: themeColor,
                boxShadow: `0 0 8px ${glowColor}`,
                borderRadius: 3,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} 
            />
          </div>
          <span style={{ color: themeColor, fontSize: 13, fontWeight: 700, width: '40px', textAlign: 'right' }}>{pct.toFixed(1)}%</span>
        </div>

        {/* Bottom: Detailed Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'var(--bg-page)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 2 }}>Pagu</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{fmtRupiah(item.totalPagu)}</strong>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 2 }}>Realisasi</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: themeColor, textShadow: `0 0 8px ${glowColor}` }}>{fmtRupiah(item.totalRealisasi)}</strong>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 2 }}>Sisa</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{fmtRupiah(sisaPagu)}</strong>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Cari nama paket, kode RUP, penyedia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 300px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
              />
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: showAdvanced ? 'var(--info-100)' : 'var(--surface)', color: showAdvanced ? 'var(--info-700)' : 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {showAdvanced ? 'Tutup Filter Lanjutan' : 'Filter Lanjutan'}
                {(statusFilter.length > 0 || sortBy !== 'PAGU_DESC' || showAbnormal) && (
                  <Badge variant="info">Aktif</Badge>
                )}
              </button>
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                      {/* Status Toggle */}
                      <div>
                        <h4 style={{ fontSize: 13, margin: '0 0 10px', color: 'var(--text-secondary)' }}>Pilih Status Paket (Bisa Lebih Dari Satu)</h4>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {STATUS_CLUSTERS.map((cluster) => {
                            const isSelected = statusFilter.includes(cluster.label);
                            return (
                              <button
                                key={cluster.label}
                                onClick={() => {
                                  if (isSelected) {
                                    setStatusFilter(statusFilter.filter(s => s !== cluster.label));
                                  } else {
                                    setStatusFilter([...statusFilter, cluster.label]);
                                  }
                                }}
                                style={{ 
                                  padding: '6px 12px', borderRadius: '20px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                  background: isSelected ? 'var(--info-600)' : 'var(--surface)', 
                                  color: isSelected ? 'white' : 'var(--text-secondary)',
                                  border: `1px solid ${isSelected ? 'var(--info-600)' : 'var(--border)'}`,
                                  transition: 'all 0.2s'
                                }}
                              >
                                {cluster.label}
                              </button>
                            );
                          })}
                          {statusFilter.length > 0 && (
                            <button onClick={() => setStatusFilter([])} style={{ background: 'none', border: 'none', color: 'var(--red-500)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: '6px' }}>Reset Status</button>
                          )}
                        </div>
                      </div>

                      {/* Sorting Option via Buttons */}
                      <div>
                        <h4 style={{ fontSize: 13, margin: '0 0 10px', color: 'var(--text-secondary)' }}>Urutkan Data Berdasarkan</h4>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {[
                            { value: 'PAGU_DESC', label: 'Pagu Tertinggi' },
                            { value: 'PAGU_ASC', label: 'Pagu Terendah' },
                            { value: 'REAL_DESC', label: 'Realisasi Tertinggi' },
                            { value: 'REAL_ASC', label: 'Realisasi Terendah' },
                            { value: 'PCT_DESC', label: 'Persentase Tertinggi' },
                            { value: 'PCT_ASC', label: 'Persentase Terendah' },
                          ].map((opt) => {
                            const isSelected = sortBy === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setSortBy(opt.value)}
                                style={{
                                  padding: '8px 14px', borderRadius: '20px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                  background: isSelected ? 'var(--teal-600)' : 'var(--surface)',
                                  color: isSelected ? 'white' : 'var(--text-secondary)',
                                  border: `1px solid ${isSelected ? 'var(--teal-600)' : 'var(--border)'}`,
                                  transition: 'all 0.2s',
                                  boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.2)' : 'none'
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Abnormal Toggle */}
                      <div>
                        <h4 style={{ fontSize: 13, margin: '0 0 10px', color: 'var(--text-secondary)' }}>Kategori Paket</h4>
                        <button
                          onClick={() => setShowAbnormal(!showAbnormal)}
                          style={{ 
                            padding: '8px 14px', borderRadius: '20px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            background: showAbnormal ? 'var(--red-600)' : 'var(--surface)', 
                            color: showAbnormal ? 'white' : 'var(--red-600)',
                            border: `1px solid var(--red-600)`,
                            transition: 'all 0.2s',
                            boxShadow: showAbnormal ? '0 4px 12px rgba(220, 38, 38, 0.2)' : 'none',
                            display: 'flex', alignItems: 'center', gap: 6
                          }}
                        >
                          {showAbnormal ? '✕ Batal Filter Abnormal' : '⚠ Paket Abnormal (Realisasi > Pagu)'}
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: 8 }}>
                      <button 
                        onClick={() => { setSortBy('PCT_DESC'); setStatusFilter([]); }}
                        style={{ padding: '8px 16px', background: 'var(--red-100)', color: 'var(--red-600)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Reset Semua Filter & Urutan
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', willChange: 'transform', display: 'flex', flexDirection: 'column', gap: 6 }}
                  onClick={() => { setSelectedItem(p); setIsModalOpen(true); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }} title={p.rup_name}>{p.rup_name}</p>
                    <Badge variant={p.status === 'COMPLETED' ? 'rendah' : 'sedang'} style={{ padding: '2px 6px', fontSize: 9 }}>{p.status}</Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-page)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }} title="Kode RUP">RUP: {p.rup_code || '-'}</span>
                      <span>Pagu: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtRupiah(p.pagu)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>Realisasi: <strong style={{ fontFamily: 'var(--font-mono)', color: ((p.total || 0) > (p.pagu || 0)) ? 'var(--red-600)' : 'var(--text-primary)' }}>{fmtRupiah(p.total)}</strong></span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: ((p.total || 0) > (p.pagu || 0)) ? 'var(--red-600)' : 'var(--teal-700)', background: ((p.total || 0) > (p.pagu || 0)) ? 'var(--red-100)' : 'var(--teal-100)', padding: '2px 6px', borderRadius: 4 }}>{p.pagu > 0 ? ((p.total / p.pagu) * 100).toFixed(1) : 0}%</strong>
                    </div>
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
            
            {/* History Section */}
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Riwayat Kaji Ulang RUP
                {loadingHistory && <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>Memuat...</span>}
              </h4>
              
              {!loadingHistory && historyData.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>
                  Tidak ada riwayat kaji ulang (perubahan) untuk RUP ini.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                  {historyData.map((hist, index) => {
                    const isLast = index === historyData.length - 1;
                    return (
                      <div key={index} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                        {/* Timeline Graphic */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--teal-500)', zIndex: 1, border: '2px solid var(--surface)' }} />
                          {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--border)', margin: '4px 0' }} />}
                        </div>
                        
                        {/* Content */}
                        <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1 }}>
                          <div style={{ background: 'var(--bg-page)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <Badge variant="info">{hist.jenis_revisi}</Badge>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                {new Date(hist.tgl_kaji_ulang).toLocaleString('id-ID')}
                              </span>
                            </div>
                            
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 6px', fontWeight: 500 }}>
                              RUP {hist.kd_rup_lama} ➔ <span style={{ color: 'var(--teal-600)' }}>RUP {hist.kd_rup_baru}</span>
                            </p>
                            
                            {hist.alasan_kajiulang && (
                              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', background: 'var(--surface)', padding: '6px 10px', borderRadius: '4px' }}>
                                "{hist.alasan_kajiulang}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
