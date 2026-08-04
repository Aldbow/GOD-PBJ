"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Clock, RefreshCw, Wallet, Package, PieChart, Users, Layers, GitBranch, Building, Banknote, Tag, LayoutGrid, Info, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmtRupiahDetail, countRup } from '@/lib/format';
import { fetchRupHistory, type RupHistoryEntry } from '@/lib/paket/rupHistory';
import { useOrgFilters } from '@/hooks/useOrgFilters';
import { OrgFilterBar } from '@/components/paket/OrgFilterBar';
import { FilterPillGroup } from '@/components/paket/FilterPillGroup';
import { MetricGrid, type MetricCardDef } from '@/components/paket/SummaryCards';
import { PaketTable, type PaketColumn } from '@/components/paket/PaketTable';
import { PaketDetailModal } from '@/components/paket/PaketDetailModal';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
import { useSession } from '@/components/auth/SessionProvider';

import { kategoriVariant } from '@/lib/risiko/badge';
import { totalPaket as sumTotalPaket, groupBy } from '@/lib/risiko/aggregate';
import {
  RISK_KATEGORI_LABEL,
  EXECUTION_STATUS_LABEL,
  type RiskRow,
  type RiskDetail,
  type RiskKategori,
  type JenisPaket,
} from '@/lib/risiko/types';
import { RisikoDetailBody } from './RisikoDetailBody';
import { RisikoKategoriDonut } from './charts/RisikoKategoriDonut';
import { RisikoDistribusiBarChart } from './charts/RisikoDistribusiBarChart';
import { RisikoDriverStackedBarChart, type StackedBucket } from './charts/RisikoDriverStackedBarChart';
import { riskKategoriColor, riskBarColor } from './charts/riskChartTheme';
import { PedomanRisikoCard } from './PedomanRisikoCard';

const SCORE_KEYS = ['3', '2', '1', '0', 'NULL'];
const SCORE_LABELS: Record<string, string> = {
  '3': 'Skor 3',
  '2': 'Skor 2',
  '1': 'Skor 1',
  '0': 'Skor 0',
  'NULL': 'Data Tidak Lengkap',
};
const SCORE_COLORS = (key: string, isDark: boolean) => {
  if (key === '3') return riskKategoriColor('TINGGI', isDark);
  if (key === '2') return riskKategoriColor('SEDANG', isDark);
  if (key === '1') return riskKategoriColor('RENDAH', isDark);
  if (key === '0') return isDark ? '#334155' : '#e2e8f0';
  return riskKategoriColor('DATA_TIDAK_LENGKAP', isDark);
};
import styles from '@/components/paket/paketView.module.css';
import distStyles from './RisikoDistribusi.module.css';

const KATEGORI_OPTIONS = (Object.keys(RISK_KATEGORI_LABEL) as RiskKategori[]).map((value) => ({
  value,
  label: RISK_KATEGORI_LABEL[value],
}));

const JENIS_PAKET_OPTIONS: { value: JenisPaket; label: string }[] = [
  { value: 'Penyedia', label: 'Penyedia' },
  { value: 'Swakelola', label: 'Swakelola' },
];

type DonutJenisFilter = 'ALL' | JenisPaket;
const DONUT_JENIS_OPTIONS: { value: DonutJenisFilter; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'Penyedia', label: 'Penyedia' },
  { value: 'Swakelola', label: 'Swakelola' },
];

const STATUS_PELAKSANAAN_OPTIONS = Object.entries(EXECUTION_STATUS_LABEL).map(([value, label]) => ({ value, label }));

// Kolom JSONB (components_json dst.) di-select terpisah dari kolom listing supaya baris di tabel
// utama ringan; kolom penuh (termasuk JSONB) diambil saat baris diklik untuk detail modal.
const LIST_COLUMNS =
  'kd_rup,jenis_paket,nama_paket,satker,eselon1,nama_ppk,tahun_anggaran,pagu,metode_pengadaan,jenis_pengadaan,sumber_dana,tipe_swakelola,total_score,max_score,kategori,main_risk_driver,execution_status,execution_evidence_source,execution_evidence_date,jumlah_revisi,data_quality_flags,calculated_at,rules_version,components_json';

