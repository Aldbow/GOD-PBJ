"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { RefreshCw, Download, PieChart, BarChart3, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
import { fmtInt, fmtPct, fmtRupiah } from '@/lib/format';
import {
  fetchGabunganRows,
  aggregate,
  listSatker,
  listPpk,
  filterRows,
  type GabunganRow,
  type RingkasanFilterValue,
} from '../lib/ringkasanData';
import { RingkasanFilter } from './RingkasanFilter';
import { KpiCards } from './KpiCards';
import { MetodeDonutChart } from './charts/MetodeDonutChart';
import { MetodeBarChart } from './charts/MetodeBarChart';
import { SatkerRankingChart } from './charts/SatkerRankingChart';
import { metodeColor, useIsDark } from './charts/chartTheme';
import { ItkpGauge } from './ItkpGauge';
import { KurasiAkurasi } from './KurasiAkurasi';
import { AnomaliPanel } from '@/components/paket/AnomaliPanel';
import { AnomaliTable } from './AnomaliTable';
import { SatkerDetailModal } from './SatkerDetailModal';
import styles from './RingkasanView.module.css';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
};

const EMPTY_FILTER: RingkasanFilterValue = { satker: '', ppk: '' };

export function RingkasanView() {
  const [rows, setRows] = useState<GabunganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [applied, setApplied] = useState<RingkasanFilterValue>(EMPTY_FILTER);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [sortCol, setSortCol] = useState<'peringkat' | 'satker' | 'jumlahPaket' | 'pagu' | 'realisasi' | 'pctRealisasi'>('pctRealisasi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSatkerForDetail, setSelectedSatkerForDetail] = useState<string | null>(null);
  const isDark = useIsDark();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGabunganRows();
      setRows(data);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data ringkasan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const agg = useMemo(() => aggregate(rows, applied), [rows, applied]);
  const satkerOptions = useMemo(() => listSatker(rows), [rows]);
  const getPpkOptions = useCallback((satker: string) => listPpk(rows, satker), [rows]);

  const updatedLabel = lastUpdate
    ? `${lastUpdate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, ${lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
    : 'Memuat...';

  // Data export dari baris terfilter.
  const exportColumns = useMemo(
    () => [
      { key: 'satker', label: 'Satuan Kerja' },
      { key: 'nama_ppk', label: 'Nama PPK' },
      { key: 'rup_name', label: 'Nama Paket', width: 40 },
      { key: 'metode_pengadaan', label: 'Metode' },
      { key: 'pagu', label: 'Pagu (Rp)', type: 'currency' },
      { key: 'total', label: 'Realisasi (Rp)', type: 'currency' },
      { key: 'realisasi_pct', label: 'Realisasi (%)', type: 'number' },
      { key: 'status_kurasi', label: 'Status Kurasi AI' },
      { key: 'catatan_kurasi', label: 'Catatan Kurasi AI', width: 40 },
      { key: 'rekomendasi_kurasi', label: 'Rekomendasi Kurasi AI', width: 40 },
    ],
    []
  );

  const buildExportRows = useCallback(
    (f: RingkasanFilterValue) =>
      filterRows(rows, f).map((r) => {
        const pagu = Number(r.pagu) || 0;
        const total = Number(r.total) || 0;
        return {
          satker: r.satker || 'Tidak Diketahui',
          nama_ppk: r.nama_ppk || 'Tidak Diketahui',
          rup_name: r.rup_name || 'Tidak Diketahui',
          metode_pengadaan: r.metode_pengadaan || 'Lainnya',
          pagu,
          total,
          realisasi_pct: pagu > 0 ? Math.round((total / pagu) * 100) : 0,
          status_kurasi: r.status_kurasi || 'Belum Dikurasi',
          catatan_kurasi: r.catatan_kurasi || '-',
          rekomendasi_kurasi: r.rekomendasi_kurasi || '-',
        };
      }),
    [rows]
  );

  const allExport = useMemo(() => buildExportRows(EMPTY_FILTER), [buildExportRows]);
  const filteredExport = useMemo(() => buildExportRows(applied), [buildExportRows, applied]);

  const totalPaketSemua = agg.metode.reduce((s, m) => s + m.jumlahPaket, 0);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return <ChevronsUpDown size={14} style={{ opacity: 0.3, marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }} />;
    return sortDir === 'asc' ? (
      <ChevronUp size={14} style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }} />
    ) : (
      <ChevronDown size={14} style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-block' }} />
    );
  };

  const sortedSatker = useMemo(() => {
    const withRank = [...agg.satker]
      .sort((a, b) => b.pctRealisasi - a.pctRealisasi)
      .map((s, i) => ({ ...s, baseRank: i + 1 }));

    return withRank.sort((a, b) => {
      const valA = sortCol === 'peringkat' ? a.baseRank : a[sortCol];
      const valB = sortCol === 'peringkat' ? b.baseRank : b[sortCol];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [agg.satker, sortCol, sortDir]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(sortedSatker.length / ITEMS_PER_PAGE));
  const paginatedSatker = sortedSatker.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getCapaianBadgeClass = (pct: number) => {
    if (pct < 25) return styles.badgeRed;
    if (pct < 50) return styles.badgeYellow;
    if (pct < 75) return styles.badgeBlue;
    return styles.badgeGreen;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Baris 1 — Header */}
      <motion.div variants={item} className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ringkasan Pengadaan</h1>
          <p className={styles.pageSub}>
            Gambaran umum pelaksanaan pengadaan, realisasi anggaran, pemanfaatan sistem, dan hasil kurasi paket.
          </p>
          <p className={styles.pagePeriod}>Data terakhir diperbarui {updatedLabel}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostBtn} onClick={() => setIsExportOpen(true)} disabled={loading}>
            <Download size={15} /> Export
          </button>
          <button className={styles.ghostBtn} onClick={load} disabled={loading} aria-label="Muat ulang data">
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
        </div>
      </motion.div>

      {error && <ErrorBox className={styles.spacer}>{error}</ErrorBox>}

      {/* Baris 2 — Filter */}
      <motion.div variants={item}>
        <RingkasanFilter
          satkerOptions={satkerOptions}
          getPpkOptions={getPpkOptions}
          applied={applied}
          onApply={setApplied}
          disabled={loading}
        />
      </motion.div>

      {/* Baris 3 — KPI Cards */}
      <motion.div variants={item}>
        <KpiCards kpi={agg.kpi} loading={loading} />
      </motion.div>

      {/* Baris 4 — Ringkasan Metode Pengadaan */}
      <motion.div variants={item}>
        <SectionHeader title="Ringkasan Metode Pengadaan" caption="Distribusi paket, pagu & realisasi per metode" />
        <div className={styles.methodGrid}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}><PieChart size={15} /> Proporsi Jumlah Paket</div>
            <MetodeDonutChart metode={agg.metode} totalPaket={totalPaketSemua} />
          </div>
          <div className={styles.panel}>
            <div className={styles.panelTitle}><BarChart3 size={15} /> Jumlah Paket per Metode</div>
            <MetodeBarChart metode={agg.metode} />
          </div>
        </div>

        <div className={`${styles.panel} ${styles.tablePanel}`}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Metode</th>
                  <th className={styles.num}>Jumlah Paket</th>
                  <th className={styles.num}>Pagu</th>
                  <th className={styles.num}>Realisasi</th>
                  <th className={styles.num}>% Realisasi</th>
                </tr>
              </thead>
              <tbody>
                {agg.metode.map((m) => (
                  <tr key={m.metode}>
                    <td>
                      <span className={styles.swatch} style={{ background: metodeColor(m.metode, isDark) }} />
                      {m.metode}
                    </td>
                    <td className={styles.num}>{fmtInt(m.jumlahPaket)}</td>
                    <td className={styles.num}>{fmtRupiah(m.pagu)}</td>
                    <td className={styles.num}>{fmtRupiah(m.realisasi)}</td>
                    <td className={styles.num}>{fmtPct(m.pctRealisasi)}</td>
                  </tr>
                ))}
                {agg.metode.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.tableEmpty}>Tidak ada data untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
              {agg.metode.length > 0 && (
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className={styles.num}>{fmtInt(agg.kpi.totalPaket)}</td>
                    <td className={styles.num}>{fmtRupiah(agg.kpi.totalPagu)}</td>
                    <td className={styles.num}>{fmtRupiah(agg.kpi.totalRealisasi)}</td>
                    <td className={styles.num}>{fmtPct(agg.kpi.pctRealisasi)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </motion.div>

      {/* Baris 5 — Pemeringkatan Satuan Kerja */}
      <motion.div variants={item}>
        <SectionHeader
          title="Pemeringkatan Satuan Kerja"
          caption="Peringkat satker berdasarkan realisasi, % capaian, atau sisa anggaran"
        />
        <div className={styles.panel}>
          <SatkerRankingChart satker={agg.satker} selectedSatker={applied.satker} />
        </div>

        <div className={`${styles.panel} ${styles.tablePanel}`}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('peringkat')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} className={styles.colPeringkat}>
                    Peringkat <SortIcon col="peringkat" />
                  </th>
                  <th onClick={() => handleSort('satker')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} className={styles.colSatker}>
                    Satker <SortIcon col="satker" />
                  </th>
                  <th className={styles.num} onClick={() => handleSort('jumlahPaket')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Jumlah Paket <SortIcon col="jumlahPaket" />
                  </th>
                  <th className={styles.num} onClick={() => handleSort('pagu')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Pagu <SortIcon col="pagu" />
                  </th>
                  <th className={styles.num} onClick={() => handleSort('realisasi')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Realisasi <SortIcon col="realisasi" />
                  </th>
                  <th className={styles.num} onClick={() => handleSort('pctRealisasi')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    % Capaian <SortIcon col="pctRealisasi" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSatker.map((s) => (
                  <tr 
                    key={s.satker} 
                    className={s.satker === applied.satker ? styles.rowHighlight : undefined}
                    onClick={() => setSelectedSatkerForDetail(s.satker)}
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk melihat detail satuan kerja"
                  >
                    <td className={`${styles.num} ${styles.colPeringkat}`}>{s.baseRank}</td>
                    <td className={styles.colSatker}>{s.satker}</td>
                    <td className={styles.num}>{fmtInt(s.jumlahPaket)}</td>
                    <td className={styles.num}>{fmtRupiah(s.pagu)}</td>
                    <td className={styles.num}>{fmtRupiah(s.realisasi)}</td>
                    <td className={styles.num}>
                      <span className={`${styles.badge} ${getCapaianBadgeClass(s.pctRealisasi)}`}>
                        {fmtPct(s.pctRealisasi)}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedSatker.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.tableEmpty}>Tidak ada data untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {agg.satker.length > ITEMS_PER_PAGE && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '24px', marginBottom: '8px' }}>
              <button 
                className={styles.ghostBtn} 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Sebelumnya
              </button>
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button 
                className={styles.ghostBtn} 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Baris 7 — ITKP & Kurasi (dua kolom) */}
      <motion.div variants={item}>
        <SectionHeader title="Pemanfaatan Sistem & Kualitas Kurasi" />
        <div className={styles.twoCol}>
          <ItkpGauge satker={applied.satker} />
          <KurasiAkurasi kurasi={agg.kurasi} metode={agg.metode} onRefresh={load} />
        </div>
      </motion.div>

      {/* Baris 8 — Deteksi Anomali */}
      <motion.div variants={item}>
        <AnomaliPanel summary={agg.anomali} />
        <AnomaliTable rows={agg.anomaliRows} />
      </motion.div>

      <ExportDataModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Laporan Ringkasan Pengadaan"
        filename={`Ringkasan_Pengadaan_${new Date().toISOString().slice(0, 10)}`}
        columns={exportColumns}
        allData={allExport}
        filteredData={filteredExport}
      />
      
      <SatkerDetailModal 
        satkerName={selectedSatkerForDetail}
        rows={rows}
        onClose={() => setSelectedSatkerForDetail(null)}
      />
    </motion.div>
  );
}
