"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, ListTodo, Package, CheckCircle2, Clock } from 'lucide-react';
import { fmtRupiah, fmtRupiahDetail } from '@/lib/format';
import { fetchRupHistory, type RupHistoryEntry } from '@/lib/paket/rupHistory';
import { fetchGabunganRows, type GabunganRow } from '@/features/ringkasan/lib/ringkasanData';
import { jenisOf, metodeOf, JENIS_ANOMALI } from '@/lib/drilldown';
import { useOrgFilters } from '@/hooks/useOrgFilters';
import { useUrlPillFilter } from '@/hooks/useUrlPillFilter';
import { OrgFilterBar } from '@/components/paket/OrgFilterBar';
import { FilterPillGroup } from '@/components/paket/FilterPillGroup';
import { MetricGrid, DualProgressBar } from '@/components/paket/SummaryCards';
import { AnomaliPanel, AnomaliBadge } from '@/components/paket/AnomaliPanel';
import { summarizeAnomali, matchesAnomali, type AnomaliJenis } from '@/lib/anomali';
import { PaketTable, type PaketColumn } from '@/components/paket/PaketTable';
import { PaketDetailModal } from '@/components/paket/PaketDetailModal';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
import styles from '@/components/paket/paketView.module.css';

/**
 * Daftar seluruh paket lintas metode — tujuan drill-down dari Ringkasan.
 *
 * Halaman Realisasi lain dipecah menurut METODE, sedangkan Jenis Pengadaan
 * memotong melintang: 5.909 paket "Barang" tersebar di kelima halaman itu
 * sekaligus. Halaman ini yang menampung keduanya, dan sengaja mengambil data
 * dari fetchGabunganRows() — fungsi yang SAMA dengan yang dipakai Ringkasan —
 * supaya jumlah paket yang muncul di sini identik dengan angka yang barusan
 * diklik pengguna, bukan sekadar mirip.
 */

const METODE_OPTIONS = [
  { value: 'Pengadaan Langsung', label: 'Pengadaan Langsung' },
  { value: 'E-Purchasing', label: 'E-Purchasing' },
  { value: 'Dikecualikan', label: 'Dikecualikan' },
  { value: 'Penunjukan Langsung', label: 'Penunjukan Langsung' },
  { value: 'Swakelola', label: 'Swakelola' },
  { value: 'Tender', label: 'Tender' },
  { value: 'Seleksi', label: 'Seleksi' },
  { value: 'Pembayaran untuk Kontrak Tahun Jamak', label: 'Pembayaran Kontrak Tahun Jamak' },
];

const JENIS_OPTIONS = [
  { value: 'Barang', label: 'Barang' },
  { value: 'Jasa Lainnya', label: 'Jasa Lainnya' },
  { value: 'Pekerjaan Konstruksi', label: 'Pekerjaan Konstruksi' },
  { value: 'Jasa Konsultansi', label: 'Jasa Konsultansi' },
  { value: 'Barang;Jasa Lainnya', label: 'Barang & Jasa Lainnya' },
  { value: 'Swakelola', label: 'Swakelola' },
  { value: JENIS_ANOMALI, label: JENIS_ANOMALI },
];

const STATUS_OPTIONS = [
  { value: 'SUDAH', label: 'Terdapat Realisasi' },
  { value: 'BELUM', label: 'Belum Terealisasi' },
];

const KURASI_OPTIONS = [
  { value: 'Akurat', label: 'Akurat' },
  { value: 'Tidak Akurat', label: 'Tidak Akurat' },
  { value: 'Belum Dikurasi', label: 'Belum Dikurasi' },
];

const SORT_OPTIONS = [
  { value: 'PAGU_DESC', label: 'Pagu Tertinggi' },
  { value: 'PAGU_ASC', label: 'Pagu Terendah' },
  { value: 'REAL_DESC', label: 'Realisasi Tertinggi' },
  { value: 'REAL_ASC', label: 'Realisasi Terendah' },
];

const num = (v: unknown): number => Number(v) || 0;

