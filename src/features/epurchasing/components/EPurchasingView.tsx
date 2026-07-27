"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, Clock, Wallet, ListTodo, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmtRupiah, fmtRupiahDetail } from '@/lib/format';
import { fetchRupHistory, type RupHistoryEntry } from '@/lib/paket/rupHistory';
import { useOrgFilters } from '@/hooks/useOrgFilters';
import { OrgFilterBar } from '@/components/paket/OrgFilterBar';
import { FilterPillGroup } from '@/components/paket/FilterPillGroup';
import { FilterToggle } from '@/components/paket/FilterToggle';
import { MetricGrid, DualProgressBar } from '@/components/paket/SummaryCards';
import { AnomaliPanel, AnomaliBadge } from '@/components/paket/AnomaliPanel';
import { summarizeAnomali, matchesAnomali, type AnomaliJenis } from '@/lib/anomali';
import { PaketTable, type PaketColumn } from '@/components/paket/PaketTable';
import { PaketDetailModal } from '@/components/paket/PaketDetailModal';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
import styles from '@/components/paket/paketView.module.css';

const STATUS_CLUSTERS = [
  { label: 'SUDAH REALISASI', values: ['PAYMENT_OUTSIDE_SYSTEM', 'COMPLETED'] },
  { label: 'PROSES', values: ['ON_PROCESS', 'WAITING_PPK_REVIEW', 'ON_NEGOTIATION', 'WAITING_SELLER_CONFIRMATION'] },
  { label: 'BELUM REALISASI', values: ['BELUM REALISASI'] },
];

const STATUS_OPTIONS = STATUS_CLUSTERS.map((c) => ({ value: c.label, label: c.label }));

const KURASI_OPTIONS = [
  { value: 'Akurat', label: 'Akurat' },
  { value: 'Tidak Akurat', label: 'Tidak Akurat' },
  { value: 'Belum Dikurasi', label: 'Belum Dikurasi' }
];

const SORT_OPTIONS = [
  { value: 'PAGU_DESC', label: 'Pagu Tertinggi' },
  { value: 'PAGU_ASC', label: 'Pagu Terendah' },
  { value: 'REAL_DESC', label: 'Realisasi Tertinggi' },
  { value: 'REAL_ASC', label: 'Realisasi Terendah' },
  { value: 'PCT_DESC', label: 'Persentase Tertinggi' },
  { value: 'PCT_ASC', label: 'Persentase Terendah' },
];

