"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Wallet, TrendingUp, ListTodo, Star } from 'lucide-react';


export function PrioritasNasionalView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('PCT_DESC');

  // Drill-down states from URL
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const selectedRO = searchParams.get('ro') || null;
  const selectedEselon1 = searchParams.get('e1') || null;
  const selectedSatker = searchParams.get('s') || null;
  const selectedPPK = searchParams.get('p') || null;
  
  useEffect(() => {
    async function fetchData() {
      try {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from('view_prioritas_nasional')
            .select('*')
            .range(offset, offset + limit - 1);
            
          if (error) {
            // Jika view belum dibuat, abaikan error fetch dan set empty data untuk preview UI
            if (error.code === '42P01') {
                console.warn('View view_prioritas_nasional belum dibuat di database.');
                break;
            }
            throw error;
          }
          if (!data || data.length === 0) break;
          
          allData = [...allData, ...data];
          if (data.length < limit) break;
          offset += limit;
        }

        const formattedData = allData.map(r => ({
          ...r,
          rup_code: r.kode_rup,
          rup_name: r.nama_paket_ro || 'Tanpa Nama',
          pagu: Number(r.pagu_ro) || 0,
          total: Number(r.total_realisasi) || 0,
          nama_ppk: r.nama_ppk || 'Tidak Diketahui',
          eselon1: r.eselon1 || 'Tidak Diketahui',
          satker: r.nama_satker || 'Tidak Diketahui',
          ro_name: r.RO || 'Tidak Diketahui',
          skema: r.metode_pemilihan || r.skema_ro || 'Tidak Diketahui',
          
          realisasi_swakelola: Number(r.realisasi_swakelola) || 0,
          realisasi_epurchasing: Number(r.realisasi_epurchasing) || 0,
          realisasi_pengadaan_langsung: Number(r.realisasi_pengadaan_langsung) || 0,
          realisasi_penunjukan_langsung: Number(r.realisasi_penunjukan_langsung) || 0,
        }));

        setData(formattedData);
      } catch (e: any) {
        setError(e?.message || 'Gagal memuat data dari Supabase.');
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

  // Base data based on drill-down hierarchy
  const baseData = data.filter((p) => {
    const matchesRO = !selectedRO || p.ro_name === selectedRO;
    const matchesEselon1 = !selectedEselon1 || p.eselon1 === selectedEselon1;
    const matchesSatker = !selectedSatker || p.satker === selectedSatker;
    const matchesPPK = !selectedPPK || p.nama_ppk === selectedPPK;
    return matchesRO && matchesEselon1 && matchesSatker && matchesPPK;
  });

  // Filtered data based on search
  const filteredData = baseData.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (p.rup_name && p.rup_name.toLowerCase().includes(query)) ||
      (p.rup_code && String(p.rup_code).toLowerCase().includes(query)) ||
      (p.ro_name && p.ro_name.toLowerCase().includes(query));

    return matchesSearch;
  });

  const totalPaket = filteredData.length;
  const totalPagu = filteredData.reduce((s, d) => s + (d.pagu || 0), 0);
  const totalRealisasi = filteredData.reduce((s, d) => s + (d.total || 0), 0);
  const totalBelumRealisasi = Math.max(0, totalPagu - totalRealisasi);

  const paketTerealisasi = filteredData.filter(d => (d.total || 0) > 0).length;
  const sisaPaketTerealisasi = Math.max(0, totalPaket - paketTerealisasi);

  const persentase = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : '0.0';
  const persentaseBelumRealisasi = totalPagu > 0 ? ((totalBelumRealisasi / totalPagu) * 100).toFixed(1) : '0.0';

  // Grouping logic for drill-down
  let groupedData: { name: string; totalPagu: number; totalRealisasi: number; count: number }[] = [];
  let viewMode = 'ESELON1';

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

  if (!selectedRO) {
    viewMode = 'RO';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.ro_name;
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (p.pagu || 0);
      groups[key].totalRealisasi += (p.total || 0);
      groups[key].count += 1;
    });
    groupedData = sortGroupedData(groups);
  } else if (!selectedEselon1) {
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
    const params = new URLSearchParams(searchParams.toString());
    if (viewMode === 'RO') params.set('ro', name);
    else if (viewMode === 'ESELON1') params.set('e1', name);
    else if (viewMode === 'SATKER') params.set('s', name);
    else if (viewMode === 'PPK') params.set('p', name);
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBreadcrumbClick = (level: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (level === 'ALL') {
      params.delete('ro');
      params.delete('e1');
      params.delete('s');
      params.delete('p');
    } else if (level === 'RO') {
      params.delete('e1');
      params.delete('s');
      params.delete('p');
    } else if (level === 'ESELON1') {
      params.delete('s');
      params.delete('p');
    } else if (level === 'SATKER') {
      params.delete('p');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, selectedRO, selectedEselon1, selectedSatker, selectedPPK]);

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
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>{item.name}</h3>
          <span style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px', fontSize: 11, fontWeight: 600 }}>{item.count} Paket</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', width: `${clampedPct}%`, background: themeColor,
                boxShadow: `0 0 8px ${glowColor}`, borderRadius: 3, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} 
            />
          </div>
          <span style={{ color: themeColor, fontSize: 13, fontWeight: 700, width: '40px', textAlign: 'right' }}>{pct.toFixed(1)}%</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'var(--bg-page)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Pagu</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{fmtRupiah(item.totalPagu)}</strong>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Realisasi</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: themeColor, textShadow: `0 0 8px ${glowColor}` }}>{fmtRupiah(item.totalRealisasi)}</strong>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Sisa</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{fmtRupiah(sisaPagu)}</strong>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Star color="#f59e0b" fill="#f59e0b" size={24} /> 
          Program Prioritas Nasional
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Pemantauan Master Data RO dan Agregasi Realisasi Terpadu</p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          {error}. Pastikan view_prioritas_nasional sudah dieksekusi di Supabase.
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data dari Supabase...</p>
      ) : (
        <>
          {selectedRO && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
              <button onClick={() => handleBreadcrumbClick('ALL')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Semua Rincian Output</button>
              <span>/</span>
              {selectedEselon1 ? (
                <>
                  <button onClick={() => handleBreadcrumbClick('RO')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }} title={selectedRO}>{selectedRO.length > 20 ? selectedRO.substring(0, 20) + '...' : selectedRO}</button>
                  <span>/</span>
                  {selectedSatker ? (
                    <>
                      <button onClick={() => handleBreadcrumbClick('ESELON1')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }} title={selectedEselon1}>{selectedEselon1.length > 20 ? selectedEselon1.substring(0, 20) + '...' : selectedEselon1}</button>
                      <span>/</span>
                      {selectedPPK ? (
                        <>
                          <button onClick={() => handleBreadcrumbClick('SATKER')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }} title={selectedSatker}>{selectedSatker.length > 20 ? selectedSatker.substring(0, 20) + '...' : selectedSatker}</button>
                          <span>/</span>
                          <span style={{ color: 'var(--text-primary)' }} title={selectedPPK}>{selectedPPK.length > 20 ? selectedPPK.substring(0, 20) + '...' : selectedPPK}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-primary)' }} title={selectedSatker}>{selectedSatker.length > 20 ? selectedSatker.substring(0, 20) + '...' : selectedSatker}</span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-primary)' }} title={selectedEselon1}>{selectedEselon1.length > 20 ? selectedEselon1.substring(0, 20) + '...' : selectedEselon1}</span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--text-primary)' }} title={selectedRO}>{selectedRO.length > 20 ? selectedRO.substring(0, 20) + '...' : selectedRO}</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color="var(--info-600)" />
                Ringkasan Prioritas Nasional
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Baris Pertama: Metrik Keuangan */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                  <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', borderLeft: '4px solid var(--info-600)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Pagu (RO)</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(totalPagu)}</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', borderLeft: '4px solid var(--teal-600)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Realisasi Gabungan</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(totalRealisasi)}</p>
                      <Badge variant="default" style={{ background: 'var(--teal-100)', color: 'var(--teal-700)' }}>{persentase}%</Badge>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', borderLeft: '4px solid var(--amber-600)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Sisa Anggaran</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(totalBelumRealisasi)}</p>
                      <Badge variant="default" style={{ background: 'var(--amber-100)', color: 'var(--amber-700)' }}>{persentaseBelumRealisasi}%</Badge>
                    </div>
                  </motion.div>
                </div>

                {/* Baris Kedua: Metrik Paket */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                  <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', borderLeft: '4px solid var(--blue-600)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Paket</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={20} color="var(--blue-600)" />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{totalPaket}</p>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', borderLeft: '4px solid var(--emerald-600)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Paket Terealisasi</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ListTodo size={20} color="var(--emerald-600)" />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{paketTerealisasi}</p>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', borderLeft: '4px solid var(--orange-600)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Sisa Paket Belum Terealisasi</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={20} color="var(--orange-600)" />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{sisaPaketTerealisasi}</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Progres Penyerapan Anggaran</span>
              </div>
              <div style={{ height: 12, background: 'var(--bg-page)', borderRadius: 6, overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(persentase))}%` }} transition={{ duration: 1 }} style={{ background: 'var(--teal-600)', height: '100%' }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(persentaseBelumRealisasi))}%` }} transition={{ duration: 1 }} style={{ background: 'var(--amber-600)', height: '100%' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Cari nama paket, RO, kode RUP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 300px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
              />
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: showAdvanced ? 'var(--info-100)' : 'var(--surface)', color: showAdvanced ? 'var(--info-700)' : 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Urutkan Berdasarkan
              </button>
            </div>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} 
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { value: 'PAGU_DESC', label: 'Pagu Tertinggi' },
                        { value: 'REAL_DESC', label: 'Realisasi Tertinggi' },
                        { value: 'PCT_DESC', label: 'Persentase Tertinggi' },
                      ].map((opt) => {
                        const isSelected = sortBy === opt.value;
                        return (
                          <button
                            key={opt.value} onClick={() => setSortBy(opt.value)}
                            style={{
                              padding: '8px 14px', borderRadius: '20px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                              background: isSelected ? 'var(--teal-600)' : 'var(--surface)',
                              color: isSelected ? 'white' : 'var(--text-secondary)',
                              border: `1px solid ${isSelected ? 'var(--teal-600)' : 'var(--border)'}`,
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {viewMode === 'PAKET' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentData.map((p, i) => (
                <motion.div
                  key={p.id ? `paket-${p.id}` : `paket-${i}-${p.rup_code}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01, borderColor: 'var(--info-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  transition={{ duration: 0.15 }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
                  onClick={() => { setSelectedItem(p); setIsModalOpen(true); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>{p.rup_name}</p>
                      <p style={{ fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>RO: <strong>{p.ro_name}</strong> | Metode Pemilihan: <strong>{p.skema}</strong></p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-page)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span>RUP: <strong style={{ fontFamily: 'var(--font-mono)' }}>{p.rup_code}</strong></span>
                      <span>Pagu: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtRupiah(p.pagu)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>Realisasi: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-600)' }}>{fmtRupiah(p.total)}</strong></span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-700)', background: 'var(--teal-100)', padding: '2px 6px', borderRadius: 4 }}>{p.pagu > 0 ? ((p.total / p.pagu) * 100).toFixed(1) : 0}%</strong>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <button onClick={handlePrevPage} disabled={currentPage === 1} style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === 1 ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>Sebelumnya</button>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Halaman <strong>{currentPage}</strong> dari {totalPages}</span>
                  <button onClick={handleNextPage} disabled={currentPage === totalPages} style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === totalPages ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>Selanjutnya</button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail Program Prioritas Nasional">
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedItem.rup_name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>RO: <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.ro_name}</strong></p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Kode RUP</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>{selectedItem.rup_code}</span></div>
              <div>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Metode Pemilihan</span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{selectedItem.skema || '-'}</span>
              </div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}>{fmtRupiah(selectedItem.pagu)}</span></div>
              <div>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Realisasi</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--teal-600)', fontWeight: 700 }}>{fmtRupiah(selectedItem.total)}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Persentase Realisasi</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal-600)', fontWeight: 600 }}>{selectedItem.pagu > 0 ? ((selectedItem.total / selectedItem.pagu) * 100).toFixed(1) : 0}%</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Sisa Persentase</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--amber-600)', fontWeight: 600 }}>{selectedItem.pagu > 0 ? (Math.max(0, 100 - ((selectedItem.total / selectedItem.pagu) * 100))).toFixed(1) : 0}%</span>
              </div>
            </div>



            <div style={{ background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Informasi Kepemilikan (Hierarki)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Eselon I</span><span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{selectedItem.eselon1}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Satuan Kerja</span><span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{selectedItem.satker}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nama PPK</span><span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{selectedItem.nama_ppk}</span></div>
              </div>
            </div>
            
          </div>
        )}
      </Modal>

    </motion.div>
  );
}
