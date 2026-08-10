"use client";

import React, { useCallback, useEffect, useState, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PaketTable, type PaketColumn } from '@/components/paket/PaketTable';
import { PaketDetailModal } from '@/components/paket/PaketDetailModal';
import { RisikoKategoriDonut } from '@/features/risiko/components/charts/RisikoKategoriDonut';
import { RisikoDriverStackedBarChart, type StackedBucket } from '@/features/risiko/components/charts/RisikoDriverStackedBarChart';
import { SatkerRisikoTinggiChart, type SatkerRisikoBucket } from '@/features/risiko/components/charts/SatkerRisikoTinggiChart';
import { RisikoDetailBody } from '@/features/risiko/components/RisikoDetailBody';
import { riskKategoriColor } from '@/features/risiko/components/charts/riskChartTheme';
import { EXECUTION_STATUS_LABEL, type RiskKategori, type ExecutionStatus } from '@/lib/risiko/types';
import { fmtRupiahDetail, fmtInt, countRup } from '@/lib/format';
import { useRisikoPaketDetail } from '@/hooks/useRisikoPaketDetail';
import styles from './RisikoInsightPanel.module.css';

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

const SATKER_TOP_N = 10;

interface RisikoInsightRow {
  kd_rup: string;
  nama_paket: string | null;
  satker: string | null;
  nama_ppk: string | null;
  pagu: number | null;
  total_score: number | null;
  max_score: number;
  kategori: RiskKategori;
  main_risk_driver: string | null;
  execution_status: ExecutionStatus;
  components_json: any[];
}

interface Props {
  satker?: string;
  ppk?: string;
}

