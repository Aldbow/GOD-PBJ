"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { RefreshCw, Download, PieChart, BarChart3, Layers } from 'lucide-react';
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
import { RealisasiMetodeChart } from './charts/RealisasiMetodeChart';
import { StatusPaketChart } from './charts/StatusPaketChart';
import { metodeColor, useIsDark } from './charts/chartTheme';
import { ItkpGauge } from './ItkpGauge';
import { KurasiAkurasi } from './KurasiAkurasi';
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

      {/* Baris 5 — Realisasi Berdasarkan Metode */}
      <motion.div variants={item}>
        <SectionHeader title="Realisasi Berdasarkan Metode Pengadaan" caption="Perbandingan pagu dan realisasi" />
        <div className={styles.panel}>
          <RealisasiMetodeChart metode={agg.metode} />
        </div>
      </motion.div>

      {/* Baris 6 — Status Paket per Metode */}
      <motion.div variants={item}>
        <SectionHeader title="Status Paket per Metode" caption="Paket sudah vs belum realisasi" />
        <div className={styles.panel}>
          <div className={styles.panelTitle}><Layers size={15} /> Distribusi Status Paket</div>
          <StatusPaketChart metode={agg.metode} />
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

      <ExportDataModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Laporan Ringkasan Pengadaan"
        filename={`Ringkasan_Pengadaan_${new Date().toISOString().slice(0, 10)}`}
        columns={exportColumns}
        allData={allExport}
        filteredData={filteredExport}
      />
    </motion.div>
  );
}
