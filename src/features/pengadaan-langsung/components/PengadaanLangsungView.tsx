"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, ListTodo, Package, CheckCircle2, Clock, FileText, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmtRupiah, fmtRupiahDetail, countRup } from '@/lib/format';
import { fetchRupHistory, type RupHistoryEntry } from '@/lib/paket/rupHistory';
import { useOrgFilters } from '@/hooks/useOrgFilters';
import { OrgFilterBar } from '@/components/paket/OrgFilterBar';
import { FilterPillGroup } from '@/components/paket/FilterPillGroup';
import { MetricGrid, DualProgressBar } from '@/components/paket/SummaryCards';
import { PaketTable, type PaketColumn } from '@/components/paket/PaketTable';
import { PaketDetailModal } from '@/components/paket/PaketDetailModal';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
import styles from '@/components/paket/paketView.module.css';

const STATUS_OPTIONS = [
  { value: 'SUDAH', label: 'Terdapat Realisasi' },
  { value: 'BELUM', label: 'Belum Terealisasi' },
];

const METODE_OPTIONS = [
  { value: 'Pengadaan Langsung', label: 'Pengadaan Langsung' },
  { value: 'Dikecualikan', label: 'Dikecualikan' },
];

const TIPE_RUP_OPTIONS = [
  { value: 'Single RUP', label: 'Single RUP' },
  { value: 'Multiple RUP', label: 'Multiple RUP' },
];

const SORT_OPTIONS = [
  { value: 'PAGU_DESC', label: 'Pagu Tertinggi' },
  { value: 'PAGU_ASC', label: 'Pagu Terendah' },
  { value: 'REAL_DESC', label: 'Realisasi Tertinggi' },
  { value: 'REAL_ASC', label: 'Realisasi Terendah' },
];

