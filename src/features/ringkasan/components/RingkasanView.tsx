"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { RefreshCw, Download, PieChart, BarChart3, ChevronUp, ChevronDown, ChevronsUpDown, Printer, Percent, Package } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
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
import { KurasiTidakAkuratTable } from './KurasiTidakAkuratTable';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSatkerForDetail, setSelectedSatkerForDetail] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [barChartMode, setBarChartMode] = useState<'keuangan' | 'paket'>('keuangan');
  const isDark = useIsDark();

  const handleDownloadPdf = async () => {
    const el = document.getElementById('report-snapshot');
    if (!el) return;
    setDownloadingPdf(true);
    try {
      const imgData = await htmlToImage.toPng(el, {
        pixelRatio: 2, // 2x for better resolution
        backgroundColor: isDark ? '#0f172a' : '#f8fafc', // slate-900 / slate-50
      });
      
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [img.width, img.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, img.width, img.height);
      const filename = `Laporan_Ringkasan_Pengadaan_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

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
      { key: 'kd_rup', label: 'Kode RUP' },
      { key: 'satker', label: 'Satuan Kerja' },
      { key: 'nama_ppk', label: 'Nama PPK' },
      { key: 'rup_name', label: 'Nama Paket', width: 40 },
      { key: 'metode_pengadaan', label: 'Metode' },
      { key: 'status', label: 'Status' },
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
          kd_rup: r.kd_rup || '-',
          satker: r.satker || 'Tidak Diketahui',
          nama_ppk: r.nama_ppk || 'Tidak Diketahui',
          rup_name: r.rup_name || 'Tidak Diketahui',
          metode_pengadaan: r.metode_pengadaan || 'Lainnya',
          status: r.status || '-',
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

  const searchedSatker = useMemo(() => {
    if (!searchQuery) return sortedSatker;
    const q = searchQuery.toLowerCase();
    return sortedSatker.filter((s) => s.satker.toLowerCase().includes(q));
  }, [sortedSatker, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(searchedSatker.length / ITEMS_PER_PAGE));
  const paginatedSatker = searchedSatker.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getCapaianBadgeClass = (pct: number) => {
    if (pct < 25) return styles.badgeRed;
    if (pct < 50) return styles.badgeYellow;
    if (pct < 75) return styles.badgeBlue;
    return styles.badgeGreen;
  };

  // Jika filter PPK aktif tapi Satker kosong, cari Satker dari PPK tersebut untuk ITKP.
  const impliedSatkerForItkp = useMemo(() => {
    if (applied.satker) return applied.satker;
    if (applied.ppk) {
      const row = rows.find((r) => r.nama_ppk === applied.ppk && r.satker);
      return row?.satker || '';
    }
    return '';
  }, [applied, rows]);

  // Filter Satker/PPK aktif -> sembunyikan Pemeringkatan Satker (tidak relevan
  // untuk satu satker/ppk) dan pecah ITKP+Kurasi jadi stack penuh + tabel awareness.
  const isFiltered = !!applied.satker || !!applied.ppk;

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
          <button className={styles.ghostBtn} onClick={handleDownloadPdf} disabled={loading || downloadingPdf}>
            {downloadingPdf ? <RefreshCw size={15} className={styles.spin} /> : <Printer size={15} />} Cetak Laporan
          </button>
          <button className={styles.ghostBtn} onClick={() => setIsExportOpen(true)} disabled={loading}>
            <Download size={15} /> Export
          </button>
          <button className={styles.ghostBtn} onClick={load} disabled={loading} aria-label="Muat ulang data">
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
        </div>
      </motion.div>

      {error && <ErrorBox className={styles.spacer}>{error}</ErrorBox>}

      <div id="report-snapshot" style={{ padding: '4px' }}>
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
            <div className={styles.panelHeaderRow}>
              <div className={styles.panelTitle}><BarChart3 size={15} /> Realisasi per Metode</div>
              <div className={styles.segmentedControl}>
                <div className={styles.segmentedBg} style={{ transform: barChartMode === 'paket' ? 'translateX(100%)' : 'translateX(0)' }} />
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${barChartMode === 'keuangan' ? styles.active : ''}`}
                  onClick={() => setBarChartMode('keuangan')}
                >
                  <Percent size={13} />
                  Persentase Realisasi
                </button>
                <button
                  type="button"
                  className={`${styles.segmentedBtn} ${barChartMode === 'paket' ? styles.active : ''}`}
                  onClick={() => setBarChartMode('paket')}
                >
                  <Package size={13} />
                  Jumlah Paket
                </button>
              </div>
            </div>
            <MetodeBarChart metode={agg.metode} mode={barChartMode} />
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

      {/* Baris 5 — Pemeringkatan Satuan Kerja (disembunyikan saat filter Satker/PPK aktif) */}
      {!isFiltered && (
        <motion.div variants={item}>
          <SectionHeader
            title="Pemeringkatan Satuan Kerja"
            caption="Peringkat satker berdasarkan realisasi, % capaian, atau sisa anggaran"
          />
          <div className={styles.panel}>
            <SatkerRankingChart satker={agg.satker} selectedSatker={applied.satker} />
          </div>

          <div className={`${styles.panel} ${styles.tablePanel}`}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Cari nama satuan kerja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
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
                      className={`${styles.interactiveRow} ${s.satker === applied.satker ? styles.rowHighlight : ''}`}
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
            {searchedSatker.length > ITEMS_PER_PAGE && (
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
      )}

      {/* Baris 7 — ITKP & Kurasi: dua kolom normal, atau stack penuh + tabel awareness saat filter aktif */}
      <motion.div variants={item}>
        <SectionHeader title="Pemanfaatan Sistem & Kualitas Kurasi" />
        {isFiltered ? (
          <div className={styles.stackedFull}>
            <ItkpGauge satker={impliedSatkerForItkp} forceComponentA />
            <KurasiAkurasi kurasi={agg.kurasi} metode={agg.metode} onRefresh={load} isFullWidth={true} />
            <KurasiTidakAkuratTable rows={agg.kurasiTidakAkurat} />
          </div>
        ) : (
          <div className={styles.twoCol}>
            <ItkpGauge satker={impliedSatkerForItkp} />
            <KurasiAkurasi kurasi={agg.kurasi} metode={agg.metode} onRefresh={load} />
          </div>
        )}
      </motion.div>

      {/* Baris 8 — Deteksi Anomali */}
      <motion.div variants={item}>
        <AnomaliPanel summary={agg.anomali} />
        <AnomaliTable rows={agg.anomaliRows} />
      </motion.div>
      </div>
      
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