function mapRow(raw: any): RiskRow {
  return {
    kd_rup: String(raw.kd_rup),
    nama_paket: raw.nama_paket,
    jenis_paket: raw.jenis_paket,
    satker: raw.satker,
    eselon1: raw.eselon1,
    nama_ppk: raw.nama_ppk,
    tahun_anggaran: raw.tahun_anggaran,
    pagu: raw.pagu != null ? Number(raw.pagu) : null,
    metode_pengadaan: raw.metode_pengadaan,
    jenis_pengadaan: raw.jenis_pengadaan,
    sumber_dana: raw.sumber_dana,
    tipe_swakelola: raw.tipe_swakelola,
    total_score: raw.total_score != null ? Number(raw.total_score) : null,
    max_score: Number(raw.max_score) || 0,
    kategori: raw.kategori,
    main_risk_driver: raw.main_risk_driver,
    execution_status: raw.execution_status,
    execution_evidence_source: raw.execution_evidence_source,
    execution_evidence_date: raw.execution_evidence_date,
    jumlah_revisi: raw.jumlah_revisi,
    data_quality_flags: raw.data_quality_flags || [],
    calculated_at: raw.calculated_at,
    rules_version: raw.rules_version,
    components_json: raw.components_json,
  };
}

export function RisikoPengadaanView() {
  const [data, setData] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { eselon1, satker, ppk, search, setEselon1, setSatker, setPpk, setSearch } = useOrgFilters();
  const { role } = useSession();

  const [kategoriFilter, setKategoriFilter] = useState<string[]>([]);
  const [jenisPaketFilter, setJenisPaketFilter] = useState<string[]>([]);
  const [statusPelaksanaanFilter, setStatusPelaksanaanFilter] = useState<string[]>([]);
  const [mainRiskDriverFilter, setMainRiskDriverFilter] = useState<{ label: string; members: string[]; score: string | null } | null>(null);
  // Klik bar driver bisa memicu filter ke bucket besar (mis. "Risiko Sisa Waktu Pemilihan"
  // yang jadi driver mayoritas paket) — re-agregasi (8x groupBy + sort tabel) atas ribuan
  // baris jadi berat kalau dijalankan sinkron di render yang sama dengan animasi chart.
  // startTransition menandai update ini prioritas rendah supaya browser tetap sempat
  // menggambar animasi Chart.js dulu, alih-alih terblokir oleh recompute tabel.
  const [isFilteringDriver, startDriverFilterTransition] = useTransition();
  // donutJenisFilter state removed in favor of global jenisPaketFilter
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPedoman, setShowPedoman] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<RiskRow | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<RiskDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<RupHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let allData: RiskRow[] = [];
      let offset = 0;
      const limit = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('risiko_pengadaan')
          .select(LIST_COLUMNS)
          .range(offset, offset + limit - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data.map(mapRow)];
        if (data.length < limit) break;
        offset += limit;
      }
      setData(allData);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Gagal memuat data dari Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [recalculating, setRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState<{ jenis: string; processed: number; total: number } | null>(null);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  const runRecalculateEndpoint = useCallback(async (path: string, jenis: string) => {
    let offset = 0;
    let processedSoFar = 0;
    let total = 0;
    while (true) {
      const res = await fetch(`${path}?offset=${offset}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Gagal menghitung ulang risiko ${jenis}.`);
      processedSoFar += json.processed || 0;
      total = json.total ?? total;
      setRecalcProgress({ jenis, processed: processedSoFar, total });
      if (!json.nextOffset) break;
      offset = json.nextOffset;
    }
  }, []);

  const runRecalculate = useCallback(async () => {
    setRecalculating(true);
    setRecalcError(null);
    setRecalcProgress(null);
    try {
      await runRecalculateEndpoint('/api/risiko/recalculate/penyedia', 'Penyedia');
      await runRecalculateEndpoint('/api/risiko/recalculate/swakelola', 'Swakelola');
      await loadData();
    } catch (e: any) {
      console.error(e);
      setRecalcError(e.message || 'Gagal menghitung ulang risiko.');
    } finally {
      setRecalculating(false);
    }
  }, [loadData, runRecalculateEndpoint]);

  const latestCalculatedAt = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((latest, r) => (r.calculated_at > latest ? r.calculated_at : latest), data[0].calculated_at);
  }, [data]);

  // Detail lengkap (termasuk kolom JSONB rincian komponen) diambil per-baris saat modal dibuka,
  // agar query listing utama tetap ringan.
  useEffect(() => {
    if (!isModalOpen || !selectedItem) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    supabase
      .from('risiko_pengadaan')
      .select('*')
      .eq('kd_rup', selectedItem.kd_rup)
      .maybeSingle()
      .then(({ data: raw, error }: { data: any; error: any }) => {
        if (cancelled) return;
        if (error || !raw) {
          setSelectedDetail(null);
        } else {
          setSelectedDetail({
            ...mapRow(raw),
            components: raw.components_json || [],
            revision_chain: raw.revision_chain_json || [],
            transaction_refs: raw.transaction_refs_json || [],
          });
        }
        setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, selectedItem]);

  useEffect(() => {
    if (!isModalOpen || !selectedItem?.kd_rup) {
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

  const baseData = useMemo(() => {
    let d = data;
    if (eselon1) d = d.filter((item) => (item.eselon1 || 'Tidak Diketahui') === eselon1);
    if (satker) d = d.filter((item) => (item.satker || 'Tidak Diketahui') === satker);
    if (ppk) d = d.filter((item) => (item.nama_ppk || 'Tidak Diketahui') === ppk);
    if (kategoriFilter.length > 0) d = d.filter((item) => kategoriFilter.includes(item.kategori));
    if (jenisPaketFilter.length > 0) d = d.filter((item) => jenisPaketFilter.includes(item.jenis_paket));
    if (statusPelaksanaanFilter.length > 0) d = d.filter((item) => statusPelaksanaanFilter.includes(item.execution_status));
    if (mainRiskDriverFilter) {
      d = d.filter((item) => {
        let hasMatch = false;
        
        if (item.components_json) {
          for (const memberLabel of mainRiskDriverFilter.members) {
            const comp = item.components_json.find((c: any) => c.label === memberLabel);
            let scoreStr = 'NULL';
            if (comp && comp.score != null) {
              scoreStr = comp.score.toString();
            }
            if (!mainRiskDriverFilter.score || scoreStr === mainRiskDriverFilter.score) {
              hasMatch = true;
              break;
            }
          }
        } else {
           if (!mainRiskDriverFilter.score || '0' === mainRiskDriverFilter.score) {
             hasMatch = true;
           }
        }
        
        return hasMatch;
      });
    }
    return d;
  }, [data, eselon1, satker, ppk, kategoriFilter, jenisPaketFilter, statusPelaksanaanFilter, mainRiskDriverFilter]);

  const handleRiskDriverClick = useCallback((label: string, members: string[], segmentKey?: string) => {
    startDriverFilterTransition(() => {
      setMainRiskDriverFilter((prev) => {
        if (!prev) {
          return { label, members, score: segmentKey || null };
        }
        if (prev.label === label) {
          if (segmentKey && prev.score !== segmentKey) {
            return { ...prev, score: segmentKey };
          }
          return null;
        }
        return { label, members, score: segmentKey || null };
      });
    });
  }, []);

  const filteredData = useMemo(() => {
    let d = baseData;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(
        (p) =>
          (p.nama_paket && p.nama_paket.toLowerCase().includes(q)) ||
          (p.kd_rup && p.kd_rup.toLowerCase().includes(q)) ||
          (p.satker && p.satker.toLowerCase().includes(q)) ||
          (p.nama_ppk && p.nama_ppk.toLowerCase().includes(q))
      );
    }
    return d;
  }, [baseData, search]);

  const hasActiveExtraFilters = kategoriFilter.length > 0 || jenisPaketFilter.length > 0 || statusPelaksanaanFilter.length > 0;

  // Sinkronisasi penuh dengan filter global
  const donutRows = filteredData;

  const totalPaket = useMemo(() => sumTotalPaket(filteredData), [filteredData]);
  const kategoriCounts = useMemo(() => {
    const counts: Record<RiskKategori, number> = { RENDAH: 0, SEDANG: 0, TINGGI: 0, DATA_TIDAK_LENGKAP: 0 };
    for (const row of filteredData) counts[row.kategori] += countRup(row.kd_rup);
    return counts;
  }, [filteredData]);
  const belumDilaksanakanCount = useMemo(
    () => filteredData.filter((r) => r.execution_status === 'BELUM_DILAKSANAKAN').reduce((s, r) => s + countRup(r.kd_rup), 0),
    [filteredData]
  );
  const revisiBerulangCount = useMemo(
    () => filteredData.filter((r) => (r.jumlah_revisi || 0) > 2).reduce((s, r) => s + countRup(r.kd_rup), 0),
    [filteredData]
  );
  const totalPaguTinggi = useMemo(
    () => filteredData.filter((r) => r.kategori === 'TINGGI').reduce((s, r) => s + (r.pagu || 0), 0),
    [filteredData]
  );

  // Distribusi per dimensi untuk section chart — dihitung dari filteredData (ikut filter aktif)
  // memakai groupBy() murni yang sama untuk semua dimensi (lihat src/lib/risiko/aggregate.ts).
  const distJenisPaket = useMemo(() => groupBy(filteredData, (r) => r.jenis_paket), [filteredData]);
  const distSatker = useMemo(() => groupBy(filteredData, (r) => r.satker), [filteredData]);
  const distEselon1 = useMemo(() => groupBy(filteredData, (r) => r.eselon1), [filteredData]);
  const distPpk = useMemo(() => groupBy(filteredData, (r) => r.nama_ppk), [filteredData]);
  const distMetode = useMemo(() => groupBy(filteredData.filter((r) => r.jenis_paket === 'Penyedia'), (r) => r.metode_pengadaan), [filteredData]);
  const distJenisPengadaan = useMemo(() => groupBy(filteredData.filter((r) => r.jenis_paket === 'Penyedia'), (r) => r.jenis_pengadaan), [filteredData]);
  const distSumberDana = useMemo(() => groupBy(filteredData.filter((r) => r.jenis_paket === 'Penyedia'), (r) => r.sumber_dana), [filteredData]);
  const distTipeSwakelola = useMemo(() => groupBy(filteredData.filter((r) => r.jenis_paket === 'Swakelola'), (r) => r.tipe_swakelola), [filteredData]);

  // Aggregation bertumpuk (stacked) untuk Pemicu Risiko berdasarkan Skor Spesifik (1-3)
  // Agregasi sebaran risiko komponen
  const distRiskDriverStacked = useMemo(() => {
    const map = new Map<string, StackedBucket>();
    const allLabels = new Set<string>();
    
    for (const row of filteredData) {
      if (row.components_json) {
        for (const comp of row.components_json) {
          if (comp.applicable !== false) {
            allLabels.add(comp.label);
          }
        }
      }
    }

    for (const label of allLabels) {
      map.set(label, { label, totalCount: 0, counts: { '3': 0, '2': 0, '1': 0, '0': 0, 'NULL': 0 } });
    }

    for (const row of filteredData) {
      const c = countRup(row.kd_rup);
      const seen = new Set<string>();
      
      if (row.components_json) {
        for (const comp of row.components_json) {
          seen.add(comp.label);
          const bucket = map.get(comp.label);
          if (bucket) {
            bucket.totalCount += c;
            let scoreStr = 'NULL';
            if (comp.score != null) {
              scoreStr = comp.score.toString();
            }
            if (bucket.counts[scoreStr] !== undefined) {
              bucket.counts[scoreStr] += c;
            } else {
              bucket.counts['NULL'] += c;
            }
          }
        }
      }
      
      for (const label of allLabels) {
        if (!seen.has(label)) {
          const bucket = map.get(label);
          if (bucket) {
            bucket.totalCount += c;
            bucket.counts['0'] += c;
          }
        }
      }
    }
    
    return Array.from(map.values()).sort((a, b) => {
      if (b.counts['3'] !== a.counts['3']) return b.counts['3'] - a.counts['3'];
      if (b.counts['2'] !== a.counts['2']) return b.counts['2'] - a.counts['2'];
      return a.label.localeCompare(b.label);
    });
  }, [filteredData]);

  const columns: PaketColumn<RiskRow>[] = useMemo(
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
      { key: 'jenis', label: 'Jenis', render: (p) => <span className={styles.mutedCell}>{p.jenis_paket}</span> },
      { key: 'satker', label: 'Satker', render: (p) => <span className={styles.satkerCell}>{p.satker || '-'}</span> },
      { key: 'ppk', label: 'PPK', render: (p) => <span className={styles.mutedCell}>{p.nama_ppk || '-'}</span> },
      {
        key: 'pagu',
        label: 'Pagu',
        align: 'right',
        sortAccessor: (p) => p.pagu || 0,
        render: (p) => <span className={styles.monoCell}>{p.pagu != null ? fmtRupiahDetail(p.pagu) : '-'}</span>,
      },
      {
        key: 'status_pelaksanaan',
        label: 'Status Pelaksanaan',
        align: 'center',
        render: (p) => (
          <Badge variant={p.execution_status === 'SUDAH_DILAKSANAKAN' ? 'rendah' : p.execution_status === 'BELUM_DILAKSANAKAN' ? 'sedang' : 'default'}>
            {EXECUTION_STATUS_LABEL[p.execution_status]}
          </Badge>
        ),
      },
      {
        key: 'total_score',
        label: 'Skor',
        align: 'right',
        sortAccessor: (p) => p.total_score ?? -1,
        render: (p) => <span className={styles.monoCell}>{p.total_score != null ? `${p.total_score} / ${p.max_score}` : '-'}</span>,
      },
      {
        key: 'kategori',
        label: 'Kategori',
        align: 'center',
        render: (p) => <Badge variant={kategoriVariant(p.kategori)}>{RISK_KATEGORI_LABEL[p.kategori]}</Badge>,
      },
      {
        key: 'driver',
        label: 'Risk Driver Utama',
        render: (p) => <span className={styles.mutedCell}>{p.main_risk_driver || '-'}</span>,
      },
    ],
    []
  );

  const exportColumns = useMemo(
    () => [
      { key: 'kd_rup', label: 'Kode RUP' },
      { key: 'nama_paket', label: 'Nama Paket', width: 40 },
      { key: 'jenis_paket', label: 'Jenis Paket' },
      { key: 'satker', label: 'Satker' },
      { key: 'nama_ppk', label: 'Nama PPK' },
      { key: 'pagu', label: 'Pagu (Rp)', type: 'currency' },
      { key: 'execution_status', label: 'Status Pelaksanaan' },
      { key: 'total_score', label: 'Skor Total', type: 'number' },
      { key: 'max_score', label: 'Skor Maksimum', type: 'number' },
      { key: 'kategori', label: 'Kategori Risiko' },
      { key: 'main_risk_driver', label: 'Risk Driver Utama' },
      { key: 'jumlah_revisi', label: 'Jumlah Revisi', type: 'number' },
    ],
    []
  );
  const exportAllData = useMemo(() => baseData, [baseData]);
  const exportFilteredData = useMemo(() => filteredData, [filteredData]);

  const kpiCards: MetricCardDef[] = [
    { key: 'rendah', icon: ShieldAlert, label: 'Rendah', value: kategoriCounts.RENDAH, accent: 'teal' },
    { key: 'sedang', icon: ShieldAlert, label: 'Sedang', value: kategoriCounts.SEDANG, accent: 'amber' },
    { key: 'tinggi', icon: ShieldAlert, label: 'Tinggi', value: kategoriCounts.TINGGI, accent: 'indigo' },
    { key: 'tidak_lengkap', icon: ShieldAlert, label: 'Data Tidak Lengkap', value: kategoriCounts.DATA_TIDAK_LENGKAP, accent: 'neutral' },
  ];

  const earlyWarningCards: MetricCardDef[] = [
    { key: 'belum', icon: Clock, label: 'Belum Dilaksanakan', value: belumDilaksanakanCount, accent: 'amber' },
    { key: 'revisi', icon: RefreshCw, label: 'Revisi Berulang (>2x)', value: revisiBerulangCount, accent: 'indigo' },
    { key: 'pagu_tinggi', icon: Wallet, label: 'Pagu pada Kategori Tinggi', value: fmtRupiahDetail(totalPaguTinggi), accent: 'info' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {error && <ErrorBox>{error}. Pastikan migration sql/migrations/64_table_risiko_pengadaan.sql sudah dijalankan di Supabase.</ErrorBox>}
      {recalcError && <ErrorBox>{recalcError}</ErrorBox>}

      <div className={styles.filterHead}>
        <span className={styles.mutedCell}>
          {latestCalculatedAt
            ? `Terakhir dihitung: ${new Date(latestCalculatedAt).toLocaleString('id-ID')}`
            : 'Belum pernah dihitung'}
          {recalculating && recalcProgress && ` — menghitung ${recalcProgress.jenis} ${recalcProgress.processed}/${recalcProgress.total}...`}
        </span>
        <div>
          <button
            type="button"
            className={styles.advancedToggle}
            onClick={() => setShowPedoman(!showPedoman)}
            style={{ 
              backgroundColor: showPedoman ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface)', 
              borderColor: showPedoman ? 'var(--accent)' : 'var(--border)', 
              color: showPedoman ? 'var(--accent)' : 'var(--text-primary)', 
              marginRight: 8 
            }}
          >
            <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Pedoman Penilaian
          </button>
          {role === 'admin' && (
            <button
              type="button"
              className={styles.advancedToggle}
              onClick={runRecalculate}
              disabled={recalculating}
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {recalculating ? 'Menghitung...' : 'Hitung Ulang'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPedoman && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PedomanRisikoCard />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className={styles.loadingText}>Memuat data dari Supabase...</p>
      ) : data.length === 0 ? (
        <div className={styles.modalBox}>
          <p className={styles.modalBoxText}>
            Belum ada data risiko yang dihitung. Klik &quot;Hitung Ulang&quot; di atas untuk menjalankan kalkulasi Paket Penyedia dan
            Swakelola serta mengisi tabel risiko_pengadaan.
          </p>
        </div>
      ) : (
        <>
          {/* Distribusi Risiko — Redesign Total */}
          <div className={distStyles.distribusiSection}>
            <div className={distStyles.sectionLabel}>
              <span className={distStyles.sectionEyebrow}>
                <LayoutGrid size={13} />
                Distribusi Risiko
              </span>
              <span className={distStyles.sectionCaption}>Sebaran kategori risiko dan komponen pemicunya</span>
            </div>

            {/* ─── 3 Kartu Horizontal ─── */}
            <div className={distStyles.splitGrid}>
              {/* Kartu 1: Donut Kategori Risiko */}
              <div className={distStyles.donutCard}>
                <div className={distStyles.cardHeader}>
                  <span className={distStyles.cardIcon}><PieChart size={15} /></span>
                  <div>
                    <div className={distStyles.cardTitle}>Kategori Risiko</div>
                    <div className={distStyles.cardSubtitle}>Per level risiko</div>
                  </div>
                  <div className={distStyles.donutJenisToggle}>
                    {DONUT_JENIS_OPTIONS.map((opt) => {
                      const isActive = opt.value === 'ALL'
                        ? jenisPaketFilter.length === 0
                        : jenisPaketFilter.length === 1 && jenisPaketFilter[0] === opt.value;
                      return (
                      <button
                        key={opt.value}
                        type="button"
                        className={distStyles.donutJenisPill}
                        onClick={() => {
                          if (opt.value === 'ALL') setJenisPaketFilter([]);
                          else setJenisPaketFilter([opt.value]);
                        }}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="donutJenisIndicator"
                            className={distStyles.donutJenisIndicator}
                            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                          />
                        )}
                        <span
                          className={`${distStyles.donutJenisLabel} ${isActive ? distStyles.donutJenisLabelActive : ''}`}
                        >
                          {opt.label}
                        </span>
                      </button>
                    )})}
                  </div>
                </div>
                <RisikoKategoriDonut rows={donutRows} />
              </div>


              {/* Kartu 3: Risk Driver — Vertical Bar */}
              <div className={distStyles.card}>
                <div className={distStyles.cardInner}>
                  <div className={distStyles.cardHeader}>
                    <span className={`${distStyles.cardIcon} ${distStyles.cardIconRed}`}><AlertTriangle size={15} /></span>
                    <div>
                      <div className={distStyles.cardTitle}>Sebaran Risiko</div>
                      <div className={distStyles.cardSubtitle}>Distribusi tingkat risiko per kategori</div>
                    </div>
                    {mainRiskDriverFilter && (
                      <button
                        type="button"
                        onClick={() => startDriverFilterTransition(() => setMainRiskDriverFilter(null))}
                        title={`Reset filter: ${mainRiskDriverFilter.label}${mainRiskDriverFilter.score ? ` › ${SCORE_LABELS[mainRiskDriverFilter.score]}` : ''}`}
                        style={{
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 999,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <X size={12} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {mainRiskDriverFilter.label}
                          {mainRiskDriverFilter.score && ` › ${SCORE_LABELS[mainRiskDriverFilter.score]}`}
                        </span>
                      </button>
                    )}
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: '0 0 12px 0',
                    lineHeight: 1.5,
                    padding: '8px 12px',
                    background: 'var(--surface-raised, var(--surface))',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}>
                    💡 Setiap bar mewakili satu komponen risiko dan menunjukkan distribusi skor risiko untuk seluruh paket.
                    Warna <span style={{ color: 'var(--red-600, #F16026)', fontWeight: 600 }}>merah</span> = Tinggi (3),{' '}
                    <span style={{ color: 'var(--amber-600, #EFA908)', fontWeight: 600 }}>kuning</span> = Sedang (2),{' '}
                    <span style={{ color: 'var(--teal-600, #00B676)', fontWeight: 600 }}>hijau</span> = Rendah (1),{' '}
                    <span style={{ color: 'var(--slate-400, #94a3b8)', fontWeight: 600 }}>abu-abu muda</span> = Nol (0), dan{' '}
                    <span style={{ color: 'var(--slate-600, #475569)', fontWeight: 600 }}>abu-abu gelap</span> = Data Tidak Lengkap.
                    Angka di ujung kanan adalah total paket. <em>Klik pada bar untuk mem-filter tabel berdasarkan komponen risiko terkait; klik segmen warnanya untuk memperdalam filter ke skor tersebut.</em>
                  </p>
                  <div className={distStyles.chartArea}>
                    <RisikoDriverStackedBarChart
                      data={distRiskDriverStacked}
                      maxBars={Math.max(distRiskDriverStacked.length, 1)}
                      onClick={handleRiskDriverClick}
                      segmentKeys={SCORE_KEYS}
                      segmentLabels={SCORE_LABELS}
                      segmentColors={SCORE_COLORS}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.filterHead} style={{ marginTop: 40 }}>
            <span className={styles.filterHeadTitle}>
              Filter
              {isFilteringDriver && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>Memperbarui…</span>
              )}
            </span>
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
            searchPlaceholder="Cari nama paket, kode RUP, PPK..."
          />

          {showAdvanced && (
            <div className={styles.advancedPanel}>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Kategori Risiko</span>
                <FilterPillGroup options={KATEGORI_OPTIONS} selected={kategoriFilter} onChange={setKategoriFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Jenis Paket</span>
                <FilterPillGroup options={JENIS_PAKET_OPTIONS} selected={jenisPaketFilter} onChange={setJenisPaketFilter} />
              </div>
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>Status Pelaksanaan</span>
                <FilterPillGroup options={STATUS_PELAKSANAAN_OPTIONS} selected={statusPelaksanaanFilter} onChange={setStatusPelaksanaanFilter} />
              </div>
              
              {mainRiskDriverFilter && (
                <div className={styles.filterRow}>
                  <span className={styles.filterLabel}>Pemicu Risiko</span>
                  <div className={styles.filterPills}>
                    <button className={`${styles.filterPill} ${styles.active}`} onClick={() => startDriverFilterTransition(() => setMainRiskDriverFilter(null))}>
                      {mainRiskDriverFilter.label} ✕
                    </button>
                    {mainRiskDriverFilter.score && (
                      <button
                        className={`${styles.filterPill} ${styles.active}`}
                        onClick={() => startDriverFilterTransition(() => setMainRiskDriverFilter((prev) => (prev ? { ...prev, score: null } : prev)))}
                      >
                        {SCORE_LABELS[mainRiskDriverFilter.score]} ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(kategoriFilter.length > 0 || jenisPaketFilter.length > 0 || statusPelaksanaanFilter.length > 0 || mainRiskDriverFilter) && (
                <button
                  type="button"
                  className={styles.resetAllBtn}
                  onClick={() => {
                    setKategoriFilter([]);
                    setJenisPaketFilter([]);
                    setStatusPelaksanaanFilter([]);
                    startDriverFilterTransition(() => setMainRiskDriverFilter(null));
                  }}
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          )}

          <PaketTable
            columns={columns}
            rows={filteredData}
            defaultSortKey="total_score"
            defaultSortDir="desc"
            getRowKey={(p, i) => p.kd_rup || i}
            emptyMessage="Tidak ada paket yang cocok dengan filter saat ini"
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
        title="Detail Risiko Paket"
        historyData={historyData}
        loadingHistory={loadingHistory}
      >
        {loadingDetail && <p className={styles.modalText}>Memuat detail...</p>}
        {!loadingDetail && selectedDetail && <RisikoDetailBody detail={selectedDetail} />}
      </PaketDetailModal>

      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Laporan Risiko Pengadaan"
        filename={`Laporan_Risiko_Pengadaan_${new Date().toISOString().slice(0, 10)}`}
        columns={exportColumns}
        allData={exportAllData}
        filteredData={exportFilteredData}
      />
    </motion.div>
  );
}