export function PengadaanLangsungView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { eselon1, satker, ppk, search, setEselon1, setSatker, setPpk, setSearch } = useOrgFilters();

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [metodeFilter, setMetodeFilter] = useState<string[]>([]);
  const [tipeRupFilter, setTipeRupFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<RupHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isModalOpen || !selectedItem) {
      setHistoryData([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    fetchRupHistory(selectedItem.kd_rup).then((result) => {
      if (!cancelled) {
        setHistoryData(result);
        setLoadingHistory(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, selectedItem]);

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

  const baseData = useMemo(() => {
    let d = data;
    if (eselon1) d = d.filter((item) => (item.eselon1 || 'Tidak Diketahui') === eselon1);
    if (satker) d = d.filter((item) => (item.satker || 'Tidak Diketahui') === satker);
    if (ppk) d = d.filter((item) => (item.nama_ppk || 'Tidak Diketahui') === ppk);
    if (tipeRupFilter.length > 0) {
      d = d.filter((item) => tipeRupFilter.includes(item.is_multiple_rup ? 'Multiple RUP' : 'Single RUP'));
    }
    if (metodeFilter.length > 0) {
      d = d.filter((item) => metodeFilter.includes(item.metode_pengadaan));
    }
    return d;
  }, [data, eselon1, satker, ppk, tipeRupFilter, metodeFilter]);

  const filteredData = useMemo(() => {
    let d = baseData;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(
        (p) =>
          (p.rup_name && p.rup_name.toLowerCase().includes(q)) ||
          (p.kd_rup && String(p.kd_rup).toLowerCase().includes(q)) ||
          (p.kode_penyedia && p.kode_penyedia.toLowerCase().includes(q)) ||
          (p.satker && p.satker.toLowerCase().includes(q)) ||
          (p.eselon1 && p.eselon1.toLowerCase().includes(q)) ||
          (p.nama_ppk && p.nama_ppk.toLowerCase().includes(q))
      );
    }
    if (statusFilter.length > 0) {
      d = d.filter((p) => {
        const hasRealisasi = (Number(p.total) || 0) > 0;
        return statusFilter.includes(hasRealisasi ? 'SUDAH' : 'BELUM');
      });
    }
    return d;
  }, [baseData, search, statusFilter]);

  const contextPagu = baseData.filter((p) => p.is_from_sirup !== false).reduce((s, d) => s + (Number(d.pagu) || 0), 0);
  const contextRealisasi = filteredData.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const contextRealisasiPencatatan = filteredData.reduce((s, d) => s + (Number(d.total_pencatatan) || 0), 0);
  const contextRealisasiTransaksional = filteredData.reduce((s, d) => s + (Number(d.total_transaksional) || 0), 0);
  const contextBelumRealisasi = Math.max(0, contextPagu - contextRealisasi);
  const persentase = contextPagu > 0 ? (contextRealisasi / contextPagu) * 100 : 0;
  const persentaseBelumRealisasi = contextPagu > 0 ? (contextBelumRealisasi / contextPagu) * 100 : 0;

  const totalPaket = filteredData.filter((p) => p.is_from_sirup !== false).reduce((sum, p) => sum + countRup(p.kd_rup), 0);
  const paketSelesai = filteredData
    .filter((p) => p.is_from_sirup !== false && (Number(p.total) || 0) > 0)
    .reduce((sum, p) => sum + countRup(p.kd_rup), 0);
  const paketBelumSelesai = totalPaket - paketSelesai;

  const activeSort = sortBy[0];
  const sortedPackages = useMemo(() => {
    const copy = [...filteredData];
    copy.sort((a, b) => {
      if (activeSort === 'PAGU_DESC') return (Number(b.pagu) || 0) - (Number(a.pagu) || 0);
      if (activeSort === 'PAGU_ASC') return (Number(a.pagu) || 0) - (Number(b.pagu) || 0);
      if (activeSort === 'REAL_DESC') return (Number(b.total) || 0) - (Number(a.total) || 0);
      if (activeSort === 'REAL_ASC') return (Number(a.total) || 0) - (Number(b.total) || 0);
      const pctA = (Number(a.pagu) || 0) > 0 ? (Number(a.total) || 0) / (Number(a.pagu) || 0) : 0;
      const pctB = (Number(b.pagu) || 0) > 0 ? (Number(b.total) || 0) / (Number(b.pagu) || 0) : 0;
      return pctB - pctA;
    });
    return copy;
  }, [filteredData, activeSort]);

  const hasActiveExtraFilters = statusFilter.length > 0 || metodeFilter.length > 0 || tipeRupFilter.length > 0 || sortBy.length > 0;

  const columns: PaketColumn<any>[] = useMemo(
    () => [
      {
        key: 'nama',
        label: 'Nama Paket',
        render: (p) => (
          <div className={styles.nameCell}>
            <span className={styles.nameText} title={p.rup_name}>
              {p.rup_name}
            </span>
            <span className={styles.rupCode}>RUP: {p.kd_rup || '-'}</span>
          </div>
        ),
      },
      { key: 'satker', label: 'Satker', render: (p) => <span className={styles.mutedCell}>{p.satker || '-'}</span> },
      { key: 'ppk', label: 'PPK', render: (p) => <span className={styles.mutedCell}>{p.nama_ppk || '-'}</span> },
      {
        key: 'metode',
        label: 'Metode',
        render: (p) => (
          <Badge variant="default" className={p.metode_pengadaan === 'Dikecualikan' ? styles.metodeDikecualikan : styles.metodeDefault}>
            {p.metode_pengadaan || 'Pengadaan Langsung'}
          </Badge>
        ),
      },
      {
        key: 'tipe',
        label: 'Tipe RUP',
        render: (p) => <span className={styles.mutedCell}>{p.is_multiple_rup ? 'Multiple RUP' : 'Single RUP'}</span>,
      },
      {
        key: 'pagu',
        label: 'Pagu',
        align: 'right',
        sortAccessor: (p) => Number(p.pagu) || 0,
        render: (p) => <span className={styles.monoCell}>{fmtRupiah(Number(p.pagu))}</span>,
      },
      {
        key: 'realisasi',
        label: 'Realisasi',
        align: 'right',
        sortAccessor: (p) => Number(p.total) || 0,
        render: (p) => {
          const over = (Number(p.total) || 0) > (Number(p.pagu) || 0);
          return <span className={`${styles.monoCell} ${over ? styles.overBudget : ''}`}>{fmtRupiah(Number(p.total))}</span>;
        },
      },
      {
        key: 'pct',
        label: '%',
        align: 'right',
        sortAccessor: (p) => ((Number(p.pagu) || 0) > 0 ? (Number(p.total) || 0) / (Number(p.pagu) || 0) : 0),
        render: (p) => {
          const pct = (Number(p.pagu) || 0) > 0 ? (Number(p.total) / Number(p.pagu)) * 100 : 0;
          const over = (Number(p.total) || 0) > (Number(p.pagu) || 0);
          return <strong className={`${styles.pctBadge} ${over ? styles.pctOver : styles.pctNormal}`}>{pct.toFixed(1)}%</strong>;
        },
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        render: (p) => (
          <Badge variant={(Number(p.total) || 0) > 0 ? 'rendah' : 'sedang'} className={styles.statusBadge}>
            {(Number(p.total) || 0) > 0 ? 'SUDAH REALISASI' : 'BELUM REALISASI'}
          </Badge>
        ),
      },
    ],
    []
  );

  const exportColumns = useMemo(() => [
    { key: 'kd_rup', label: 'Kode RUP' },
    { key: 'rup_name', label: 'Nama Paket', width: 40 },
    { key: 'satker', label: 'Satker' },
    { key: 'eselon1', label: 'Eselon I' },
    { key: 'nama_ppk', label: 'Nama PPK' },
    { key: 'kode_penyedia', label: 'Penyedia' },
    { key: 'metode_pengadaan', label: 'Metode Pengadaan' },
    { key: 'is_multiple_rup', label: 'Tipe RUP' },
    { key: 'pagu', label: 'Pagu (Rp)', type: 'currency' },
    { key: 'total_pencatatan', label: 'Realisasi Pencatatan (Rp)', type: 'currency' },
    { key: 'total_transaksional', label: 'Realisasi Transaksional (Rp)', type: 'currency' },
    { key: 'total', label: 'Total Realisasi (Rp)', type: 'currency' },
    { key: 'pct', label: 'Realisasi (%)', type: 'number' },
    { key: 'status', label: 'Status' },
  ], []);

  const mapForExport = (item: any) => ({
    ...item,
    is_multiple_rup: item.is_multiple_rup ? 'Multiple RUP' : 'Single RUP',
    pct: (Number(item.pagu) || 0) > 0 ? ((Number(item.total) || 0) / (Number(item.pagu) || 0)) * 100 : 0,
    status: (Number(item.total) || 0) > 0 ? 'SUDAH REALISASI' : 'BELUM REALISASI',
  });

  const exportAllData = useMemo(() => baseData.map(mapForExport), [baseData]);
  const exportFilteredData = useMemo(() => sortedPackages.map(mapForExport), [sortedPackages]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {error && <ErrorBox>{error}. Pastikan View SQL sudah dieksekusi di Supabase.</ErrorBox>}

      {loading ? (
        <p className={styles.loadingText}>Memuat data dari Supabase...</p>
      ) : (
        <>
          <MetricGrid
            title="Ringkasan Keuangan"
            icon={Wallet}
            cards={[
              { key: 'pagu', icon: Wallet, label: 'Total Anggaran (Pagu)', value: fmtRupiahDetail(contextPagu), accent: 'info' },
              {
                key: 'real',
                icon: TrendingUp,
                label: 'Total Realisasi Keseluruhan',
                value: fmtRupiahDetail(contextRealisasi),
                badge: `${persentase.toFixed(1)}%`,
                badgeTone: 'good',
                accent: 'teal',
              },
              {
                key: 'sisa',
                icon: ListTodo,
                label: 'Sisa Anggaran',
                value: fmtRupiahDetail(contextBelumRealisasi),
                badge: `${persentaseBelumRealisasi.toFixed(1)}%`,
                badgeTone: 'warn',
                accent: 'amber',
              },
            ]}
          />
          <MetricGrid
            title="Rincian Realisasi"
            icon={FileText}
            cards={[
              { key: 'pencatatan', icon: FileText, label: 'Realisasi Pencatatan', value: fmtRupiahDetail(contextRealisasiPencatatan), accent: 'indigo' },
              { key: 'transaksional', icon: CreditCard, label: 'Realisasi Transaksional', value: fmtRupiahDetail(contextRealisasiTransaksional), accent: 'purple' },
            ]}
          />

          <MetricGrid
            title="Status Paket Pengadaan Langsung"
            icon={Package}
            cards={[
              { key: 'total', icon: Package, label: 'Total Seluruh RUP', value: totalPaket, accent: 'neutral' },
              { key: 'selesai', icon: CheckCircle2, label: 'Terdapat Realisasi', value: paketSelesai, accent: 'teal' },
              { key: 'belum', icon: Clock, label: 'Belum Terealisasi', value: paketBelumSelesai, accent: 'amber' },
            ]}
          />

          <div className={styles.progressWrap}>
            <DualProgressBar
              title="Progres Penyerapan Anggaran"
              totalLabel={`Total Pagu: ${fmtRupiahDetail(contextPagu)}`}
              donePct={persentase}
              remainingPct={persentaseBelumRealisasi}
              doneLabel="Terealisasi"
              remainingLabel="Sisa"
            />
          </div>

          <div className={styles.filterHead}>
            <span className={styles.filterHeadTitle}>Filter</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button" 
                className={styles.advancedToggle} 
                onClick={() => setIsExportModalOpen(true)}
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Export Data
              </button>
              <button type="button" className={styles.advancedToggle} onClick={() => setShowAdvanced((v) => !v)}>
                Filter Lanjutan {hasActiveExtraFilters && <Badge variant="rendah">Aktif</Badge>}
              </button>
            </div>
          </div>

          <OrgFilterBar
            data={data}
            eselon1={eselon1}
            satker={satker}
            ppk={ppk}
            search={search}
            onEselon1Change={setEselon1}
            onSatkerChange={setSatker}
            onPpkChange={setPpk}
            onSearchChange={setSearch}
          />

          {showAdvanced && (
            <div className={styles.advancedPanel}>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Status</span>
                <FilterPillGroup options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Metode</span>
                <FilterPillGroup options={METODE_OPTIONS} selected={metodeFilter} onChange={setMetodeFilter} multi={false} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Tipe RUP</span>
                <FilterPillGroup options={TIPE_RUP_OPTIONS} selected={tipeRupFilter} onChange={setTipeRupFilter} multi={false} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Urutkan</span>
                <FilterPillGroup options={SORT_OPTIONS} selected={sortBy} onChange={setSortBy} multi={false} />
              </div>
              {hasActiveExtraFilters && (
                <button
                  type="button"
                  className={styles.resetAllBtn}
                  onClick={() => {
                    setStatusFilter([]);
                    setMetodeFilter([]);
                    setTipeRupFilter([]);
                    setSortBy([]);
                  }}
                >
                  Reset Semua Filter &amp; Urutan
                </button>
              )}
            </div>
          )}

          <PaketTable
            columns={columns}
            rows={sortedPackages}
            getRowKey={(p, i) => p.kd_rup || i}
            onRowClick={(p) => {
              setSelectedItem(p);
              setIsModalOpen(true);
            }}
          />
        </>
      )}

      <PaketDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detail Pengadaan Langsung"
        historyData={historyData}
        loadingHistory={loadingHistory}
      >
        {selectedItem && (
          <>
            <div>
              <h3 className={styles.modalTitle}>{selectedItem.rup_name}</h3>
              <p className={styles.modalSubLabel}>Penyedia (Kontraktor)</p>
              <div className={styles.modalBox}>
                <p className={styles.modalBoxText}>{selectedItem.kode_penyedia || 'Tidak Diketahui'}</p>
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div>
                <span className={styles.modalFieldLabel}>Kode RUP</span>
                <span className={styles.modalFieldValue}>{selectedItem.kd_rup}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Metode Pengadaan</span>
                <span className={styles.modalFieldValue}>{selectedItem.metode_pengadaan || 'Pengadaan Langsung'}</span>
              </div>
              <div className={styles.modalDivider} />
              <div>
                <span className={styles.modalFieldLabel}>Total Nilai Pagu</span>
                <span className={styles.modalFieldValue}>{fmtRupiah(Number(selectedItem.pagu))}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Total Realisasi Keseluruhan</span>
                <span className={styles.modalFieldValueStrong}>{fmtRupiah(Number(selectedItem.total))}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>- Realisasi (Pencatatan)</span>
                <span className={styles.modalFieldValueMuted}>{fmtRupiah(Number(selectedItem.total_pencatatan || 0))}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>- Realisasi (Transaksional)</span>
                <span className={styles.modalFieldValueMuted}>{fmtRupiah(Number(selectedItem.total_transaksional || 0))}</span>
              </div>
            </div>

            <div>
              <h4 className={styles.modalSectionTitle}>Informasi Instansi &amp; Satker</h4>
              <p className={styles.modalText}>Eselon 1: {selectedItem.eselon1 || '-'}</p>
              <p className={styles.modalText}>Satuan Kerja: {selectedItem.satker || '-'}</p>
              <p className={styles.modalText}>PPK: {selectedItem.nama_ppk || '-'}</p>
            </div>

            <div>
              <h4 className={styles.modalSectionTitle}>Detail Status</h4>
              <p className={styles.modalText}>
                Status Paket:{' '}
                <strong className={styles.modalStatusStrong}>
                  {(Number(selectedItem.total) || 0) > 0 ? 'Terdapat Realisasi' : 'Belum Ada Realisasi'}
                </strong>
              </p>
              <p className={styles.modalText}>Status Aktif RUP: {selectedItem.status_aktif_rup === true ? 'Aktif' : 'Tidak / N/A'}</p>
            </div>
          </>
        )}
      </PaketDetailModal>

      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Laporan Realisasi Pengadaan Langsung"
        filename={`Laporan_Pengadaan_Langsung_${new Date().toISOString().slice(0,10)}`}
        columns={exportColumns}
        allData={exportAllData}
        filteredData={exportFilteredData}
      />
    </motion.div>
  );
}