export function DaftarPaketView() {
  const [data, setData] = useState<GabunganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { satker, ppk, search, setEselon1, setSatker, setPpk, setSearch } = useOrgFilters();

  // Metode & jenis hidup di URL, bukan di useState: keduanya adalah filter yang
  // DIBAWA dari Ringkasan lewat tautan, jadi nilai awalnya harus bisa datang
  // dari luar halaman ini.
  const [metodeFilter, setMetodeFilter] = useUrlPillFilter('m');
  const [jenisFilter, setJenisFilter] = useUrlPillFilter('j');

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [kurasiFilter, setKurasiFilter] = useState<string[]>([]);
  const [anomaliFilter, setAnomaliFilter] = useState<AnomaliJenis[]>([]);
  const [sortBy, setSortBy] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<GabunganRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Riwayat disimpan bersama kode RUP pemiliknya, bukan sebagai daftar telanjang
  // yang perlu dikosongkan tiap kali panel berganti paket. Dengan begitu riwayat
  // milik paket lain tidak pernah sempat terlihat, tanpa perlu setState
  // pembersih di dalam efek (yang memicu render berantai).
  const [history, setHistory] = useState<{ kd: string; rows: RupHistoryEntry[] } | null>(null);
  // Kedua nilai ini DITURUNKAN, bukan disimpan: "sedang memuat" persis berarti
  // "panel terbuka tapi riwayat yang tersimpan belum milik paket ini".
  const historyCocok = Boolean(selectedItem && history?.kd === selectedItem.kd_rup);
  const historyData = historyCocok && history ? history.rows : [];
  const loadingHistory = Boolean(isModalOpen && selectedItem && !historyCocok);

  useEffect(() => {
    if (!isModalOpen || !selectedItem) return;
    const kd = selectedItem.kd_rup;
    let cancelled = false;
    fetchRupHistory(kd)
      // Kegagalan pun harus dicatat sebagai "riwayat milik kd ini", kalau tidak
      // loadingHistory yang diturunkan itu akan menyala selamanya.
      .catch(() => [] as RupHistoryEntry[])
      .then((rows) => {
        if (!cancelled) setHistory({ kd, rows });
      });
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, selectedItem]);

  useEffect(() => {
    let cancelled = false;
    fetchGabunganRows()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat data dari Supabase.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const baseData = useMemo(() => {
    let d = data;
    if (satker) d = d.filter((item) => (item.satker || 'Tidak Diketahui') === satker);
    if (ppk) d = d.filter((item) => (item.nama_ppk || 'Tidak Diketahui') === ppk);
    // metodeOf/jenisOf, bukan kolom mentah — aturan turunannya (mis. swakelola
    // masuk jenis 'Swakelola', jenis kosong jadi 'Paket Anomali') harus sama
    // persis dengan Ringkasan, kalau tidak jumlahnya akan meleset.
    if (metodeFilter.length > 0) d = d.filter((item) => metodeFilter.includes(metodeOf(item)));
    if (jenisFilter.length > 0) d = d.filter((item) => jenisFilter.includes(jenisOf(item)));
    return d;
  }, [data, satker, ppk, metodeFilter, jenisFilter]);

  const filteredData = useMemo(() => {
    let d = baseData;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(
        (p) =>
          (p.rup_name && p.rup_name.toLowerCase().includes(q)) ||
          (p.kd_rup && String(p.kd_rup).toLowerCase().includes(q)) ||
          (p.satker && p.satker.toLowerCase().includes(q)) ||
          (p.nama_ppk && p.nama_ppk.toLowerCase().includes(q))
      );
    }
    if (statusFilter.length > 0) {
      d = d.filter((p) => statusFilter.includes(num(p.total) > 0 ? 'SUDAH' : 'BELUM'));
    }
    if (kurasiFilter.length > 0) {
      d = d.filter((p) => kurasiFilter.includes(p.status_kurasi || 'Belum Dikurasi'));
    }
    if (anomaliFilter.length > 0) d = d.filter((p) => matchesAnomali(p, anomaliFilter));
    return d;
  }, [baseData, search, statusFilter, kurasiFilter, anomaliFilter]);

  const anomaliSummary = useMemo(() => summarizeAnomali(baseData), [baseData]);
  const toggleAnomali = (j: AnomaliJenis) =>
    setAnomaliFilter((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));

  // Satu baris = satu paket, aturan yang sama dengan aggregate() di Ringkasan
  // (bukan countRup). Inilah yang membuat "7.742 paket" di donut sama dengan
  // jumlah baris di sini.
  const contextPagu = filteredData.reduce((s, d) => s + num(d.pagu), 0);
  const contextRealisasi = filteredData.reduce((s, d) => s + num(d.total), 0);
  const contextBelumRealisasi = Math.max(0, contextPagu - contextRealisasi);
  const persentase = contextPagu > 0 ? (contextRealisasi / contextPagu) * 100 : 0;
  const persentaseBelumRealisasi = contextPagu > 0 ? (contextBelumRealisasi / contextPagu) * 100 : 0;

  const totalPaket = filteredData.length;
  const paketSelesai = filteredData.filter((p) => num(p.total) > 0).length;
  const paketBelumSelesai = totalPaket - paketSelesai;

  const activeSort = sortBy[0];
  const sortedPackages = useMemo(() => {
    const copy = [...filteredData];
    copy.sort((a, b) => {
      if (activeSort === 'PAGU_DESC') return num(b.pagu) - num(a.pagu);
      if (activeSort === 'PAGU_ASC') return num(a.pagu) - num(b.pagu);
      if (activeSort === 'REAL_DESC') return num(b.total) - num(a.total);
      if (activeSort === 'REAL_ASC') return num(a.total) - num(b.total);
      const pctA = num(a.pagu) > 0 ? num(a.total) / num(a.pagu) : 0;
      const pctB = num(b.pagu) > 0 ? num(b.total) / num(b.pagu) : 0;
      return pctB - pctA;
    });
    return copy;
  }, [filteredData, activeSort]);

  const hasActiveExtraFilters =
    statusFilter.length > 0 ||
    kurasiFilter.length > 0 ||
    anomaliFilter.length > 0 ||
    metodeFilter.length > 0 ||
    jenisFilter.length > 0 ||
    sortBy.length > 0;

  const columns: PaketColumn<GabunganRow>[] = useMemo(
    () => [
      {
        key: 'nama',
        label: 'Nama Paket',
        render: (p) => (
          <div className={styles.nameCell}>
            <span className={styles.nameText} title={p.rup_name || ''}>
              {p.rup_name}
            </span>
            <span className={styles.rupCode}>RUP: {p.kd_rup || '-'}</span>
            <AnomaliBadge row={p} />
          </div>
        ),
      },
      { key: 'satker', label: 'Satker', render: (p) => <span className={styles.satkerCell}>{p.satker || '-'}</span> },
      { key: 'ppk', label: 'PPK', render: (p) => <span className={styles.mutedCell}>{p.nama_ppk || '-'}</span> },
      {
        key: 'metode',
        label: 'Metode',
        render: (p) => (
          <Badge
            variant="default"
            className={metodeOf(p) === 'Dikecualikan' ? styles.metodeDikecualikan : styles.metodeDefault}
          >
            {metodeOf(p)}
          </Badge>
        ),
      },
      { key: 'jenis', label: 'Jenis', render: (p) => <span className={styles.mutedCell}>{jenisOf(p)}</span> },
      {
        key: 'pagu',
        label: 'Pagu',
        align: 'right',
        sortAccessor: (p) => num(p.pagu),
        render: (p) => <span className={styles.monoCell}>{fmtRupiah(num(p.pagu))}</span>,
      },
      {
        key: 'realisasi',
        label: 'Realisasi',
        align: 'right',
        sortAccessor: (p) => num(p.total),
        render: (p) => {
          const over = num(p.total) > num(p.pagu);
          return <span className={`${styles.monoCell} ${over ? styles.overBudget : ''}`}>{fmtRupiah(num(p.total))}</span>;
        },
      },
      {
        key: 'pct',
        label: '%',
        align: 'right',
        sortAccessor: (p) => (num(p.pagu) > 0 ? num(p.total) / num(p.pagu) : 0),
        render: (p) => {
          const pct = num(p.pagu) > 0 ? (num(p.total) / num(p.pagu)) * 100 : 0;
          const over = num(p.total) > num(p.pagu);
          return <strong className={`${styles.pctBadge} ${over ? styles.pctOver : styles.pctNormal}`}>{pct.toFixed(1)}%</strong>;
        },
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        render: (p) => (
          <Badge variant={num(p.total) > 0 ? 'rendah' : 'sedang'} className={styles.statusBadge}>
            {num(p.total) > 0 ? 'SUDAH REALISASI' : 'BELUM REALISASI'}
          </Badge>
        ),
      },
      {
        key: 'kurasi',
        label: 'Status Kurasi',
        align: 'center',
        render: (p) => {
          const s = p.status_kurasi || 'Belum Dikurasi';
          const variant = s === 'Akurat' ? 'rendah' : s === 'Tidak Akurat' ? 'tinggi' : 'sedang';
          return (
            <Badge variant={variant} className={styles.statusBadge}>
              {s}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const exportColumns = useMemo(
    () => [
      { key: 'kd_rup', label: 'Kode RUP' },
      { key: 'rup_name', label: 'Nama Paket', width: 40 },
      { key: 'satker', label: 'Satker' },
      { key: 'nama_ppk', label: 'Nama PPK' },
      { key: 'metode_pengadaan', label: 'Metode Pengadaan' },
      { key: 'jenis_pengadaan', label: 'Jenis Pengadaan' },
      { key: 'pagu', label: 'Pagu (Rp)', type: 'currency' },
      { key: 'total', label: 'Total Realisasi (Rp)', type: 'currency' },
      { key: 'pct', label: 'Realisasi (%)', type: 'number' },
      { key: 'status', label: 'Status' },
      { key: 'status_kurasi', label: 'Status Kurasi AI' },
      { key: 'catatan_kurasi', label: 'Catatan Kurasi AI', width: 40 },
      { key: 'rekomendasi_kurasi', label: 'Rekomendasi Kurasi AI', width: 40 },
    ],
    []
  );

  const mapForExport = (item: GabunganRow) => ({
    ...item,
    // Kolom turunan, bukan mentah — supaya isi berkas ekspor sama dengan yang
    // terbaca di layar (termasuk 'Paket Anomali' untuk jenis yang kosong).
    metode_pengadaan: metodeOf(item),
    jenis_pengadaan: jenisOf(item),
    pct: num(item.pagu) > 0 ? (num(item.total) / num(item.pagu)) * 100 : 0,
    status: num(item.total) > 0 ? 'SUDAH REALISASI' : 'BELUM REALISASI',
    status_kurasi: item.status_kurasi || 'Belum Dikurasi',
    catatan_kurasi: item.catatan_kurasi || '-',
    rekomendasi_kurasi: item.rekomendasi_kurasi || '-',
  });

  const exportAllData = useMemo(() => baseData.map(mapForExport), [baseData]);
  const exportFilteredData = useMemo(() => sortedPackages.map(mapForExport), [sortedPackages]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
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
                label: 'Total Realisasi',
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
            title="Status Paket"
            icon={Package}
            cards={[
              { key: 'total', icon: Package, label: 'Total Paket', value: totalPaket, accent: 'neutral' },
              { key: 'selesai', icon: CheckCircle2, label: 'Terdapat Realisasi', value: paketSelesai, accent: 'teal' },
              { key: 'belum', icon: Clock, label: 'Belum Terealisasi', value: paketBelumSelesai, accent: 'amber' },
            ]}
          />

          <AnomaliPanel summary={anomaliSummary} activeFilter={anomaliFilter} onToggleFilter={toggleAnomali} />

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
            eselon1={null}
            satker={satker}
            ppk={ppk}
            search={search}
            onEselon1Change={setEselon1}
            onSatkerChange={setSatker}
            onPpkChange={setPpk}
            onSearchChange={setSearch}
            searchPlaceholder="Cari nama paket, kode RUP, satker, PPK..."
            // view_dashboard_gabungan_satker tidak punya kolom Eselon I —
            // pemilihnya akan berisi satu opsi kosong yang tidak menyaring apa pun.
            showEselon1={false}
          />

          {/* Metode & Jenis di luar Filter Lanjutan: keduanya adalah filter yang
              dibawa dari Ringkasan, jadi harus terlihat begitu halaman terbuka —
              kalau tersembunyi di balik toggle, pengguna melihat daftar yang
              tersaring tanpa tahu apa yang menyaringnya. */}
          <div className={styles.advancedPanel}>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Metode</span>
              <FilterPillGroup options={METODE_OPTIONS} selected={metodeFilter} onChange={setMetodeFilter} multi={false} />
            </div>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Jenis</span>
              <FilterPillGroup options={JENIS_OPTIONS} selected={jenisFilter} onChange={setJenisFilter} multi={false} />
            </div>
          </div>

          {showAdvanced && (
            <div className={styles.advancedPanel}>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Status</span>
                <FilterPillGroup options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Kurasi AI</span>
                <FilterPillGroup options={KURASI_OPTIONS} selected={kurasiFilter} onChange={setKurasiFilter} />
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
                    setKurasiFilter([]);
                    setAnomaliFilter([]);
                    setMetodeFilter([]);
                    setJenisFilter([]);
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
        title="Detail Paket"
        historyData={historyData}
        loadingHistory={loadingHistory}
        statusKurasi={selectedItem?.status_kurasi ?? undefined}
        catatanKurasi={selectedItem?.catatan_kurasi ?? undefined}
        rekomendasiKurasi={selectedItem?.rekomendasi_kurasi ?? undefined}
        kdRup={selectedItem?.kd_rup}
        onCurationSuccess={(newData) => setSelectedItem((prev) => (prev ? { ...prev, ...newData } : null))}
      >
        {selectedItem && (
          <>
            <div>
              <h3 className={styles.modalTitle}>{selectedItem.rup_name}</h3>
            </div>

            <div className={styles.modalGrid}>
              <div>
                <span className={styles.modalFieldLabel}>Kode RUP</span>
                <span className={styles.modalFieldValue}>{selectedItem.kd_rup}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Metode Pengadaan</span>
                <span className={styles.modalFieldValue}>{metodeOf(selectedItem)}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Jenis Pengadaan</span>
                <span className={styles.modalFieldValue}>{jenisOf(selectedItem)}</span>
              </div>
              <div className={styles.modalDivider} />
              <div>
                <span className={styles.modalFieldLabel}>Total Nilai Pagu</span>
                <span className={styles.modalFieldValue}>{fmtRupiahDetail(num(selectedItem.pagu))}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Total Realisasi</span>
                <span className={styles.modalFieldValueStrong}>{fmtRupiahDetail(num(selectedItem.total))}</span>
              </div>
            </div>

            <div>
              <h4 className={styles.modalSectionTitle}>Informasi Instansi &amp; Satker</h4>
              <p className={styles.modalText}>Satuan Kerja: {selectedItem.satker || '-'}</p>
              <p className={styles.modalText}>PPK: {selectedItem.nama_ppk || '-'}</p>
            </div>

            <div>
              <h4 className={styles.modalSectionTitle}>Detail Status</h4>
              <p className={styles.modalText}>
                Status Paket:{' '}
                <strong className={styles.modalStatusStrong}>
                  {num(selectedItem.total) > 0 ? 'Terdapat Realisasi' : 'Belum Ada Realisasi'}
                </strong>
              </p>
              <p className={styles.modalText}>
                Terumumkan di SIRUP: {selectedItem.is_from_sirup === false ? 'Tidak — realisasi tanpa RUP' : 'Ya'}
              </p>
            </div>
          </>
        )}
      </PaketDetailModal>

      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allData={exportAllData}
        filteredData={exportFilteredData}
        columns={exportColumns}
        title="Daftar Seluruh Paket"
        filename="daftar-seluruh-paket"
      />
    </motion.div>
  );
}