export function RisikoInsightPanel({ satker, ppk }: Props) {
  const [data, setData] = useState<RisikoInsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSatkerTinggi, setSelectedSatkerTinggi] = useState<string | null>(null);
  // Klik bar bisa memicu re-agregasi paket-list atas ribuan baris (lihat pelajaran yang sama
  // di RisikoPengadaanView) — startTransition menjaga klik & chart tetap responsif.
  const [isFilteringSatker, startSatkerFilterTransition] = useTransition();
  const paketModal = useRisikoPaketDetail();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedSatkerTinggi(null);

    async function fetchAll() {
      let all: RisikoInsightRow[] = [];
      let offset = 0;
      const limit = 1000;

      while (!cancelled) {
        let q = supabase
          .from('risiko_pengadaan')
          .select('kd_rup, nama_paket, satker, nama_ppk, pagu, total_score, max_score, kategori, main_risk_driver, execution_status, components_json')
          .range(offset, offset + limit - 1);

        if (satker) q = q.eq('satker', satker);
        if (ppk) q = q.eq('nama_ppk', ppk);

        const { data, error } = await q;
        if (error) {
          console.error(error);
          break;
        }
        if (!data || data.length === 0) break;

        all = all.concat(data as RisikoInsightRow[]);
        if (data.length < limit) break;
        offset += limit;
      }

      if (!cancelled) {
        setData(all);
        setLoading(false);
      }
    }

    fetchAll();

    return () => { cancelled = true; };
  }, [satker, ppk]);

  // Risk Driver Stacked (Bar) berdasarkan Skor Spesifik (1-3)
  const distRiskDriverStacked = useMemo(() => {
    const map = new Map<string, StackedBucket>();
    const allLabels = new Set<string>();
    
    for (const row of data) {
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

    for (const row of data) {
      const c = 1;
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

    // Sort by highest risk score first, take top 5
    return Array.from(map.values()).sort((a, b) => {
      if (b.counts['3'] !== a.counts['3']) return b.counts['3'] - a.counts['3'];
      if (b.counts['2'] !== a.counts['2']) return b.counts['2'] - a.counts['2'];
      return a.label.localeCompare(b.label);
    }).slice(0, 5);
  }, [data]);

  // Ranking satker berdasarkan jumlah paket berkategori TINGGI — sumber untuk chart baru.
  const satkerTinggiRows = useMemo(() => data.filter((r) => r.kategori === 'TINGGI'), [data]);

  const satkerTinggiRanking = useMemo<SatkerRisikoBucket[]>(() => {
    const map = new Map<string, SatkerRisikoBucket>();
    for (const row of satkerTinggiRows) {
      const label = row.satker && row.satker.trim() ? row.satker : 'Tidak Diketahui';
      let bucket = map.get(label);
      if (!bucket) {
        bucket = { satker: label, count: 0, pagu: 0 };
        map.set(label, bucket);
      }
      bucket.count += countRup(row.kd_rup);
      bucket.pagu += row.pagu || 0;
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, SATKER_TOP_N);
  }, [satkerTinggiRows]);

  const paketForSelectedSatker = useMemo(() => {
    if (!selectedSatkerTinggi) return [];
    return satkerTinggiRows.filter((r) => (r.satker && r.satker.trim() ? r.satker : 'Tidak Diketahui') === selectedSatkerTinggi);
  }, [satkerTinggiRows, selectedSatkerTinggi]);

  const handleSatkerClick = useCallback((label: string) => {
    startSatkerFilterTransition(() => {
      setSelectedSatkerTinggi((prev) => (prev === label ? null : label));
    });
  }, []);

  const paketColumns: PaketColumn<RisikoInsightRow>[] = useMemo(
    () => [
      {
        key: 'nama',
        label: 'Nama Paket',
        render: (p) => (
          <div className={styles.nameCell}>
            <span className={styles.nameText} title={p.nama_paket || undefined}>{p.nama_paket || 'Tanpa Nama'}</span>
            <span className={styles.rupCode}>RUP: {p.kd_rup}</span>
          </div>
        ),
      },
      { key: 'ppk', label: 'PPK', render: (p) => <span>{p.nama_ppk || '-'}</span> },
      {
        key: 'pagu',
        label: 'Pagu',
        align: 'right',
        sortAccessor: (p) => p.pagu || 0,
        render: (p) => <span>{p.pagu != null ? fmtRupiahDetail(p.pagu) : '-'}</span>,
      },
      {
        key: 'total_score',
        label: 'Skor',
        align: 'right',
        sortAccessor: (p) => p.total_score ?? -1,
        render: (p) => <span>{p.total_score != null ? `${p.total_score} / ${p.max_score}` : '-'}</span>,
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
    ],
    []
  );

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div className={styles.left}>
           <h4 className={styles.chartTitle}>Distribusi Kategori Risiko</h4>
           {loading ? (
             <div className={styles.loading}><Loader2 className={styles.spin} /> Memuat...</div>
           ) : (
             <div className={styles.donutWrap}>
               <RisikoKategoriDonut rows={data} />
             </div>
           )}
        </div>
        <div className={styles.right}>
           <h4 className={styles.chartTitle}>Top 5 Sebaran Risiko</h4>
           {loading ? (
             <div className={styles.loading}><Loader2 className={styles.spin} /> Memuat...</div>
           ) : (
             <div className={styles.barWrap}>
               <RisikoDriverStackedBarChart
                 data={distRiskDriverStacked}
                 maxBars={5}
                 segmentKeys={SCORE_KEYS}
                 segmentLabels={SCORE_LABELS}
                 segmentColors={SCORE_COLORS}
               />
             </div>
           )}
        </div>
      </div>

      <div className={styles.satkerSection}>
        <div className={styles.satkerHeader}>
          <h4 className={styles.chartTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} style={{ color: 'var(--red-600, #dc2626)', flexShrink: 0 }} />
            Satuan Kerja dengan Risiko Tinggi
          </h4>
          {selectedSatkerTinggi && (
            <button type="button" className={styles.resetBtn} onClick={() => startSatkerFilterTransition(() => setSelectedSatkerTinggi(null))}>
              <X size={12} /> {selectedSatkerTinggi}
            </button>
          )}
        </div>
        <p className={styles.hintText}>
          Setiap bar menunjukkan jumlah paket berkategori risiko <strong>Tinggi</strong> per satuan kerja (Top {SATKER_TOP_N}). Arahkan kursor untuk detail, klik bar untuk melihat daftar paketnya.
        </p>
        {loading ? (
          <div className={styles.loading}><Loader2 className={styles.spin} /> Memuat...</div>
        ) : (
          <SatkerRisikoTinggiChart
            data={satkerTinggiRanking}
            selectedSatker={selectedSatkerTinggi}
            onClick={handleSatkerClick}
          />
        )}

        <AnimatePresence>
          {selectedSatkerTinggi && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className={styles.paketListSection}>
                <div className={styles.paketListHeader}>
                  <span>
                    Paket risiko tinggi — <strong>{selectedSatkerTinggi}</strong>
                    {isFilteringSatker && <span className={styles.updatingHint}> · memperbarui…</span>}
                  </span>
                  <span className={styles.paketListCount}>{fmtInt(paketForSelectedSatker.reduce((s, r) => s + countRup(r.kd_rup), 0))} paket</span>
                </div>
                <PaketTable
                  columns={paketColumns}
                  rows={paketForSelectedSatker}
                  defaultSortKey="pagu"
                  defaultSortDir="desc"
                  pageSize={10}
                  getRowKey={(p, i) => p.kd_rup || i}
                  emptyMessage="Tidak ada paket untuk satuan kerja ini"
                  onRowClick={(p) => paketModal.open(p.kd_rup)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaketDetailModal
        isOpen={paketModal.isOpen}
        onClose={paketModal.close}
        title="Detail Risiko Paket"
        historyData={paketModal.historyData}
        loadingHistory={paketModal.loadingHistory}
      >
        {paketModal.loadingDetail && <p>Memuat detail...</p>}
        {!paketModal.loadingDetail && paketModal.selectedDetail && <RisikoDetailBody detail={paketModal.selectedDetail} />}
      </PaketDetailModal>
    </div>
  );
}
