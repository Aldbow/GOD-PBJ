"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Wallet, TrendingUp, ListTodo, Search, CheckCircle2, Clock, FileText, CreditCard } from 'lucide-react';

export function PengadaanLangsungView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Hierarchy State
  const [selectedEselon1, setSelectedEselon1] = useState<string | null>(null);
  const [selectedSatker, setSelectedSatker] = useState<string | null>(null);
  const [selectedPPK, setSelectedPPK] = useState<string | null>(null);
  const [selectedTipeRup, setSelectedTipeRup] = useState<string | null>(null);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // History State
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch History Effect
  useEffect(() => {
    if (selectedItem) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const { data, error } = await supabase.rpc('get_rup_history', {
            target_rup: parseInt(selectedItem.kd_rup)
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
  }, [selectedItem]);

  useEffect(() => {
    async function fetchData() {
      try {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from('view_dashboard_pengadaan_langsung')
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

        setData(allData);
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

  // Base Context (Drill-down filter applied)
  const baseData = useMemo(() => {
    let d = data;
    if (selectedEselon1) d = d.filter(item => (item.eselon1 || 'Tidak Diketahui') === selectedEselon1);
    if (selectedSatker) d = d.filter(item => (item.satker || 'Tidak Diketahui') === selectedSatker);
    if (selectedPPK) d = d.filter(item => (item.nama_ppk || 'Tidak Diketahui') === selectedPPK);
    if (selectedTipeRup) d = d.filter(item => (item.is_multiple_rup ? 'Multiple RUP' : 'Single RUP') === selectedTipeRup);
    return d;
  }, [data, selectedEselon1, selectedSatker, selectedPPK, selectedTipeRup]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return baseData;
    const q = searchQuery.toLowerCase();
    return baseData.filter(p => 
      (p.rup_name && p.rup_name.toLowerCase().includes(q)) ||
      (p.kd_rup && String(p.kd_rup).toLowerCase().includes(q)) ||
      (p.kode_penyedia && p.kode_penyedia.toLowerCase().includes(q)) ||
      (p.satker && p.satker.toLowerCase().includes(q)) ||
      (p.eselon1 && p.eselon1.toLowerCase().includes(q)) ||
      (p.nama_ppk && p.nama_ppk.toLowerCase().includes(q))
    );
  }, [baseData, searchQuery]);

  const totalPagu = data.reduce((s, d) => s + (Number(d.pagu) || 0), 0);
  
  // Realisasi and Summary calculated relative to current view or total? 
  // Let's make summary cards absolute (top-level) or contextual. Usually contextual to filteredData.
  const contextPagu = baseData.reduce((s, d) => s + (Number(d.pagu) || 0), 0);
  const contextRealisasi = filteredData.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const contextRealisasiPencatatan = filteredData.reduce((s, d) => s + (Number(d.total_pencatatan) || 0), 0);
  const contextRealisasiTransaksional = filteredData.reduce((s, d) => s + (Number(d.total_transaksional) || 0), 0);
  const contextBelumRealisasi = Math.max(0, contextPagu - contextRealisasi);

  const persentase = contextPagu > 0 ? ((contextRealisasi / contextPagu) * 100).toFixed(1) : '0.0';
  const persentaseBelumRealisasi = contextPagu > 0 ? ((contextBelumRealisasi / contextPagu) * 100).toFixed(1) : '0.0';

  const totalPaket = filteredData.length;
  const paketSelesai = filteredData.filter(p => (Number(p.total) || 0) > 0).length;
  const paketBelumSelesai = totalPaket - paketSelesai;

  // Hierarchical Data Grouping
  let groupedData: { name: string; totalPagu: number; totalRealisasi: number; count: number }[] = [];
  let viewMode = 'ESELON1'; // ESELON1, SATKER, PPK, PAKET

  const sortGroupedData = (groups: Record<string, any>) => {
    return Object.values(groups).sort((a, b) => b.totalPagu - a.totalPagu);
  };

  if (!selectedEselon1) {
    viewMode = 'ESELON1';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.eselon1 || 'Tidak Diketahui';
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (Number(p.pagu) || 0);
      groups[key].totalRealisasi += (Number(p.total) || 0);
      groups[key].count += 1;
    });
    groupedData = sortGroupedData(groups);
  } else if (!selectedSatker) {
    viewMode = 'SATKER';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.satker || 'Tidak Diketahui';
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (Number(p.pagu) || 0);
      groups[key].totalRealisasi += (Number(p.total) || 0);
      groups[key].count += 1;
    });
    groupedData = sortGroupedData(groups);
  } else if (!selectedPPK) {
    viewMode = 'PPK';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.nama_ppk || 'Tidak Diketahui';
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (Number(p.pagu) || 0);
      groups[key].totalRealisasi += (Number(p.total) || 0);
      groups[key].count += 1;
    });
    groupedData = sortGroupedData(groups);
  } else if (!selectedTipeRup) {
    viewMode = 'TIPE_RUP';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.is_multiple_rup ? 'Multiple RUP' : 'Single RUP';
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (Number(p.pagu) || 0);
      groups[key].totalRealisasi += (Number(p.total) || 0);
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
    else if (viewMode === 'TIPE_RUP') setSelectedTipeRup(name);
  };

  const handleBreadcrumbClick = (level: string) => {
    if (level === 'ALL') {
      setSelectedEselon1(null);
      setSelectedSatker(null);
      setSelectedPPK(null);
      setSelectedTipeRup(null);
    } else if (level === 'ESELON1') {
      setSelectedSatker(null);
      setSelectedPPK(null);
      setSelectedTipeRup(null);
    } else if (level === 'SATKER') {
      setSelectedPPK(null);
      setSelectedTipeRup(null);
    } else if (level === 'PPK') {
      setSelectedTipeRup(null);
    }
  };

  // Pagination for Paket view
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedEselon1, selectedSatker, selectedPPK, selectedTipeRup]);

  const sortedPackages = [...filteredData].sort((a, b) => (Number(b.pagu) || 0) - (Number(a.pagu) || 0));

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
    
    const themeColor = clampedPct > 75 ? '#06b6d4' : clampedPct > 40 ? '#f97316' : '#ef4444'; 
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.2px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 12 }} title={item.name}>{item.name}</h3>
          <span style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{item.count} Paket</span>
        </div>

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

  const renderVerticalHierarchyCard = (item: { name: string; totalPagu: number; totalRealisasi: number; count: number }, type: 'Satker' | 'PPK' | 'Tipe RUP') => {
    return (
      <motion.div
        key={item.name}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01, borderColor: 'var(--info-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        transition={{ duration: 0.15 }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', cursor: 'pointer', willChange: 'transform', display: 'flex', flexDirection: 'column', gap: 8 }}
        onClick={() => handleGroupClick(item.name)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{item.name}</p>
          <Badge variant="outline" style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}>
            {item.count} Paket
          </Badge>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>Level: <strong style={{ color: 'var(--text-primary)' }}>{type}</strong></span>
            <span>Pagu: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtRupiah(item.totalPagu)}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Realisasi: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-600)' }}>{fmtRupiah(item.totalRealisasi)}</strong></span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-700)', background: 'var(--teal-100)', padding: '2px 8px', borderRadius: 4 }}>
              {item.totalPagu > 0 ? ((item.totalRealisasi / item.totalPagu) * 100).toFixed(1) : 0}%
            </strong>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>Realisasi Pengadaan Langsung</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Data dari pencatatan Non-Tender Pengadaan Langsung (SIRUP & SIKaP)</p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          {error}. Pastikan View SQL sudah dieksekusi di Supabase.
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data dari Supabase...</p>
      ) : (
        <>
          {/* Breadcrumbs */}
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

          {/* Summary Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color="var(--info-600)" />
                Ringkasan Keuangan
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--info-600)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--info-100)', color: 'var(--info-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Anggaran (Pagu)</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(contextPagu)}</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--teal-600)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--teal-100)', color: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Realisasi Keseluruhan</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(contextRealisasi)}</p>
                      <Badge variant="default" style={{ background: 'var(--teal-100)', color: 'var(--teal-700)', border: 'none', padding: '2px 8px' }}>{persentase}%</Badge>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--indigo-500)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--indigo-100)', color: 'var(--indigo-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Realisasi Pencatatan</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(contextRealisasiPencatatan)}</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--purple-500)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--purple-100)', color: 'var(--purple-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Realisasi Transaksional</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(contextRealisasiTransaksional)}</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--amber-600)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--amber-100)', color: 'var(--amber-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ListTodo size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Sisa Anggaran</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(contextBelumRealisasi)}</p>
                      <Badge variant="default" style={{ background: 'var(--amber-100)', color: 'var(--amber-700)', border: 'none', padding: '2px 8px' }}>{persentaseBelumRealisasi}%</Badge>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* Section: Status Paket */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} color="var(--info-600)" />
                Status Paket Pengadaan Langsung
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                
                {/* Total Paket */}
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-page)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                    <Package size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Seluruh Paket</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{totalPaket}</p>
                  </div>
                </motion.div>

                {/* Selesai */}
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--teal-100)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--teal-100)', color: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--teal-700)', margin: '0 0 4px', fontWeight: 500 }}>Terdapat Realisasi</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--teal-700)' }}>{paketSelesai}</p>
                  </div>
                </motion.div>

                {/* Belum Selesai */}
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--amber-100)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--amber-100)', color: 'var(--amber-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--amber-700)', margin: '0 0 4px', fontWeight: 500 }}>Belum Terealisasi</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--amber-700)' }}>{paketBelumSelesai}</p>
                  </div>
                </motion.div>

              </div>
            </div>
            
            {/* Visual Progress Bar */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Progres Penyerapan Anggaran</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Pagu: {fmtRupiah(contextPagu)}</span>
              </div>
              <div style={{ height: 12, background: 'var(--bg-page)', borderRadius: 6, overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(persentase))}%` }} transition={{ duration: 1 }} style={{ background: 'var(--teal-600)', height: '100%' }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(persentaseBelumRealisasi))}%` }} transition={{ duration: 1 }} style={{ background: 'var(--amber-600)', height: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal-600)' }}/> Terealisasi ({persentase}%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber-600)' }}/> Sisa ({persentaseBelumRealisasi}%)</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Cari nama paket, kode RUP, penyedia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: '1 1 300px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
          </div>

          {/* Render Detail Cards for Eselon1/Satker/PPK or Vertical Cards for Pakets */}
          {viewMode === 'ESELON1' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, paddingBottom: 40 }}>
              <AnimatePresence>
                {groupedData.map(item => renderHierarchyCard(item))}
              </AnimatePresence>
            </div>
          ) : viewMode === 'SATKER' || viewMode === 'PPK' || viewMode === 'TIPE_RUP' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 40 }}>
              <AnimatePresence>
                {groupedData.map(item => renderVerticalHierarchyCard(item, viewMode === 'SATKER' ? 'Satker' : viewMode === 'PPK' ? 'PPK' : 'Tipe RUP'))}
              </AnimatePresence>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentData.map((p, i) => (
                <motion.div
                  key={p.kd_rup || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01, borderColor: 'var(--info-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  transition={{ duration: 0.15 }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', willChange: 'transform', display: 'flex', flexDirection: 'column', gap: 6 }}
                  onClick={() => { setSelectedItem(p); setIsModalOpen(true); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }} title={p.rup_name}>{p.rup_name}</p>
                    <Badge variant={(Number(p.total) || 0) > 0 ? 'rendah' : 'sedang'} style={{ padding: '2px 6px', fontSize: 9 }}>
                      {(Number(p.total) || 0) > 0 ? 'SUDAH REALISASI' : 'BELUM REALISASI'}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-page)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }} title="Kode RUP">RUP: {p.kd_rup || '-'}</span>
                      <span>Pagu: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtRupiah(Number(p.pagu))}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>Realisasi: <strong style={{ fontFamily: 'var(--font-mono)', color: ((Number(p.total) || 0) > (Number(p.pagu) || 0)) ? 'var(--red-600)' : 'var(--text-primary)' }}>{fmtRupiah(Number(p.total))}</strong></span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: ((Number(p.total) || 0) > (Number(p.pagu) || 0)) ? 'var(--red-600)' : 'var(--teal-700)', background: ((Number(p.total) || 0) > (Number(p.pagu) || 0)) ? 'var(--red-100)' : 'var(--teal-100)', padding: '2px 6px', borderRadius: 4 }}>
                        {Number(p.pagu) > 0 ? ((Number(p.total) / Number(p.pagu)) * 100).toFixed(1) : 0}%
                      </strong>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {sortedPackages.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                  Tidak ada data ditemukan
                </div>
              )}
              
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
          )}
        </>
      )}

      {/* Detail Card Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail Pengadaan Langsung">
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedItem.rup_name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Penyedia (Kontraktor)</p>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{selectedItem.kode_penyedia || 'Tidak Diketahui'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Kode RUP</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selectedItem.kd_rup}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Metode Pengadaan</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>Pengadaan Langsung</span></div>
              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--border)', margin: '8px 0' }} />
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>{fmtRupiah(Number(selectedItem.pagu))}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Realisasi Keseluruhan</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal-600)', fontWeight: 700 }}>{fmtRupiah(Number(selectedItem.total))}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>- Realisasi (Pencatatan)</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{fmtRupiah(Number(selectedItem.total_pencatatan || 0))}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>- Realisasi (Transaksional)</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{fmtRupiah(Number(selectedItem.total_transaksional || 0))}</span></div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Informasi Instansi & Satker</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Eselon 1: {selectedItem.eselon1 || '-'}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Satuan Kerja: {selectedItem.satker || '-'}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>PPK: {selectedItem.nama_ppk || '-'}</p>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Detail Status</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Paket: <strong style={{ color: 'var(--info-600)' }}>{(Number(selectedItem.total) || 0) > 0 ? 'Terdapat Realisasi' : 'Belum Ada Realisasi'}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Aktif RUP: {selectedItem.status_aktif_rup === true ? 'Aktif' : 'Tidak / N/A'}</p>
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
                              <Badge variant="default">{hist.jenis_revisi}</Badge>
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
