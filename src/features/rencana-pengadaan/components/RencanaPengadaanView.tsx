"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Select } from '@/components/ui/Select';
import { AlertCircle, ChevronLeft, ChevronRight, SearchX, Wallet, TrendingUp, Percent } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import styles from './RencanaPengadaanView.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const SORT_OPTIONS = [
  { value: 'PCT_DESC', label: 'Persentase (Tertinggi)' },
  { value: 'PCT_ASC', label: 'Persentase (Terendah)' },
  { value: 'NAMA_ASC', label: 'Nama (A-Z)' },
  { value: 'NAMA_DESC', label: 'Nama (Z-A)' },
  { value: 'BELANJA_DESC', label: 'Belanja Pengadaan (Tertinggi)' },
  { value: 'BELANJA_ASC', label: 'Belanja Pengadaan (Terendah)' },
];

export function RencanaPengadaanView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('PCT_DESC');
  const [viewMode, setViewMode] = useState<'eselon1' | 'satker'>('eselon1');

  // Chart Legend Color State (Responsive to Dark Mode)
  const [legendColor, setLegendColor] = useState('#94a3b8');

  // Tooltip state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;

        while (true) {
          const tableName = viewMode === 'eselon1' ? 'view_dashboard_keterisian_sirup_eselon1' : 'data_afirmasi_pdn_perencanaan';
          const selectFields = '*';

          const { data, error } = await supabase
            .from(tableName)
            .select(selectFields)
            .range(offset, offset + limit - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;

          allData = [...allData, ...data];
          if (data.length < limit) break;
          offset += limit;
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
  }, [viewMode]);

  // Handle Dark Mode changes for Chart.js Legend
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateColor = () => {
      // 1. Coba baca warna dari variabel CSS (jika ada)
      const cssColor = window.getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || 
                       window.getComputedStyle(document.body).getPropertyValue('--text-secondary').trim();
                       
      // 2. Cek apakah dark mode aktif via class tailwind atau OS preference
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = isDarkClass || isSystemDark;

      // 3. Fallback warna yang elegan: Slate 600 untuk Light, Slate 400 untuk Dark
      const fallbackColor = isDark ? '#94a3b8' : '#475569';
      
      setLegendColor(cssColor || fallbackColor);
    };

    updateColor(); // Initial check

    // Pantau perubahan class di <html> dan <body> (Toggle Dark Mode)
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    
    // Pantau perubahan preferensi sistem (OS level)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateColor);
    }
    
    return () => {
      observer.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateColor);
      }
    };
  }, []);

  const fmtRupiah = (m: number) => {
    if (!m) return 'Rp 0';
    if (m >= 1e9) return 'Rp ' + (m / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (m >= 1e6) return 'Rp ' + (m / 1e6).toFixed(2).replace('.', ',') + ' Jt';
    return 'Rp ' + m.toLocaleString('id-ID');
  };

  const getPercentageTheme = (pct: number) => {
    if (pct <= 30) return { grad: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)', hex: '#dc2626' };
    if (pct <= 50) return { grad: 'linear-gradient(90deg, #b45309 0%, #f59e0b 100%)', hex: '#d97706' };
    if (pct <= 80) return { grad: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)', hex: '#2563eb' };
    if (pct <= 100) return { grad: 'linear-gradient(90deg, #047857 0%, #10b981 100%)', hex: '#059669' };
    return { grad: 'linear-gradient(90deg, #991b1b 0%, #ef4444 100%)', hex: '#dc2626' };
  };

  // Filter
  const filteredData = data.filter((p) => {
    const query = searchQuery.toLowerCase();
    const name = viewMode === 'eselon1' ? p.nama_eselon1 : p.nama_satuan_kerja;
    const matchesSearch = name && name.toLowerCase().includes(query);
    return matchesSearch;
  });

  // Sort
  const sortedData = [...filteredData].sort((a, b) => {
    const namaA = (viewMode === 'eselon1' ? a.nama_eselon1 : a.nama_satuan_kerja) || '';
    const namaB = (viewMode === 'eselon1' ? b.nama_eselon1 : b.nama_satuan_kerja) || '';
    const belanjaA = Number(a.belanja_pengadaan) || 0;
    const belanjaB = Number(b.belanja_pengadaan) || 0;
    const pctA = belanjaA > 0 ? (Number(a.total_rup) / belanjaA) * 100 : 0;
    const pctB = belanjaB > 0 ? (Number(b.total_rup) / belanjaB) * 100 : 0;

    switch (sortBy) {
      case 'NAMA_ASC': return namaA.localeCompare(namaB);
      case 'NAMA_DESC': return namaB.localeCompare(namaA);
      case 'BELANJA_DESC': return belanjaB - belanjaA;
      case 'BELANJA_ASC': return belanjaA - belanjaB;
      case 'PCT_DESC': return pctB - pctA;
      case 'PCT_ASC': return pctA - pctB;
      default: return pctB - pctA;
    }
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, viewMode]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const totalRupAll = filteredData.reduce((acc, curr) => acc + (Number(curr.total_rup) || 0), 0);
  const totalBelanjaAll = filteredData.reduce((acc, curr) => acc + (Number(curr.belanja_pengadaan) || 0), 0);
  const avgPct = totalBelanjaAll > 0 ? (totalRupAll / totalBelanjaAll) * 100 : 0;

  // Chart Data Calculations
  const totalBarang = filteredData.reduce((acc, curr) => acc + (Number(curr.barang) || 0), 0);
  const totalKonstruksi = filteredData.reduce((acc, curr) => acc + (Number(curr.pekerjaan_konstruksi) || 0), 0);
  const totalKonsultasi = filteredData.reduce((acc, curr) => acc + (Number(curr.jasa_konsultasi) || 0), 0);
  const totalJasaLainnya = filteredData.reduce((acc, curr) => acc + (Number(curr.jasa_lainnya) || 0), 0);
  const totalGabungan = filteredData.reduce((acc, curr) => acc + (Number(curr.terintegrasi_gabungan) || 0), 0);

  const totalTender = filteredData.reduce((acc, curr) => acc + (Number(curr.tender_seleksi) || 0), 0);
  const totalEPurchasing = filteredData.reduce((acc, curr) => acc + (Number(curr.epurchasing) || 0), 0);
  const totalLangsung = filteredData.reduce((acc, curr) => acc + (Number(curr.pengadaan_langsung) || 0), 0);
  const totalPenunjukan = filteredData.reduce((acc, curr) => acc + (Number(curr.penunjukan_langsung) || 0), 0);
  const totalMetodeLain = filteredData.reduce((acc, curr) => acc + (Number(curr.metode_lainnya) || 0), 0);

  const totalPenyedia = filteredData.reduce((acc, curr) => acc + (Number(curr.total_perencanaan_penyedia) || 0), 0);
  const totalSwakelola = filteredData.reduce((acc, curr) => acc + (Number(curr.total_perencanaan_swakelola) || 0), 0);

  const palette1 = [
    { start: '#60a5fa', end: '#1d4ed8' }, // Blue
    { start: '#fcd34d', end: '#d97706' }, // Amber
    { start: '#34d399', end: '#047857' }, // Emerald
    { start: '#a78bfa', end: '#6d28d9' }, // Violet
    { start: '#f472b6', end: '#be185d' }, // Pink
  ];

  const palette2 = [
    { start: '#34d399', end: '#047857' }, // Emerald
    { start: '#60a5fa', end: '#1d4ed8' }, // Blue
    { start: '#fcd34d', end: '#d97706' }, // Amber
    { start: '#f87171', end: '#b91c1c' }, // Red
    { start: '#94a3b8', end: '#475569' }, // Slate
  ];

  const palette3 = [
    { start: '#a78bfa', end: '#6d28d9' }, // Violet
    { start: '#f472b6', end: '#be185d' }, // Pink
  ];

  const createGradient = (context: any, palette: { start: string; end: string }[]) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    const index = context.dataIndex;
    if (index === undefined) return '#ccc';
    
    const color = palette[index % palette.length];
    if (!chartArea) return color.start; // Fallback before render
    
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, color.start);
    gradient.addColorStop(1, color.end);
    return gradient;
  };

  const jenisBelanjaData = {
    labels: ['Barang', 'Konstruksi', 'Jasa Konsultasi', 'Jasa Lainnya', 'Gabungan'],
    datasets: [{
      data: [totalBarang, totalKonstruksi, totalKonsultasi, totalJasaLainnya, totalGabungan],
      backgroundColor: (ctx: any) => createGradient(ctx, palette1),
      borderWidth: 0,
      hoverOffset: 8,
      spacing: 4,
    }],
  };

  const metodePengadaanData = {
    labels: ['E-Purchasing', 'Tender/Seleksi', 'Pengadaan Langsung', 'Penunjukan Langsung', 'Lainnya'],
    datasets: [{
      data: [totalEPurchasing, totalTender, totalLangsung, totalPenunjukan, totalMetodeLain],
      backgroundColor: (ctx: any) => createGradient(ctx, palette2),
      borderWidth: 0,
      hoverOffset: 8,
      spacing: 4,
    }],
  };

  const pelaksanaData = {
    labels: ['Penyedia', 'Swakelola'],
    datasets: [{
      data: [totalPenyedia, totalSwakelola],
      backgroundColor: (ctx: any) => createGradient(ctx, palette3),
      borderWidth: 0,
      hoverOffset: 8,
      spacing: 4,
    }],
  };

  const chartOptions = {
    plugins: {
      legend: { position: 'left' as const, labels: { color: legendColor, padding: 16, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const value = Number(ctx.raw);
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + (Number(b) || 0), 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` Rp ${value.toLocaleString('id-ID')} (${pct}%)`;
          }
        }
      }
    },
    cutout: '45%',
    maintainAspectRatio: false,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {loading && data.length === 0 ? (
        <div className={styles.dashboardCard}>
          <div className={styles.chartContainer}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonLabel} />
                <div className={styles.skeletonBarWrapper}>
                  <div className={styles.skeletonBar} style={{ width: `${[45, 75, 30, 90, 60][i]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease', pointerEvents: loading ? 'none' : 'auto' }}>
          <div className={styles.scorecardsWrapper}>
            <div className={styles.scorecard}>
              <div className={styles.scoreIconWrap} style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.1)' }}>
                <TrendingUp size={24} />
              </div>
              <div className={styles.scoreInfo}>
                <span className={styles.scoreLabel}>Total Belanja Pengadaan</span>
                <span className={styles.scoreValue}>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalBelanjaAll)}
                </span>
              </div>
            </div>
            
            <div className={styles.scorecard}>
              <div className={styles.scoreIconWrap} style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>
                <Wallet size={24} />
              </div>
              <div className={styles.scoreInfo}>
                <span className={styles.scoreLabel}>Total RUP Terumumkan</span>
                <span className={styles.scoreValue}>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalRupAll)}
                </span>
              </div>
            </div>
            
            <div className={styles.scorecardProminent} style={{ background: getPercentageTheme(avgPct).grad }}>
              <div className={styles.scoreInfo}>
                <span className={styles.scoreLabelProminent}>Persentase Pengumuman RUP</span>
                <span className={styles.scoreValueProminent}>
                  {avgPct.toFixed(1)}%
                </span>
              </div>
              <div className={styles.scoreIconWrapProminent}>
                <Percent size={32} />
              </div>
            </div>
          </div>

          <div className={styles.analyticsPanel}>
            <div className={styles.analyticsCard}>
              <h3 className={styles.analyticsTitle}>Cara Pengadaan</h3>
              <div className={styles.donutWrapper}>
                <Doughnut data={pelaksanaData} options={chartOptions} />
              </div>
            </div>
            <div className={styles.analyticsCard}>
              <h3 className={styles.analyticsTitle}>Metode Pemilihan Pengadaan</h3>
              <div className={styles.donutWrapper}>
                <Doughnut data={metodePengadaanData} options={chartOptions} />
              </div>
            </div>
            <div className={styles.analyticsCard}>
              <h3 className={styles.analyticsTitle}>Jenis Belanja Pengadaan</h3>
              <div className={styles.donutWrapper}>
                <Doughnut data={jenisBelanjaData} options={chartOptions} />
              </div>
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.segmentedControl}>
              <button 
                className={`${styles.segmentBtn} ${viewMode === 'eselon1' ? styles.segmentActive : ''}`}
                onClick={() => setViewMode('eselon1')}
              >
                {viewMode === 'eselon1' && (
                  <motion.div layoutId="activePill" className={styles.activePillBg} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className={styles.segmentText}>Eselon I</span>
              </button>
              <button 
                className={`${styles.segmentBtn} ${viewMode === 'satker' ? styles.segmentActive : ''}`}
                onClick={() => setViewMode('satker')}
              >
                {viewMode === 'satker' && (
                  <motion.div layoutId="activePill" className={styles.activePillBg} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className={styles.segmentText}>Satuan Kerja</span>
              </button>
            </div>

            <input
              type="text"
              placeholder={viewMode === 'eselon1' ? "Cari nama Eselon I..." : "Cari nama satuan kerja..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.search}
            />

            <div className={styles.sortWrap}>
              <span className={styles.sortLabel}>Urutkan:</span>
              <Select
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.dashboardCard}>
            <div className={styles.chartContainer}>
              <div className={styles.limitLine} />
              
              {currentData.length > 0 ? (
                currentData.map((item, index) => {
                  const belanja = Number(item.belanja_pengadaan) || 0;
                  const totalRup = Number(item.total_rup) || 0;
                  const pct = belanja > 0 ? (totalRup / belanja) * 100 : 0;
                  
                  const isAnomaly = pct > 100;
                  const fillWidth = Math.min(pct, 100);
                  const theme = getPercentageTheme(fillWidth);
                  const anomalyExtension = Math.min(pct - 100, 100); // max 100% of container space
                  const itemName = viewMode === 'eselon1' ? item.nama_eselon1 : item.nama_satuan_kerja;

                  return (
                    <div 
                      key={index} 
                      className={styles.chartRow}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <div className={styles.chartLabel} title={itemName || '-'}>
                        <span>{itemName || '-'}</span>
                      </div>
                      
                      <div className={styles.chartBarWrapper}>
                        <motion.div 
                          className={styles.chartBar}
                          initial={{ width: 0 }}
                          animate={{ width: `${fillWidth}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{ background: theme.grad }}
                        />
                        
                        {isAnomaly && (
                          <motion.div 
                            className={styles.anomalyBar}
                            initial={{ width: 0 }}
                            animate={{ width: `${anomalyExtension}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                          >
                            <AlertCircle size={14} className={styles.anomalyIcon} />
                          </motion.div>
                        )}

                        <span 
                          className={styles.chartValue} 
                          style={{
                            right: isAnomaly ? `calc(-60px - ${anomalyExtension}%)` : '-60px',
                            color: isAnomaly ? '#b91c1c' : theme.hex 
                          }}
                        >
                          {pct.toFixed(1)}%
                        </span>
                        
                        <AnimatePresence>
                          {hoveredIndex === index && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: -8 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.2 }}
                              className={styles.tooltipCard}
                            >
                              <div className={styles.tooltipTitle}>{itemName || '-'}</div>
                              <div className={styles.tooltipRow}>
                                <div className={styles.tooltipLabelGroup}>
                                  <span className={styles.tooltipLabel}>Total RUP</span>
                                  <span className={styles.tooltipSubLabel}>
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalRup)}
                                  </span>
                                </div>
                                <span className={styles.tooltipVal}>{fmtRupiah(totalRup)}</span>
                              </div>
                              <div className={styles.tooltipRow}>
                                <div className={styles.tooltipLabelGroup}>
                                  <span className={styles.tooltipLabel}>Belanja Pengadaan</span>
                                  <span className={styles.tooltipSubLabel}>
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(belanja)}
                                  </span>
                                </div>
                                <span className={styles.tooltipVal}>{fmtRupiah(belanja)}</span>
                              </div>
                              <div className={styles.tooltipRow} style={{ marginTop: '8px' }}>
                                <span className={styles.tooltipLabel}>Persentase</span>
                                <span className={styles.tooltipVal} style={{ color: theme.hex }}>
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIconWrap}>
                    <SearchX size={32} />
                  </div>
                  <h3>Tidak ada data yang ditemukan</h3>
                  <p>Coba gunakan kata kunci pencarian yang lain.</p>
                </div>
              )}
            </div>

            <div className={styles.legendWrap}>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)' }} />
                <span>0-30%</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: 'linear-gradient(90deg, #b45309 0%, #f59e0b 100%)' }} />
                <span>30-50%</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)' }} />
                <span>50-80%</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: 'linear-gradient(90deg, #047857 0%, #10b981 100%)' }} />
                <span>80-100%</span>
              </div>
              <div className={styles.legendAnomaly}>
                <AlertCircle size={14} />
                <span>&gt;100% = Anomali</span>
              </div>
            </div>

            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Menampilkan {currentData.length > 0 ? startIndex + 1 : 0} - {startIndex + currentData.length} dari {sortedData.length}
              </span>
              <div className={styles.pageControls}>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.pageCount}>{currentPage} / {totalPages}</span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
