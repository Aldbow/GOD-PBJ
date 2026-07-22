"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CalendarDays, Clock3, Landmark } from 'lucide-react';
import { StatCard, type StatTone } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { computeItkpA, type ItkpAInput, type ItkpAResult } from '@/lib/itkp/calcA';
import { computeItkpBCD } from '@/lib/itkp/calcBCD';
import { getDummyBCDForUnit } from '@/lib/itkp/dummyBCD';
import { fetchItkpAData, type ItkpAUnit } from '@/lib/itkp/fetchA';
import { fmtDec } from '@/lib/format';
import styles from './ItkpDashboard.module.css';

const KEMENTERIAN_LABEL = 'Kementerian (Total)';
const TAHUN = 2026;

function predikat(pct: number): { label: string; tone: StatTone } {
  if (pct >= 80) return { label: 'Sangat Baik', tone: 'good' };
  if (pct >= 65) return { label: 'Baik', tone: 'good' };
  if (pct >= 50) return { label: 'Cukup Baik', tone: 'warn' };
  return { label: 'Kurang', tone: 'danger' };
}

function scoreHint(value: number, max: number) {
  const p = predikat((value / max) * 100);
  return <Badge variant={p.tone === 'good' ? 'rendah' : p.tone === 'warn' ? 'sedang' : 'tinggi'}>{p.label}</Badge>;
}

interface BCDSummary {
  nilaiB: number;
  nilaiC: number;
  nilaiD: number;
  total: number;
}

export function ItkpDashboard() {
  const [units, setUnits] = useState<ItkpAUnit[]>([]);
  const [kementerian, setKementerian] = useState<ItkpAInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchItkpAData();
      setUnits(result.units);
      setKementerian(result.kementerian);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data ITKP dari Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unitOptions = useMemo(() => units.map((u) => u.name), [units]);

  const currentAInput = useMemo<ItkpAInput | null>(() => {
    if (!selectedUnit) return kementerian;
    return units.find((u) => u.name === selectedUnit)?.input ?? kementerian;
  }, [selectedUnit, units, kementerian]);

  const resultA: ItkpAResult | null = useMemo(
    () => (currentAInput ? computeItkpA(currentAInput) : null),
    [currentAInput]
  );

  const resultBCD: BCDSummary = useMemo(() => {
    if (selectedUnit) {
      const full = computeItkpBCD(getDummyBCDForUnit(selectedUnit));
      return { nilaiB: full.nilaiB, nilaiC: full.nilaiC, nilaiD: full.nilaiD, total: full.total };
    }
    if (units.length === 0) return { nilaiB: 0, nilaiC: 0, nilaiD: 0, total: 0 };
    const perUnit = units.map((u) => computeItkpBCD(getDummyBCDForUnit(u.name)));
    const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
    const nilaiB = avg(perUnit.map((r) => r.nilaiB));
    const nilaiC = avg(perUnit.map((r) => r.nilaiC));
    const nilaiD = avg(perUnit.map((r) => r.nilaiD));
    return { nilaiB, nilaiC, nilaiD, total: Math.round((nilaiB + nilaiC + nilaiD) * 10) / 10 };
  }, [selectedUnit, units]);

  const totalA = resultA?.total ?? 0;
  const totalItkp = totalA + resultBCD.total;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Landmark size={22} />
          </div>
          <div>
            <h2 className={styles.headerTitle}>Dashboard Penilaian ITKP</h2>
            <p className={styles.headerSub}>Kementerian Ketenagakerjaan</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerMeta}>
            <CalendarDays size={14} />
            <span>Tahun {TAHUN}</span>
          </div>
          <div className={styles.headerMeta}>
            <Clock3 size={14} />
            <span>
              {lastUpdate
                ? `Last update ${lastUpdate.toLocaleDateString('id-ID')} ${lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                : 'Memuat...'}
            </span>
          </div>
          <button type="button" className={styles.refreshBtn} onClick={load} disabled={loading} aria-label="Muat ulang data">
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {error && <ErrorBox className={styles.sectionSpacer}>{error}</ErrorBox>}

      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Tampilkan untuk:</span>
        <SearchableSelect
          value={selectedUnit}
          onChange={setSelectedUnit}
          options={unitOptions}
          placeholder={KEMENTERIAN_LABEL}
          ariaLabel="Pilih satker"
          className={styles.filterSelect}
        />
      </div>

      <div className={styles.summaryGrid}>
        <StatCard
          glow
          label={`Nilai Total ITKP${selectedUnit ? ` — ${selectedUnit}` : ''}`}
          value={fmtDec(totalItkp, 1)}
          unit="/ 100"
          tone={predikat((totalItkp / 100) * 100).tone}
          hint={scoreHint(totalItkp, 100)}
        />
        <StatCard
          glow
          href={`/itkp/pemanfaatan-sistem${selectedUnit ? `?satker=${encodeURIComponent(selectedUnit)}` : ''}`}
          label="A. Pemanfaatan Sistem"
          value={fmtDec(totalA, 1)}
          unit="/ 30"
          tone={predikat((totalA / 30) * 100).tone}
          hint={scoreHint(totalA, 30)}
        />
        <StatCard
          glow
          label="B. Kualifikasi & Kompetensi SDM PBJ"
          value={fmtDec(resultBCD.nilaiB, 1)}
          unit="/ 30"
          tone={predikat((resultBCD.nilaiB / 30) * 100).tone}
          hint={scoreHint(resultBCD.nilaiB, 30)}
        />
        <StatCard
          glow
          label="C. Tingkat Kematangan UKPBJ"
          value={fmtDec(resultBCD.nilaiC, 1)}
          unit="/ 30"
          tone={predikat((resultBCD.nilaiC / 30) * 100).tone}
          hint={scoreHint(resultBCD.nilaiC, 30)}
        />
        <StatCard
          glow
          label="D. Integritas Pengadaan"
          value={fmtDec(resultBCD.nilaiD, 1)}
          unit="/ 10"
          tone={predikat((resultBCD.nilaiD / 10) * 100).tone}
          hint={scoreHint(resultBCD.nilaiD, 10)}
        />
      </div>
    </motion.div>
  );
}
