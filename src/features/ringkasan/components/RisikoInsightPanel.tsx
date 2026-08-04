"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { RisikoKategoriDonut } from '@/features/risiko/components/charts/RisikoKategoriDonut';
import { RisikoDriverStackedBarChart, type StackedBucket } from '@/features/risiko/components/charts/RisikoDriverStackedBarChart';
import type { RiskKategori } from '@/lib/risiko/types';
import { riskKategoriColor } from '@/features/risiko/components/charts/riskChartTheme';
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

interface Props {
  satker?: string;
  ppk?: string;
}

export function RisikoInsightPanel({ satker, ppk }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      let all: any[] = [];
      let offset = 0;
      const limit = 1000;
      
      while (!cancelled) {
        let q = supabase
          .from('risiko_pengadaan')
          .select('kd_rup, pagu, kategori, main_risk_driver, components_json')
          .range(offset, offset + limit - 1);
          
        if (satker) q = q.eq('satker', satker);
        if (ppk) q = q.eq('nama_ppk', ppk);

        const { data, error } = await q;
        if (error) {
          console.error(error);
          break;
        }
        if (!data || data.length === 0) break;
        
        all = all.concat(data);
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
           <h4 className={styles.chartTitle}>Top 5 Pemicu Risiko Utama</h4>
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
    </div>
  );
}
