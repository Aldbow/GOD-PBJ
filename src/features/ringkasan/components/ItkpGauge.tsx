"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Info, Gauge, LayoutGrid, ArrowRight } from 'lucide-react';
import { computeItkpA, type ItkpAInput } from '@/lib/itkp/calcA';
import { computeItkpBCD } from '@/lib/itkp/calcBCD';
import { getDummyBCDForUnit } from '@/lib/itkp/dummyBCD';
import { fetchItkpAData, partitionGabunganForItkp, type ItkpAUnit } from '@/lib/itkp/fetchA';
import type { GabunganRow } from '../lib/ringkasanData';
import { normSatker } from '@/lib/itkp/crosswalk';
import { predikatOf, nextPredikatLabel } from '@/lib/itkp/itkpModel';
import { fmtDec, fmtPct } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePublishPrintSection } from '../lib/pdf/printSections';
import type { ItkpPrintData } from '../lib/pdf/types';
import { Card } from '@/components/ui/Card';
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

interface ItkpGaugeProps {
  satker: string;
  forceComponentA?: boolean;
  // Baris view_dashboard_gabungan_satker yang sudah di-fetch RingkasanView —
  // dipakai untuk merekonstruksi partisi tender/epurchasing/swakelola supaya
  // fetchItkpAData tidak menghitung ulang view yang sama dua kali dalam satu
  // page load. Kosong sampai RingkasanView selesai memuat rows-nya.
  rows: GabunganRow[];
  // true selama RingkasanView masih memuat rows — dipakai untuk membedakan
  // "belum selesai memuat" dari "sudah selesai tapi datanya memang kosong",
  // supaya kartu ini tidak nyangkut di skeleton selamanya bila dataset kosong.
  rowsLoading: boolean;
}

