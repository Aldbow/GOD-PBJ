"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Info, Gauge, LayoutGrid } from 'lucide-react';
import { computeItkpA, type ItkpAInput } from '@/lib/itkp/calcA';
import { computeItkpBCD } from '@/lib/itkp/calcBCD';
import { getDummyBCDForUnit } from '@/lib/itkp/dummyBCD';
import { fetchItkpAData, type ItkpAUnit } from '@/lib/itkp/fetchA';
import { normSatker } from '@/lib/itkp/crosswalk';
import { predikatOf, nextPredikatLabel } from '@/lib/itkp/itkpModel';
import { fmtDec, fmtPct } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './ItkpGauge.module.css';

// Skala total ITKP = A(30) + B(30) + C(30) + D(10).
const MAX_TOTAL = 100;

// Geometri gauge semi-lingkaran (viewBox 200x110).
const ARC_PATH = 'M 18 100 A 82 82 0 0 1 182 100';
const ARC_LEN = Math.PI * 82;

interface Komponen {
  key: string;
  label: string;
  score: number;
  max: number;
  bobot: number;
  color: string;
}

export function ItkpGauge({ satker }: { satker: string }) {
  const [units, setUnits] = useState<ItkpAUnit[]>([]);
  const [kementerian, setKementerian] = useState<ItkpAInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchItkpAData();
        if (!alive) return;
        setUnits(res.units);
        setKementerian(res.kementerian);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Gagal memuat data ITKP.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const unitByNorm = useMemo(() => {
    const map = new Map<string, ItkpAUnit>();
    for (const u of units) map.set(normSatker(u.name), u);
    return map;
  }, [units]);

  const matchedUnit = satker ? unitByNorm.get(normSatker(satker)) : undefined;
  const input = matchedUnit?.input ?? kementerian;
  const scopeLabel = matchedUnit ? matchedUnit.name : 'Kementerian (Total)';

  const resultA = useMemo(() => (input ? computeItkpA(input) : null), [input]);
  const bcd = useMemo(() => computeItkpBCD(getDummyBCDForUnit(scopeLabel)), [scopeLabel]);

  if (loading) {
    return (
      <div className={styles.card}>
        <Skeleton width="55%" height={16} />
        <Skeleton width={220} height={110} style={{ margin: '18px auto' }} />
        <Skeleton width="100%" height={120} style={{ marginTop: 16 }} />
      </div>
    );
  }

  if (error || !resultA) {
    return <div className={styles.card}><p className={styles.errText}>{error || 'Data ITKP tidak tersedia.'}</p></div>;
  }

  const totalA = resultA.total;
  const totalItkp = totalA + bcd.total;
  
  const isSatker = !!matchedUnit;
  const displayTotal = isSatker ? totalA : totalItkp;
  const displayMax = isSatker ? resultA.totalMaxSaatIni : MAX_TOTAL;
  
  const ratio = displayMax > 0 ? Math.max(0, Math.min(displayTotal / displayMax, 1)) : 0;
  
  // Normalisasi predikat jika khusus satker agar tidak anjlok (karena max 30)
  const normTotal = isSatker ? ratio * 100 : totalItkp;
  const band = predikatOf(normTotal);
  const nextLabel = nextPredikatLabel(band.level);

  const komponen: Komponen[] = isSatker ? [
    { key: 'A', label: 'A. Pemanfaatan Sistem', score: totalA, max: resultA.totalMaxSaatIni, bobot: 100, color: '#1A5D91' }
  ] : [
    { key: 'A', label: 'A. Pemanfaatan Sistem', score: totalA, max: resultA.totalMaxSaatIni, bobot: 30, color: '#1A5D91' },
    { key: 'B', label: 'B. Kompetensi SDM PBJ', score: bcd.nilaiB, max: 30, bobot: 30, color: '#1FA89A' },
    { key: 'C', label: 'C. Kematangan UKPBJ', score: bcd.nilaiC, max: 30, bobot: 30, color: '#5B61D6' },
    { key: 'D', label: 'D. Integritas Pengadaan', score: bcd.nilaiD, max: 10, bobot: 10, color: '#27B6D6' },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{isSatker ? `Skor ITKP Pemanfaatan Sistem Satuan Kerja ${scopeLabel}` : 'Skor ITKP 2026'}</h3>
          {!isSatker && <p className={styles.scope}>{scopeLabel}</p>}
        </div>
        {!isSatker && (
          <span className={styles.catPill} style={{ background: band.color, color: '#fff' }}>
            {band.kode} · {band.label}
          </span>
        )}
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.gaugeWrap}>
          <svg viewBox="0 0 200 110" className={styles.gauge} role="img" aria-label={`Skor total ${fmtDec(displayTotal)} dari ${fmtDec(displayMax)}`}>
            <defs>
              <linearGradient id="itkpGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#163B63" />
                <stop offset="55%" stopColor="#1A5D91" />
                <stop offset="100%" stopColor="#27B6D6" />
              </linearGradient>
            </defs>
            <path d={ARC_PATH} className={styles.gaugeTrack} strokeLinecap="round" />
            <path
              d={ARC_PATH}
              className={styles.gaugeValue}
              strokeLinecap="round"
              style={{ strokeDasharray: ARC_LEN, strokeDashoffset: ARC_LEN * (1 - ratio) }}
            />
          </svg>
          <div className={styles.gaugeCenter}>
            <span className={styles.gaugeScore}>{fmtDec(displayTotal, displayTotal % 1 === 0 ? 0 : 1)}</span>
            <span className={styles.gaugeMax}>/ {fmtDec(displayMax, displayMax % 1 === 0 ? 0 : 1)}</span>
          </div>
        </div>

        <div className={styles.heroMeta}>
          <span className={styles.heroLabel}>{isSatker ? 'Skor Pemanfaatan Sistem' : 'Total Skor ITKP'}</span>
          {!isSatker && (
            <>
              <span className={styles.heroCategory}>{band.kode} · {band.label}</span>
              <span className={styles.heroRange}>Rentang predikat {band.rangeLabel}</span>
            </>
          )}
          <div className={styles.heroDivider} />
          <div className={styles.heroKpi}>
            <span className={styles.heroKpiLabel}>Capaian</span>
            <span className={styles.heroKpiVal}>{fmtPct(ratio * 100)}</span>
          </div>
          {!isSatker && (
            <span className={styles.heroNext}>
              {nextLabel ? `Menuju predikat ${nextLabel}` : 'Predikat tertinggi tercapai'}
            </span>
          )}
        </div>
      </div>

      {/* 4 komponen penilaian */}
      <div className={styles.section}>
        <span className={styles.sectionHead}>
          <LayoutGrid size={13} /> Komponen Penilaian
        </span>
        <div className={styles.compList}>
          {komponen.map((k) => {
            const r = k.max > 0 ? Math.max(0, Math.min(k.score / k.max, 1)) : 0;
            return (
              <div key={k.key} className={styles.compRow}>
                <span className={styles.compLabel} title={k.label}>{k.label}</span>
                <span className={styles.compTrack}>
                  <span className={styles.compFill} style={{ width: `${r * 100}%`, background: k.color }} />
                </span>
                <span className={styles.compScore}>
                  {fmtDec(k.score)}<span className={styles.compMax}>/{k.max}</span>
                </span>
                <span className={styles.compBobot}>{k.bobot}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7 indikator Pemanfaatan Sistem (A1–A7) */}
      <div className={styles.section}>
        <span className={styles.sectionHead}>
          <Gauge size={13} /> Pemanfaatan Sistem (A) — 7 Indikator
        </span>
        <div className={styles.miniList}>
          {resultA.rows.map((row, i) => {
            const r = row.skorMax > 0 && row.applicable ? Math.max(0, Math.min(row.skor / row.skorMax, 1)) : 0;
            return (
              <div key={row.key} className={styles.miniRow}>
                <span className={styles.miniLabel} title={row.label}>
                  <b>A{i + 1}</b> {row.label}
                </span>
                <span className={styles.miniTrack}>
                  <span className={styles.miniFill} style={{ width: `${r * 100}%` }} />
                </span>
                <span className={styles.miniVal}>
                  {row.applicable ? `${fmtDec(row.skor)}/${fmtDec(row.skorMax, row.skorMax % 1 === 0 ? 0 : 1)}` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!matchedUnit && satker && (
        <p className={styles.note}>
          <Info size={12} /> Skor ITKP dihitung per unit penilaian; Satker terpilih tidak terpetakan ke unit ITKP, jadi ditampilkan total Kementerian.
        </p>
      )}
    </div>
  );
}
