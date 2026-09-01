"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Wallet, ShieldCheck, AlertTriangle, PieChart, Layers, CalendarClock, MapPin } from 'lucide-react';
import { fetchProgramPrioritasNasional } from '../lib/fetchProgramPrioritasNasional';
import { MATCH_STATUS_LABEL, type MatchStatus, type ProgramPrioritasRow } from '../lib/types';
import { MetricGrid, type MetricCardDef } from '@/components/paket/SummaryCards';
import { FilterAdvancedCard } from '@/components/paket/FilterAdvancedCard';
import { Card } from '@/components/ui/Card';
import { PaketTable, type PaketColumn } from '@/components/paket/PaketTable';
import { FilterPillGroup, type PillOption } from '@/components/paket/FilterPillGroup';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
import { fmtRupiahDetail, fmtInt, fmtPct } from '@/lib/format';
import { metodeColor, jenisColor, sumberColor, categoricalColor } from '@/features/ringkasan/components/charts/chartTheme';
import { PnCategoryDonut, type PnDonutDatum } from './charts/PnCategoryDonut';
import styles from '@/components/paket/paketView.module.css';
import viewStyles from './ProgramPrioritasNasionalView.module.css';

const UNKNOWN = 'Tidak Diketahui';
const MONTH_ORDER = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function sortWaktuLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const ia = MONTH_ORDER.indexOf(a);
    const ib = MONTH_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'id');
  });
}

function groupByCount(rows: ProgramPrioritasRow[], keyFn: (r: ProgramPrioritasRow) => string | null): PnDonutDatum[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r) || UNKNOWN;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function matchStatusColor(label: string, isDark: boolean): string {
  if (label === MATCH_STATUS_LABEL.penyedia) return sumberColor('Paket Penyedia', isDark);
  if (label === MATCH_STATUS_LABEL.swakelola) return sumberColor('Paket Swakelola', isDark);
  return isDark ? '#64748b' : '#94a3b8';
}

const MATCH_OPTIONS: PillOption[] = (Object.keys(MATCH_STATUS_LABEL) as MatchStatus[]).map((value) => ({
  value,
  label: MATCH_STATUS_LABEL[value],
}));

function toExportRow(r: ProgramPrioritasRow) {
  return { ...r, match_status_label: MATCH_STATUS_LABEL[r.match_status] };
}