export function EPurchasingView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { eselon1, satker, ppk, search, setEselon1, setSatker, setPpk, setSearch } = useOrgFilters();

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [kurasiFilter, setKurasiFilter] = useState<string[]>([]);
  const [anomaliFilter, setAnomaliFilter] = useState<AnomaliJenis[]>([]);
  const [sortBy, setSortBy] = useState<string[]>(['PCT_DESC']);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAbnormal, setShowAbnormal] = useState(false);
  const [showNoMasterData, setShowNoMasterData] = useState(false);
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
    fetchRupHistory(selectedItem.rup_code).then((result) => {
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
            .from('view_dashboard_epurchasing_v6')
            .select('*')
            .range(offset, offset + limit - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allData = [...allData, ...data];
          if (data.length < limit) break;
          offset += limit;
        }

        const formattedData = allData.map((r) => ({
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
          kode_klpd: r.kode_klpd,
          status_kurasi: r.status_kurasi || 'Belum Dikurasi',
          catatan_kurasi: r.catatan_kurasi || null,
          rekomendasi_kurasi: r.rekomendasi_kurasi || null,
        }));

        // Satu paket e-purchasing bisa punya beberapa order_id (transaksi
        // berulang di bawah 1 RUP yang sama) -> view_dashboard_epurchasing_v6
        // menyimpannya sebagai baris terpisah per order_id. Gabungkan per
        // kd_rup (rup_code) dan jumlahkan realisasi (total) supaya hitungan
        // paket & realisasi tidak dobel -- konsisten dengan /api/ppk/route.ts
        // yang sudah menangani kuirk data yang sama.
        const byRup = new Map<string, any>();
        for (const row of formattedData) {
          const key = String(row.rup_code);
          const existing = byRup.get(key);
          if (existing) {
            existing.total += row.total;
          } else {
            byRup.set(key, { ...row });
          }
        }

        setData(Array.from(byRup.values()));
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
    return data.filter((p) => {
      const matchesEselon1 = !eselon1 || p.eselon1 === eselon1;
      const matchesSatker = !satker || p.satker === satker;
      const matchesPPK = !ppk || p.nama_ppk === ppk;
      return matchesEselon1 && matchesSatker && matchesPPK;
    });
  }, [data, eselon1, satker, ppk]);

  const filteredData = useMemo(() => {
    const query = search.toLowerCase();
    return baseData.filter((p) => {
      const matchesSearch =
        !query ||
        (p.rup_name && p.rup_name.toLowerCase().includes(query)) ||
        (p.rup_code && String(p.rup_code).toLowerCase().includes(query)) ||
        (p.kode_penyedia && p.kode_penyedia.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.some((clusterLabel) => {
          const cluster = STATUS_CLUSTERS.find((c) => c.label === clusterLabel);
          return cluster ? cluster.values.includes(p.status) : false;
        });
      const matchesKurasi =
        kurasiFilter.length === 0 ||
        kurasiFilter.includes(p.status_kurasi);
      const matchesAbnormal = !showAbnormal || (p.total || 0) > (p.pagu || 0);
      const matchesNoMasterData = !showNoMasterData || (p.nama_ppk === 'Tidak Diketahui' && (p.total || 0) > 0);

      return matchesSearch && matchesStatus && matchesKurasi && matchesAbnormal && matchesNoMasterData && matchesAnomali(p, anomaliFilter);
    });
  }, [baseData, search, statusFilter, kurasiFilter, showAbnormal, showNoMasterData, anomaliFilter]);

  // Ringkasan anomali dari baseData (sebelum filter anomali) agar angka tile stabil.
  const anomaliSummary = useMemo(() => summarizeAnomali(baseData), [baseData]);
  const toggleAnomali = (j: AnomaliJenis) =>
    setAnomaliFilter((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));

  const totalPaket = filteredData.length;
  const paketSelesai = filteredData.filter((p) => ['COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM'].includes(p.status)).length;
  const paketBelumSelesai = totalPaket - paketSelesai;

  const totalPagu = baseData.reduce((s, d) => s + (d.pagu || 0), 0);
  const totalRealisasi = filteredData.reduce((s, d) => s + (d.total || 0), 0);
  const totalBelumRealisasi = Math.max(0, totalPagu - totalRealisasi);
  const persentase = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;
  const persentaseBelumRealisasi = totalPagu > 0 ? (totalBelumRealisasi / totalPagu) * 100 : 0;

  const activeSort = sortBy[0] || 'PAGU_DESC';
  const sortedPackages = useMemo(() => {
    const copy = [...filteredData];
    copy.sort((a, b) => {
      const paguA = a.pagu || 0;
      const paguB = b.pagu || 0;
      const realA = a.total || 0;
      const realB = b.total || 0;
      const pctA = paguA > 0 ? (realA / paguA) * 100 : 0;
      const pctB = paguB > 0 ? (realB / paguB) * 100 : 0;
      switch (activeSort) {
        case 'PAGU_ASC':
          return paguA - paguB;
        case 'REAL_DESC':
          return realB - realA;
        case 'REAL_ASC':
          return realA - realB;
        case 'PCT_DESC':
          return pctB - pctA;
        case 'PCT_ASC':
          return pctA - pctB;
        case 'PAGU_DESC':
        default:
          return paguB - paguA;
      }
    });
    return copy;
  }, [filteredData, activeSort]);

  const hasActiveExtraFilters = statusFilter.length > 0 || kurasiFilter.length > 0 || anomaliFilter.length > 0 || activeSort !== 'PCT_DESC' || showAbnormal || showNoMasterData;

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
            <span className={styles.rupCode}>RUP: {p.rup_code || '-'}</span>
            <AnomaliBadge row={p} />
          </div>
        ),
      },
      { key: 'satker', label: 'Satker', render: (p) => <span className={styles.satkerCell}>{p.satker || '-'}</span> },
      { key: 'ppk', label: 'PPK', render: (p) => <span className={styles.mutedCell}>{p.nama_ppk || '-'}</span> },
      {
        key: 'pagu',
        label: 'Pagu',
        align: 'right',
        sortAccessor: (p) => Number(p.pagu) || 0,
        render: (p) => <span className={styles.monoCell}>{fmtRupiah(p.pagu)}</span>,
      },
      {
        key: 'realisasi',
        label: 'Realisasi',
        align: 'right',
        sortAccessor: (p) => Number(p.total) || 0,
        render: (p) => {
          const over = (p.total || 0) > (p.pagu || 0);
          return <span className={`${styles.monoCell} ${over ? styles.overBudget : ''}`}>{fmtRupiah(p.total)}</span>;
        },
      },
      {
        key: 'pct',
        label: '%',
        align: 'right',
        sortAccessor: (p) => ((p.pagu || 0) > 0 ? (p.total || 0) / (p.pagu || 0) : 0),
        render: (p) => {
          const pct = p.pagu > 0 ? (p.total / p.pagu) * 100 : 0;
          const over = (p.total || 0) > (p.pagu || 0);
          return <strong className={`${styles.pctBadge} ${over ? styles.pctOver : styles.pctNormal}`}>{pct.toFixed(1)}%</strong>;
        },
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        render: (p) => (
          <Badge variant={p.status === 'COMPLETED' ? 'rendah' : 'sedang'} className={styles.statusBadge}>
            {p.status}
          </Badge>
        ),
      },
      {
        key: 'status_kurasi',
        label: 'Status Kurasi',
        align: 'center',
        render: (p) => {
          const sk = p.status_kurasi;
          let variant: 'rendah' | 'sedang' | 'tinggi' | 'default' = 'default';
          if (sk === 'Akurat') variant = 'rendah';
          if (sk === 'Tidak Akurat') variant = 'tinggi';
          return (
            <Badge variant={variant} className={styles.statusBadge}>
              {sk || 'Belum Dikurasi'}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const exportColumns = useMemo(() => [
    { key: 'rup_code', label: 'Kode RUP' },
    { key: 'rup_name', label: 'Nama Paket', width: 40 },
    { key: 'satker', label: 'Satker' },
    { key: 'eselon1', label: 'Eselon I' },
    { key: 'nama_ppk', label: 'Nama PPK' },
    { key: 'kode_penyedia', label: 'Penyedia' },
    { key: 'status', label: 'Status' },
    { key: 'status_kurasi', label: 'Status Kurasi AI' },
    { key: 'catatan_kurasi', label: 'Catatan Kurasi AI', width: 40 },
    { key: 'rekomendasi_kurasi', label: 'Rekomendasi Kurasi AI', width: 40 },
    { key: 'pagu', label: 'Pagu (Rp)', type: 'currency' },
    { key: 'total', label: 'Realisasi (Rp)', type: 'currency' },
    { key: 'pct', label: 'Realisasi (%)', type: 'number' },
  ], []);

  const mapForExport = (item: any) => ({
    ...item,
    pct: (item.pagu || 0) > 0 ? ((item.total || 0) / (item.pagu || 0)) * 100 : 0,
    status_kurasi: item.status_kurasi || 'Belum Dikurasi',
    catatan_kurasi: item.catatan_kurasi || '-',
    rekomendasi_kurasi: item.rekomendasi_kurasi || '-'
  });

  const exportAllData = useMemo(() => baseData.map(mapForExport), [baseData]);
  const exportFilteredData = useMemo(() => sortedPackages.map(mapForExport), [sortedPackages]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {error && <ErrorBox>{error}. Pastikan URL dan KEY Supabase di .env.local valid.</ErrorBox>}

      {loading ? (
        <p className={styles.loadingText}>Memuat data dari Supabase...</p>
      ) : (
        <>
          <MetricGrid
            title="Ringkasan Keuangan"
            icon={Wallet}
            cards={[
              { key: 'pagu', icon: Wallet, label: 'Total Anggaran (Pagu)', value: fmtRupiahDetail(totalPagu), accent: 'info' },
              {
                key: 'real',
                icon: TrendingUp,
                label: 'Total Realisasi',
                value: fmtRupiahDetail(totalRealisasi),
                badge: `${persentase.toFixed(1)}%`,
                badgeTone: 'good',
                accent: 'teal',
              },
              {
                key: 'sisa',
                icon: ListTodo,
                label: 'Sisa Anggaran',
                value: fmtRupiahDetail(totalBelumRealisasi),
                badge: `${persentaseBelumRealisasi.toFixed(1)}%`,
                badgeTone: 'warn',
                accent: 'amber',
              },
            ]}
          />

          <AnomaliPanel summary={anomaliSummary} activeFilter={anomaliFilter} onToggleFilter={toggleAnomali} />

          <div className={styles.progressWrap}>
            <DualProgressBar
              title="Progres Penyerapan Anggaran"
              totalLabel={`Total Pagu: ${fmtRupiahDetail(totalPagu)}`}
              donePct={persentase}
              remainingPct={persentaseBelumRealisasi}
              doneLabel="Terealisasi"
              remainingLabel="Sisa"
            />
          </div>

          <MetricGrid
            title="Status Paket E-Purchasing"
            icon={Package}
            cards={[
              { key: 'total', icon: Package, label: 'Total Seluruh Paket', value: totalPaket, accent: 'neutral' },
              { key: 'selesai', icon: CheckCircle2, label: 'Paket Selesai', value: paketSelesai, accent: 'teal' },
              { key: 'belum', icon: Clock, label: 'Paket Proses / Belum Selesai', value: paketBelumSelesai, accent: 'amber' },
            ]}
          />

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
                <span className={styles.filterLabel}>Status Realisasi</span>
                <FilterPillGroup options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Status Kurasi AI</span>
                <FilterPillGroup options={KURASI_OPTIONS} selected={kurasiFilter} onChange={setKurasiFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Urutkan</span>
                <div className={styles.filterRow}>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      style={{
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: `1px solid ${activeSort === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                        background: activeSort === opt.value ? 'var(--accent)' : 'var(--surface)',
                        color: activeSort === opt.value ? '#fff' : 'var(--text-secondary)',
                      }}
                      onClick={() => setSortBy([opt.value])}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Kategori</span>
                <FilterToggle label="Paket Abnormal (Realisasi > Pagu)" activeLabel="✕ Batal Filter Abnormal" active={showAbnormal} onChange={setShowAbnormal} />
                <FilterToggle label="Tanpa Master Data / PPK" activeLabel="✕ Batal Filter Tanpa Data" active={showNoMasterData} onChange={setShowNoMasterData} />
              </div>
              {hasActiveExtraFilters && (
                <button
                  type="button"
                  className={styles.resetAllBtn}
                  onClick={() => {
                    setSortBy(['PCT_DESC']);
                    setStatusFilter([]);
                    setKurasiFilter([]);
                    setAnomaliFilter([]);
                    setShowAbnormal(false);
                    setShowNoMasterData(false);
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
            getRowKey={(p, i) => p.order_id || i}
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
        title="Detail E-Purchasing"
        historyData={historyData}
        loadingHistory={loadingHistory}
        statusKurasi={selectedItem?.status_kurasi}
        catatanKurasi={selectedItem?.catatan_kurasi}
        rekomendasiKurasi={selectedItem?.rekomendasi_kurasi}
      >
        {selectedItem && (
          <>
            <div>
              <h3 className={styles.modalTitle}>{selectedItem.rup_name}</h3>
              <p className={styles.modalText} style={{ margin: 0 }}>
                Penyedia: <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.kode_penyedia || '-'}</strong>
              </p>
            </div>

            <div className={styles.modalGrid}>
              <div>
                <span className={styles.modalFieldLabel}>Kode RUP</span>
                <span className={styles.modalFieldValue}>{selectedItem.rup_code}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Metode Pengadaan</span>
                <span className={styles.modalFieldValue}>E-Purchasing</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Total Nilai Pagu</span>
                <span className={styles.modalFieldValue}>{fmtRupiahDetail(selectedItem.pagu)}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Total Nilai Realisasi</span>
                <span className={styles.modalFieldValueStrong}>{fmtRupiahDetail(selectedItem.total)}</span>
              </div>
            </div>

            <div>
              <h4 className={styles.modalSectionTitle}>Informasi Instansi &amp; Satker</h4>
              <p className={styles.modalText}>Instansi: {selectedItem.kode_klpd || '-'}</p>
              <p className={styles.modalText}>Satuan Kerja: {selectedItem.satker}</p>
              <p className={styles.modalText}>PPK: {selectedItem.nama_ppk}</p>
            </div>

            <div>
              <h4 className={styles.modalSectionTitle}>Detail Status</h4>
              <p className={styles.modalText}>
                Status Paket: <strong className={styles.modalStatusStrong}>{selectedItem.status}</strong>
              </p>
              <p className={styles.modalText}>Status Aktif RUP: {selectedItem.status_aktif_rup === true ? 'Aktif' : 'Tidak / N/A'}</p>
              {selectedItem.tgl_pengumuman_paket && (
                <p className={styles.modalText}>
                  Tanggal Pengumuman: {new Date(selectedItem.tgl_pengumuman_paket).toLocaleDateString('id-ID')}
                </p>
              )}
            </div>
          </>
        )}
      </PaketDetailModal>

      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Laporan Realisasi E-Purchasing"
        filename={`Laporan_EPurchasing_${new Date().toISOString().slice(0,10)}`}
        columns={exportColumns}
        allData={exportAllData}
        filteredData={exportFilteredData}
      />
    </motion.div>
  );
}