export function ItkpGauge({ satker, forceComponentA = false, rows, rowsLoading }: ItkpGaugeProps) {
  const [units, setUnits] = useState<ItkpAUnit[]>([]);
  const [kementerian, setKementerian] = useState<ItkpAInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rows.length === 0) {
      // Selesai memuat di RingkasanView tapi datasetnya memang kosong — jangan
      // nyangkut di skeleton menunggu rows yang tidak akan pernah terisi.
      if (!rowsLoading) setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const prefetched = partitionGabunganForItkp(rows);
        const res = await fetchItkpAData(prefetched);
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
  }, [rows, rowsLoading]);

  const unitByNorm = useMemo(() => {
    const map = new Map<string, ItkpAUnit>();
    for (const u of units) map.set(normSatker(u.name), u);
    return map;
  }, [units]);

  const matchedUnit = satker ? unitByNorm.get(normSatker(satker)) : undefined;
  const input = matchedUnit?.input ?? kementerian;
  const scopeLabel = matchedUnit ? matchedUnit.name : 'Kementerian (Total)';
  // Pakai nama unit ITKP yang sudah ter-mapping (bukan `satker` mentah dari
  // Ringkasan) supaya query ?satker= di halaman detail pasti cocok dengan
  // salah satu opsi di sana — kalau tidak ke-mapping, arahkan ke total
  // Kementerian saja (persis seperti yang sedang ditampilkan di kartu ini).
  const detailHref = matchedUnit
    ? `/itkp/pemanfaatan-sistem?satker=${encodeURIComponent(matchedUnit.name)}`
    : '/itkp/pemanfaatan-sistem';

  const resultA = useMemo(() => (input ? computeItkpA(input) : null), [input]);
  const bcd = useMemo(() => computeItkpBCD(getDummyBCDForUnit(scopeLabel)), [scopeLabel]);

  // Seluruh turunan skor dihitung di SATU memo sebelum early-return apa pun.
  // Bukan sekadar rapi: `usePublishPrintSection` di bawah adalah hook, jadi ia
  // wajib dipanggil di setiap render — termasuk saat kartu ini masih skeleton —
  // sehingga angka yang diterbitkannya tidak boleh lahir setelah early-return.
  const view = useMemo(() => {
    if (!resultA) return null;
    const totalA = resultA.total;
    const totalItkp = totalA + bcd.total;

    const isSatker = !!matchedUnit;
    // forceComponentA: dipaksa dari luar (mis. filter PPK aktif) walau ITKP tidak
    // punya granularitas per-PPK — tetap tampilkan Komponen A saja sebagai pendekatan.
    const componentAOnly = isSatker || forceComponentA;
    const displayTotal = componentAOnly ? totalA : totalItkp;
    const displayMax = componentAOnly ? resultA.totalMaxSaatIni : MAX_TOTAL;

    const ratio = displayMax > 0 ? Math.max(0, Math.min(displayTotal / displayMax, 1)) : 0;

    // Normalisasi predikat jika khusus komponen A agar tidak anjlok (karena max 30)
    const normTotal = componentAOnly ? ratio * 100 : totalItkp;
    const band = predikatOf(normTotal);
    const nextLabel = nextPredikatLabel(band.level);

    const komponen: Komponen[] = componentAOnly ? [
      { key: 'A', label: 'A. Pemanfaatan Sistem', score: totalA, max: resultA.totalMaxSaatIni, bobot: 100, color: '#1A5D91' }
    ] : [
      { key: 'A', label: 'A. Pemanfaatan Sistem', score: totalA, max: resultA.totalMaxSaatIni, bobot: 30, color: '#1A5D91' },
      { key: 'B', label: 'B. Kompetensi SDM PBJ', score: bcd.nilaiB, max: 30, bobot: 30, color: '#1FA89A' },
      { key: 'C', label: 'C. Kematangan UKPBJ', score: bcd.nilaiC, max: 30, bobot: 30, color: '#5B61D6' },
      { key: 'D', label: 'D. Integritas Pengadaan', score: bcd.nilaiD, max: 10, bobot: 10, color: '#27B6D6' },
    ];

    return { isSatker, componentAOnly, displayTotal, displayMax, ratio, band, nextLabel, komponen };
  }, [resultA, bcd, matchedUnit, forceComponentA]);

  const judul = view?.isSatker
    ? `Skor ITKP Pemanfaatan Sistem Satuan Kerja ${scopeLabel}`
    : forceComponentA
      ? 'Skor ITKP Pemanfaatan Sistem (Hasil Filter)'
      : 'Skor ITKP 2026';

  // Catatan yang sama dengan yang tampil di kaki kartu — cetakan tidak boleh
  // menyembunyikan alasan skornya dihitung pada lingkup yang berbeda.
  const catatan = !matchedUnit && satker && !forceComponentA
    ? 'Skor ITKP dihitung per unit penilaian; Satker terpilih tidak terpetakan ke unit ITKP, jadi ditampilkan total Kementerian.'
    : !matchedUnit && forceComponentA
      ? 'ITKP dihitung per satuan kerja, bukan per PPK — skor Komponen A berikut adalah pendekatan tingkat Kementerian.'
      : null;

  const printData = useMemo<ItkpPrintData | null>(() => {
    if (!view || !resultA) return null;
    return {
      headline: judul,
      scopeLabel,
      componentAOnly: view.componentAOnly,
      total: view.displayTotal,
      max: view.displayMax,
      ratioPct: view.ratio * 100,
      predikat: view.componentAOnly ? null : `${view.band.kode} · ${view.band.label}`,
      komponen: view.komponen.map((k) => ({ label: k.label, score: k.score, max: k.max, bobot: k.bobot })),
      indikatorA: resultA.rows.map((r) => ({
        label: r.label,
        skor: r.skor,
        skorMax: r.skorMax,
        applicable: r.applicable,
      })),
      note: catatan,
    };
  }, [view, resultA, judul, scopeLabel, catatan]);

  usePublishPrintSection('itkp', printData);

  if (loading) {
    return (
      <Card aria-hidden>
        <Card.Header>
          <Skeleton width={30} height={30} />
          <Skeleton width="55%" height={16} />
        </Card.Header>
        <Card.Body>
          <Skeleton width={220} height={110} style={{ margin: '18px auto' }} />
          <Skeleton width="100%" height={120} style={{ marginTop: 16 }} />
        </Card.Body>
      </Card>
    );
  }

  if (error || !resultA || !view) {
    return (
      <Card>
        <Card.Header>
          <Card.Icon tone="neutral"><Gauge /></Card.Icon>
          <Card.Title>{judul}</Card.Title>
        </Card.Header>
        <Card.Body className={styles.errBody}>{error || 'Data ITKP tidak tersedia.'}</Card.Body>
      </Card>
    );
  }

  const { componentAOnly, displayTotal, displayMax, ratio, band, nextLabel, komponen } = view;

  return (
    <Card className={componentAOnly ? styles.cardComponentAOnly : undefined}>
      <Card.Header className={styles.head}>
        <Card.Icon tone="neutral"><Gauge /></Card.Icon>
        <div className={styles.titleWrap}>
          <Card.Title>{judul}</Card.Title>
          {!componentAOnly && <p className={styles.scope}>{scopeLabel}</p>}
        </div>
        <div className={styles.headActions}>
          {!componentAOnly && (
            <span className={styles.catPill} style={{ background: band.color, color: '#fff' }}>
              {band.kode} · {band.label}
            </span>
          )}
          <Link href={detailHref} className={styles.detailBtn}>
            Lihat Detail <ArrowRight size={13} />
          </Link>
        </div>
      </Card.Header>

      <Card.Body className={styles.splitLayout}>
        <div className={styles.splitLeft}>
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
                <path d={ARC_PATH} className={styles.gaugeTrack} strokeLinecap="round" fill="transparent" strokeWidth="15" stroke="var(--surface-2, #e2e8f0)" />
                <path
                  d={ARC_PATH}
                  className={styles.gaugeValue}
                  strokeLinecap="round"
                  fill="transparent"
                  strokeWidth="15"
                  stroke="url(#itkpGaugeGrad)"
                  style={{ strokeDasharray: ARC_LEN, strokeDashoffset: ARC_LEN * (1 - ratio) }}
                />
              </svg>
              <div className={styles.gaugeCenter}>
                <span className={styles.gaugeScore}>{fmtDec(displayTotal, displayTotal % 1 === 0 ? 0 : 1)}</span>
                <span className={styles.gaugeMax}>/ {fmtDec(displayMax, displayMax % 1 === 0 ? 0 : 1)}</span>
              </div>
            </div>

            <div className={styles.heroMeta}>
              <span className={styles.heroLabel}>{componentAOnly ? 'Skor Pemanfaatan Sistem' : 'Total Skor ITKP'}</span>
              {!componentAOnly && (
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
              {!componentAOnly && (
                <span className={styles.heroNext}>
                  {nextLabel ? `Menuju predikat ${nextLabel}` : 'Predikat tertinggi tercapai'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.splitRight}>
          {componentAOnly ? (
            /* Mode filter: hanya daftar 7 indikator Pemanfaatan Sistem (A1–A7) */
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
          ) : (
            /* Mode total: Komponen A–D dan 7 indikator berdampingan, bukan ditumpuk,
               supaya kartu tetap ringkas walau ditampilkan selebar kolom laporan. */
            <div className={styles.detailGrid}>
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

              <div className={`${styles.section} ${styles.detailGridDivider}`}>
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
            </div>
          )}
        </div>
      </Card.Body>

      {/* Satu sumber teks dengan catatan yang ikut tercetak di PDF — kalau
          dibiarkan terpisah, keduanya cepat berbeda bunyi. */}
      {catatan && (
        <Card.Footer className={styles.note}>
          <Info size={12} /> {catatan}
        </Card.Footer>
      )}
    </Card>
  );
}