export function ProgramPrioritasNasionalView() {
  const [rows, setRows] = useState<ProgramPrioritasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [skemaFilter, setSkemaFilter] = useState<string[]>([]);
  const [jenisFilter, setJenisFilter] = useState<string[]>([]);
  const [waktuFilter, setWaktuFilter] = useState<string[]>([]);
  const [matchFilter, setMatchFilter] = useState<string[]>([]);
  const [satkerFilter, setSatkerFilter] = useState<string | null>(null);
  const [perluPerhatianOnly, setPerluPerhatianOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<ProgramPrioritasRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProgramPrioritasNasional();
      setRows(data);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Gagal memuat data Program Prioritas Nasional dari Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const skemaOptions = useMemo<PillOption[]>(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.skema || UNKNOWN));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id')).map((v) => ({ value: v, label: v }));
  }, [rows]);

  const jenisOptions = useMemo<PillOption[]>(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.jenis_pengadaan || UNKNOWN));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id')).map((v) => ({ value: v, label: v }));
  }, [rows]);

  const waktuOptions = useMemo<PillOption[]>(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.waktu_pengadaan || UNKNOWN));
    return sortWaktuLabels(Array.from(set)).map((v) => ({ value: v, label: v }));
  }, [rows]);

  const satkerOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.nama_satker) set.add(r.nama_satker);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [rows]);

  const waktuColorIndex = useMemo(() => {
    const sorted = sortWaktuLabels(waktuOptions.map((o) => o.value));
    const map = new Map<string, number>();
    sorted.forEach((label, i) => map.set(label, i));
    return map;
  }, [waktuOptions]);

  const waktuColor = useCallback(
    (label: string, isDark: boolean) => categoricalColor(waktuColorIndex.get(label) ?? 0, isDark),
    [waktuColorIndex]
  );

  const baseData = useMemo(() => {
    let d = rows;
    if (skemaFilter.length > 0) d = d.filter((r) => skemaFilter.includes(r.skema || UNKNOWN));
    if (jenisFilter.length > 0) d = d.filter((r) => jenisFilter.includes(r.jenis_pengadaan || UNKNOWN));
    if (waktuFilter.length > 0) d = d.filter((r) => waktuFilter.includes(r.waktu_pengadaan || UNKNOWN));
    if (matchFilter.length > 0) d = d.filter((r) => matchFilter.includes(r.match_status));
    if (satkerFilter) d = d.filter((r) => r.nama_satker === satkerFilter);
    if (perluPerhatianOnly) d = d.filter((r) => Boolean((r.kendala || '').trim()) && !(r.mitigasi || '').trim());
    return d;
  }, [rows, skemaFilter, jenisFilter, waktuFilter, matchFilter, satkerFilter, perluPerhatianOnly]);

  const filteredData = useMemo(() => {
    let d = baseData;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(
        (r) =>
          (r.nama_paket && r.nama_paket.toLowerCase().includes(q)) ||
          (r.nama_ro && r.nama_ro.toLowerCase().includes(q)) ||
          (r.kd_rup && r.kd_rup.toLowerCase().includes(q)) ||
          (r.lokasi && r.lokasi.toLowerCase().includes(q)) ||
          (r.nama_satker && r.nama_satker.toLowerCase().includes(q)) ||
          (r.nama_ppk && r.nama_ppk.toLowerCase().includes(q))
      );
    }
    return d;
  }, [baseData, search]);

  const hasActiveExtraFilters =
    skemaFilter.length > 0 || jenisFilter.length > 0 || waktuFilter.length > 0 || matchFilter.length > 0 || Boolean(satkerFilter) || perluPerhatianOnly;

  const totalPaket = filteredData.length;
  const totalNilaiPaket = useMemo(() => filteredData.reduce((s, r) => s + r.nilai_paket, 0), [filteredData]);
  const matchedCount = useMemo(() => filteredData.filter((r) => r.match_status !== 'tidak_ditemukan').length, [filteredData]);
  const matchPct = totalPaket > 0 ? (matchedCount / totalPaket) * 100 : 0;
  const kendalaCount = useMemo(() => filteredData.filter((r) => Boolean((r.kendala || '').trim())).length, [filteredData]);
  const perluPerhatianCount = useMemo(
    () => filteredData.filter((r) => Boolean((r.kendala || '').trim()) && !(r.mitigasi || '').trim()).length,
    [filteredData]
  );
  const invalidKdRupCount = useMemo(
    () => rows.filter((r) => !r.kd_rup || !Number.isFinite(Number(r.kd_rup))).length,
    [rows]
  );

  const skemaChartData = useMemo(() => groupByCount(filteredData, (r) => r.skema), [filteredData]);
  const jenisChartData = useMemo(() => groupByCount(filteredData, (r) => r.jenis_pengadaan), [filteredData]);
  const matchChartData = useMemo<PnDonutDatum[]>(() => {
    const order: MatchStatus[] = ['penyedia', 'swakelola', 'tidak_ditemukan'];
    return order.map((k) => ({
      label: MATCH_STATUS_LABEL[k],
      count: filteredData.filter((r) => r.match_status === k).length,
    }));
  }, [filteredData]);

  const kpiCards: MetricCardDef[] = [
    { key: 'total', icon: Star, label: 'Total Paket PN', value: fmtInt(totalPaket), accent: 'info' },
    { key: 'nilai', icon: Wallet, label: 'Total Nilai Paket', value: fmtRupiahDetail(totalNilaiPaket), accent: 'indigo' },
    {
      key: 'match',
      icon: ShieldCheck,
      label: 'Match ke Data SPSE',
      value: `${fmtInt(matchedCount)} (${fmtPct(matchPct, 1)})`,
      accent: 'teal',
      badge: matchPct < 70 ? 'Perlu Ditelusuri' : undefined,
      badgeTone: 'warn',
    },
    { key: 'kendala', icon: AlertTriangle, label: 'Paket dengan Kendala', value: fmtInt(kendalaCount), accent: 'amber' },
    { key: 'perlu_perhatian', icon: AlertTriangle, label: 'Perlu Perhatian (Kendala Tanpa Mitigasi)', value: fmtInt(perluPerhatianCount), accent: 'purple' },
  ];

  const columns: PaketColumn<ProgramPrioritasRow>[] = useMemo(
    () => [
      {
        key: 'nama',
        label: 'Nama Paket',
        render: (p) => (
          <div className={styles.nameCell}>
            <span className={styles.nameText} title={p.nama_paket || undefined}>
              {p.nama_paket || 'Tanpa Nama'}
            </span>
            <span className={styles.rupCode}>RUP: {p.kd_rup || '-'}</span>
          </div>
        ),
      },
      { key: 'nama_ro', label: 'Nama RO', render: (p) => <span className={styles.satkerCell}>{p.nama_ro || '-'}</span> },
      {
        key: 'nilai_paket',
        label: 'Nilai Paket',
        align: 'right',
        sortAccessor: (p) => p.nilai_paket,
        render: (p) => <span className={styles.monoCell}>{fmtRupiahDetail(p.nilai_paket)}</span>,
      },
      { key: 'skema', label: 'Skema', render: (p) => <span className={styles.mutedCell}>{p.skema || '-'}</span> },
      { key: 'jenis_pengadaan', label: 'Jenis Pengadaan', render: (p) => <span className={styles.mutedCell}>{p.jenis_pengadaan || '-'}</span> },
      { key: 'lokasi', label: 'Lokasi', render: (p) => <span className={styles.satkerCell}>{p.lokasi || '-'}</span> },
      { key: 'waktu_pengadaan', label: 'Waktu', render: (p) => <span className={styles.mutedCell}>{p.waktu_pengadaan || '-'}</span> },
      {
        key: 'match_status',
        label: 'Status Match',
        align: 'center',
        sortAccessor: (p) => MATCH_STATUS_LABEL[p.match_status],
        render: (p) => (
          <Badge variant={p.match_status === 'tidak_ditemukan' ? 'tinggi' : 'rendah'}>{MATCH_STATUS_LABEL[p.match_status]}</Badge>
        ),
      },
      { key: 'realisasi', label: 'Realisasi', render: (p) => <span className={styles.mutedCell}>{p.realisasi || '-'}</span> },
    ],
    []
  );

  const exportColumns = useMemo(
    () => [
      { key: 'no', label: 'No' },
      { key: 'nama_ro', label: 'Nama RO', width: 30 },
      { key: 'nama_paket', label: 'Nama Paket', width: 40 },
      { key: 'kd_rup', label: 'Kode RUP' },
      { key: 'nilai_paket', label: 'Nilai Paket (Rp)', type: 'currency' as const },
      { key: 'skema', label: 'Skema' },
      { key: 'jenis_pengadaan', label: 'Jenis Pengadaan' },
      { key: 'lokasi', label: 'Lokasi', width: 30 },
      { key: 'waktu_pengadaan', label: 'Waktu Pengadaan' },
      { key: 'kendala', label: 'Kendala', width: 30 },
      { key: 'mitigasi', label: 'Mitigasi', width: 30 },
      { key: 'realisasi', label: 'Realisasi' },
      { key: 'match_status_label', label: 'Status Match' },
      { key: 'nama_satker', label: 'Satker (SPSE)', width: 30 },
      { key: 'nama_ppk', label: 'PPK (SPSE)', width: 25 },
      { key: 'pagu_spse', label: 'Pagu SPSE (Rp)', type: 'currency' as const },
      { key: 'tahun_anggaran', label: 'Tahun Anggaran', type: 'number' as const },
    ],
    []
  );
  // Pemetaan ekspor menyalin setiap baris yang lolos filter. Modal ekspor
  // hampir selalu tertutup, jadi jangan bayar salinan itu di tiap ketikan
  // pencarian — hitung saat modalnya dibuka.
  const exportAllData = useMemo(
    () => (isExportModalOpen ? baseData.map(toExportRow) : []),
    [isExportModalOpen, baseData]
  );
  const exportFilteredData = useMemo(
    () => (isExportModalOpen ? filteredData.map(toExportRow) : []),
    [isExportModalOpen, filteredData]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {error && <ErrorBox>{error}. Pastikan tabel master_data_ro sudah tersedia di Supabase (lihat sql/migrations/66_alter_master_data_ro_kolom_realisasi.sql).</ErrorBox>}

      {loading ? (
        <p className={styles.loadingText}>Memuat data Program Prioritas Nasional dari Supabase...</p>
      ) : rows.length === 0 ? (
        <div className={styles.modalBox}>
          <p className={styles.modalBoxText}>
            Belum ada data pada tabel master_data_ro. Jalankan script scripts/import_master_data_pn_ro.mjs untuk mengimpor data Program
            Prioritas Nasional.
          </p>
        </div>
      ) : (
        <>
          {invalidKdRupCount > 0 && (
            <div className={viewStyles.warningBanner}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {fmtInt(invalidKdRupCount)} dari {fmtInt(rows.length)} paket memiliki Kode RUP kosong/tidak valid, sehingga tidak bisa
                dicocokkan ke data SPSE (Status Match: Tidak Ditemukan). Periksa kembali kolom &quot;Kode/ID paket&quot; pada sumber data
                master_data_ro.
              </span>
            </div>
          )}

          <MetricGrid title="Ringkasan Program Prioritas Nasional" icon={Star} cards={kpiCards} />

          <div className={viewStyles.insightSection}>
            <div className={viewStyles.sectionLabel}>
              <span className={viewStyles.sectionEyebrow}>
                <PieChart size={13} />
                Distribusi Paket
              </span>
              <span className={viewStyles.sectionCaption}>Sebaran paket PN berdasarkan skema, jenis pengadaan, dan status kecocokan data SPSE</span>
            </div>
            <div className={viewStyles.chartGrid}>
              <Card>
                <Card.Header className={viewStyles.cardHeader}>
                  <Card.Icon tone="neutral"><Layers /></Card.Icon>
                  <div className={viewStyles.titleWrap}>
                    <Card.Title>Skema</Card.Title>
                    <div className={viewStyles.cardSubtitle}>Metode pengadaan paket PN</div>
                  </div>
                </Card.Header>
                <Card.Body>
                  <PnCategoryDonut data={skemaChartData} getColor={metodeColor} />
                </Card.Body>
              </Card>
              <Card>
                <Card.Header className={viewStyles.cardHeader}>
                  <Card.Icon tone="neutral"><MapPin /></Card.Icon>
                  <div className={viewStyles.titleWrap}>
                    <Card.Title>Jenis Pengadaan</Card.Title>
                    <div className={viewStyles.cardSubtitle}>Barang / jasa / konstruksi</div>
                  </div>
                </Card.Header>
                <Card.Body>
                  <PnCategoryDonut data={jenisChartData} getColor={jenisColor} />
                </Card.Body>
              </Card>
              <Card>
                <Card.Header className={viewStyles.cardHeader}>
                  <Card.Icon tone="neutral"><ShieldCheck /></Card.Icon>
                  <div className={viewStyles.titleWrap}>
                    <Card.Title>Status Match SPSE</Card.Title>
                    <div className={viewStyles.cardSubtitle}>Kecocokan ke Paket Penyedia/Swakelola</div>
                  </div>
                </Card.Header>
                <Card.Body>
                  <PnCategoryDonut data={matchChartData} getColor={matchStatusColor} />
                </Card.Body>
              </Card>
            </div>
          </div>

          <div className={styles.filterHead} style={{ marginTop: 8 }}>
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

          <div className={styles.filterRow} style={{ marginBottom: 12 }}>
            <SearchableSelect
              ariaLabel="Filter Satuan Kerja (SPSE)"
              value={satkerFilter ?? ''}
              onChange={(v) => setSatkerFilter(v || null)}
              options={satkerOptions}
              placeholder="Semua Satker (SPSE)"
            />
            <DebouncedSearchInput
              placeholder="Cari nama paket, RO, kode RUP, lokasi..."
              value={search}
              onValueChange={setSearch}
              style={{ flex: 1, minWidth: 220 }}
            />
          </div>

          {showAdvanced && (
            <FilterAdvancedCard>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Skema</span>
                <FilterPillGroup options={skemaOptions} selected={skemaFilter} onChange={setSkemaFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Jenis Pengadaan</span>
                <FilterPillGroup options={jenisOptions} selected={jenisFilter} onChange={setJenisFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Waktu</span>
                <FilterPillGroup options={waktuOptions} selected={waktuFilter} onChange={setWaktuFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Status Match</span>
                <FilterPillGroup options={MATCH_OPTIONS} selected={matchFilter} onChange={setMatchFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Kondisi</span>
                <button
                  type="button"
                  className={styles.advancedToggle}
                  onClick={() => setPerluPerhatianOnly((v) => !v)}
                  style={
                    perluPerhatianOnly
                      ? { backgroundColor: 'color-mix(in srgb, var(--red-600) 12%, transparent)', borderColor: 'var(--red-600)', color: 'var(--red-600)' }
                      : undefined
                  }
                >
                  <AlertTriangle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Hanya Perlu Perhatian
                </button>
              </div>
              {hasActiveExtraFilters && (
                <button
                  type="button"
                  className={styles.resetAllBtn}
                  onClick={() => {
                    setSkemaFilter([]);
                    setJenisFilter([]);
                    setWaktuFilter([]);
                    setMatchFilter([]);
                    setSatkerFilter(null);
                    setPerluPerhatianOnly(false);
                  }}
                >
                  Reset Semua Filter
                </button>
              )}
            </FilterAdvancedCard>
          )}

          <PaketTable
            columns={columns}
            rows={filteredData}
            defaultSortKey="nilai_paket"
            defaultSortDir="desc"
            getRowKey={(p) => p.id}
            emptyMessage="Tidak ada paket yang cocok dengan filter saat ini"
            onRowClick={(p) => {
              setSelectedItem(p);
              setIsModalOpen(true);
            }}
          />
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail Paket Program Prioritas Nasional">
        {selectedItem && (
          <div>
            <h3 className={styles.modalTitle}>{selectedItem.nama_paket || 'Tanpa Nama'}</h3>
            <p className={styles.modalSubLabel}>RO: {selectedItem.nama_ro || '-'}</p>

            <div className={styles.modalGrid}>
              <div>
                <span className={styles.modalFieldLabel}>Kode RUP</span>
                <span className={styles.modalFieldValue}>{selectedItem.kd_rup || '-'}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Nilai Paket</span>
                <span className={styles.modalFieldValueStrong}>{fmtRupiahDetail(selectedItem.nilai_paket)}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Skema</span>
                <span className={styles.modalFieldValue}>{selectedItem.skema || '-'}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Jenis Pengadaan</span>
                <span className={styles.modalFieldValue}>{selectedItem.jenis_pengadaan || '-'}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Lokasi</span>
                <span className={styles.modalFieldValue}>{selectedItem.lokasi || '-'}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Waktu Pengadaan</span>
                <span className={styles.modalFieldValue}>{selectedItem.waktu_pengadaan || '-'}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Realisasi</span>
                <span className={styles.modalFieldValue}>{selectedItem.realisasi || '-'}</span>
              </div>
              <div>
                <span className={styles.modalFieldLabel}>Status Match</span>
                <span className={styles.badgeCell}>
                  <Badge variant={selectedItem.match_status === 'tidak_ditemukan' ? 'tinggi' : 'rendah'}>
                    {MATCH_STATUS_LABEL[selectedItem.match_status]}
                  </Badge>
                </span>
              </div>

              {(selectedItem.kendala || selectedItem.mitigasi) && (
                <>
                  <div className={styles.modalDivider} />
                  <div>
                    <span className={styles.modalFieldLabel}>Kendala</span>
                    <span className={styles.modalFieldValueMuted}>{selectedItem.kendala || '-'}</span>
                  </div>
                  <div>
                    <span className={styles.modalFieldLabel}>Mitigasi</span>
                    <span className={styles.modalFieldValueMuted}>{selectedItem.mitigasi || '-'}</span>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalInfoBox} style={{ marginTop: 16 }}>
              <p className={styles.modalInfoBoxTitle}>Data SPSE Terhubung</p>
              {selectedItem.match_status === 'tidak_ditemukan' ? (
                <p className={styles.modalText}>
                  Kode RUP paket ini belum ditemukan padanannya di data Realisasi Tender/Swakelola SPSE. Kemungkinan kode RUP belum
                  terumumkan, sudah direvisi, atau salah entri pada sumber data master_data_ro.
                </p>
              ) : (
                <div className={styles.modalDateGrid}>
                  <div>
                    <span className={styles.modalFieldLabel}>Satker</span>
                    <span className={styles.modalFieldValue}>{selectedItem.nama_satker || '-'}</span>
                  </div>
                  <div>
                    <span className={styles.modalFieldLabel}>PPK</span>
                    <span className={styles.modalFieldValue}>{selectedItem.nama_ppk || '-'}</span>
                  </div>
                  <div>
                    <span className={styles.modalFieldLabel}>Pagu SPSE</span>
                    <span className={styles.modalFieldValue}>{selectedItem.pagu_spse != null ? fmtRupiahDetail(selectedItem.pagu_spse) : '-'}</span>
                  </div>
                  <div>
                    <span className={styles.modalFieldLabel}>Tahun Anggaran</span>
                    <span className={styles.modalFieldValue}>{selectedItem.tahun_anggaran ?? '-'}</span>
                  </div>
                  <div>
                    <span className={styles.modalFieldLabel}>Status Umumkan RUP</span>
                    <span className={styles.modalFieldValue}>{selectedItem.status_umumkan_rup || '-'}</span>
                  </div>
                  <div>
                    <span className={styles.modalFieldLabel}>Jenis Paket SPSE</span>
                    <span className={styles.modalFieldValue}>
                      {selectedItem.match_status === 'penyedia' ? selectedItem.metode_pengadaan_spse || 'Penyedia' : 'Swakelola'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Laporan Program Prioritas Nasional"
        filename={`Laporan_Program_Prioritas_Nasional_${new Date().toISOString().slice(0, 10)}`}
        columns={exportColumns}
        allData={exportAllData}
        filteredData={exportFilteredData}
      />
    </motion.div>
  );
}
