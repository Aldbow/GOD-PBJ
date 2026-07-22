"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CalendarDays,
  Clock3,
  Landmark,
  Info,
  TriangleAlert,
  ArrowRight,
  LayoutGrid,
  Flag,
} from 'lucide-react';
import Link from 'next/link';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { computeItkpA, type ItkpAInput, type ItkpAResult, type ItkpARowResult } from '@/lib/itkp/calcA';
import { computeItkpBCD } from '@/lib/itkp/calcBCD';
import { getDummyBCDForUnit } from '@/lib/itkp/dummyBCD';
import { fetchItkpAData, type ItkpAUnit } from '@/lib/itkp/fetchA';
import { fmtDec, fmtPct } from '@/lib/format';
import styles from './ItkpDashboard.module.css';

const KEMENTERIAN_LABEL = 'Kementerian (Total)';
const TAHUN = 2026;

type PredikatLevel = 'istimewa' | 'sangat_baik' | 'baik' | 'cukup_baik' | 'kurang';

const PREDIKAT_BANDS: { level: PredikatLevel; label: string; min: number; max: number; rangeLabel: string }[] = [
  { level: 'kurang', label: 'Kurang', min: 0, max: 35, rangeLabel: '< 35' },
  { level: 'cukup_baik', label: 'Cukup Baik', min: 35, max: 50, rangeLabel: '35 ≤ skor < 50' },
  { level: 'baik', label: 'Baik', min: 50, max: 65, rangeLabel: '50 ≤ skor < 65' },
  { level: 'sangat_baik', label: 'Sangat Baik', min: 65, max: 80, rangeLabel: '65 ≤ skor < 80' },
  { level: 'istimewa', label: 'Istimewa', min: 80, max: 100, rangeLabel: '≥ 80' },
];

function predikat(score: number): { label: string; level: PredikatLevel; rangeLabel: string } {
  for (let i = PREDIKAT_BANDS.length - 1; i >= 0; i--) {
    if (score >= PREDIKAT_BANDS[i].min) return PREDIKAT_BANDS[i];
  }
  return PREDIKAT_BANDS[0];
}

function nextPredikatLabel(level: PredikatLevel): string | null {
  const idx = PREDIKAT_BANDS.findIndex((b) => b.level === level);
  if (idx < 0 || idx === PREDIKAT_BANDS.length - 1) return null;
  return PREDIKAT_BANDS[idx + 1].label;
}

interface StatusInfo {
  label: string;
  variant: BadgeVariant;
}

function statusForRatio(ratio: number, applicable: boolean): StatusInfo {
  if (!applicable) return { label: 'Belum ada capaian', variant: 'default' };
  if (ratio >= 1) return { label: 'Tercapai', variant: 'rendah' };
  if (ratio >= 0.6) return { label: 'Baik', variant: 'rendah' };
  if (ratio >= 0.3) return { label: 'Perlu perhatian', variant: 'sedang' };
  return { label: 'Sangat rendah', variant: 'tinggi' };
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
  const currentPredikat = predikat(totalItkp);
  const nextLabel = nextPredikatLabel(currentPredikat.level);

  const detailHref = `/itkp/pemanfaatan-sistem${selectedUnit ? `?satker=${encodeURIComponent(selectedUnit)}` : ''}`;

  const priorityItems = useMemo(() => {
    if (!resultA) return [];
    return resultA.rows
      .filter((r) => r.applicable && r.skor < r.skorMax && r.denValue > 0)
      .map((r) => ({ label: r.label, pct: (r.numValue / r.denValue) * 100 }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
  }, [resultA]);

  const updatedLabel = lastUpdate
    ? `${lastUpdate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, ${lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
    : 'Memuat...';

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
      </div>

      {error && <ErrorBox className={styles.sectionSpacer}>{error}</ErrorBox>}

      <div className={styles.toolbar}>
        <div className={styles.toolbarFilter}>
          <span className={styles.toolbarLabel}>Unit Penilaian</span>
          <SearchableSelect
            value={selectedUnit}
            onChange={setSelectedUnit}
            options={unitOptions}
            placeholder={KEMENTERIAN_LABEL}
            ariaLabel="Pilih satker"
            className={styles.toolbarSelect}
          />
          <span className={styles.toolbarYearPill}>
            <CalendarDays size={13} />
            Tahun {TAHUN}
          </span>
        </div>
        <div className={styles.toolbarMeta}>
          <span className={styles.toolbarUpdated}>
            <Clock3 size={13} />
            Data terakhir diperbarui {updatedLabel}
          </span>
          <button type="button" className={styles.refreshBtn} onClick={load} disabled={loading} aria-label="Muat ulang data">
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Skor ITKP — hero */}
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <span className={styles.heroLabel}>SKOR ITKP {TAHUN}</span>
          <div className={styles.heroValueRow}>
            <span className={styles.heroValue}>{fmtDec(totalItkp, 2)}</span>
            <span className={`${styles.heroPredikatPill} ${styles[`predikat_${currentPredikat.level}`]}`}>
              {currentPredikat.label}
            </span>
          </div>
          <span className={styles.heroRange}>{currentPredikat.rangeLabel}</span>
        </div>

        <div className={styles.scaleWrap}>
          <div className={styles.scaleTrack}>
            {PREDIKAT_BANDS.map((b) => (
              <div
                key={b.level}
                className={`${styles.scaleSegment} ${styles[`seg_${b.level}`]}`}
                style={{ width: `${b.max - b.min}%` }}
              />
            ))}
            <div className={styles.scaleMarker} style={{ left: `${Math.max(0, Math.min(100, totalItkp))}%` }} />
          </div>
          <div className={styles.scaleTicks}>
            {[0, 35, 50, 65, 80, 100].map((t) => (
              <span key={t} className={styles.scaleTick} style={{ left: `${t}%` }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <span className={styles.heroCaption}>
          {nextLabel ? `Menuju ${nextLabel}` : 'Predikat tertinggi telah tercapai'}
        </span>
      </div>

      {/* Indikator A-D */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeading}>
            <span className={styles.panelIcon}>
              <LayoutGrid size={15} />
            </span>
            <div>
              <h3 className={styles.panelTitle}>Komponen Penilaian ITKP</h3>
              <p className={styles.panelSub}>Empat komponen pembentuk skor akhir</p>
            </div>
          </div>
          <span className={styles.panelBadge}>4 komponen</span>
        </div>
        <div className={styles.indicatorRow}>
          <IndicatorCard label="A. Pemanfaatan Sistem" score={totalA} max={30} bobot={30} href={detailHref} />
          <IndicatorCard label="B. Kompetensi SDM PBJ" score={resultBCD.nilaiB} max={30} bobot={30} />
          <IndicatorCard label="C. Kematangan UKPBJ" score={resultBCD.nilaiC} max={30} bobot={30} />
          <IndicatorCard label="D. Integritas Pengadaan" score={resultBCD.nilaiD} max={10} bobot={10} />
        </div>
      </section>

      {/* Indikator Pemanfaatan Sistem — A1-A7 */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeading}>
            <span className={styles.panelIcon}>
              <LayoutGrid size={15} />
            </span>
            <div>
              <h3 className={styles.panelTitle}>Indikator Pemanfaatan Sistem Pengadaan</h3>
              <p className={styles.panelSub}>Rincian sub-indikator A1–A7 komponen A</p>
            </div>
          </div>
          <span className={styles.panelBadge}>Bobot 30%</span>
        </div>
        <div className={styles.aGrid}>
          {resultA?.rows.map((row, i) => (
            <SubIndicatorCard key={row.key} index={i + 1} row={row} />
          ))}
          <RingkasanACard totalA={totalA} rows={resultA?.rows ?? []} href={detailHref} />
        </div>
      </section>

      {/* Prioritas Perbaikan */}
      {priorityItems.length > 0 && (
        <div className={styles.priorityCard}>
          <div className={styles.sectionHeader}>
            <Flag size={16} />
            <h3 className={styles.sectionTitle}>Prioritas Perbaikan</h3>
          </div>
          <ol className={styles.priorityList}>
            {priorityItems.map((item, i) => (
              <li key={item.label} className={styles.priorityItem}>
                <span className={styles.priorityRank}>{i + 1}</span>
                <span className={styles.priorityLabel}>{item.label}</span>
                <span className={styles.priorityPct}>{fmtPct(item.pct, 2)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}

function IndicatorCard({
  label,
  score,
  max,
  bobot,
  href,
}: {
  label: string;
  score: number;
  max: number;
  bobot: number;
  href?: string;
}) {
  const ratio = max > 0 ? score / max : 0;
  const status = statusForRatio(ratio, true);
  const barPct = Math.max(0, Math.min(ratio * 100, 100));

  const content = (
    <>
      <div className={styles.indicatorTop}>
        <span className={styles.indicatorLabel}>{label}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className={styles.indicatorValue}>
        {fmtDec(score, 2)}
        <span className={styles.indicatorValueMax}>/{max}</span>
      </div>
      <div className={styles.indicatorBarTrack}>
        <div className={styles.indicatorBarFill} style={{ width: `${barPct}%` }} />
      </div>
      <div className={styles.indicatorFoot}>
        <span>Bobot {bobot}%</span>
        {href && (
          <span className={styles.indicatorDetailLink}>
            Lihat detail <ArrowRight size={12} />
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${styles.indicatorCard} ${styles.indicatorCardClickable}`}>
        {content}
      </Link>
    );
  }
  return <div className={styles.indicatorCard}>{content}</div>;
}

function SubIndicatorCard({ index, row }: { index: number; row: ItkpARowResult }) {
  const ratio = row.skorMax > 0 ? row.skor / row.skorMax : 0;
  const status = statusForRatio(ratio, row.applicable);
  const pctNum = row.applicable && row.denValue > 0 ? (row.numValue / row.denValue) * 100 : null;
  const barPct = pctNum === null ? 0 : Math.max(0, Math.min(pctNum, 100));
  const overTarget = pctNum !== null && pctNum > 100;

  return (
    <div className={styles.subCard}>
      <div className={styles.subCardHead}>
        <div className={styles.subCardTitle}>
          <span className={styles.subCardIndex}>A{index}</span>
          <span className={styles.subCardLabel}>{row.label}</span>
          <button type="button" className={styles.infoBtn} title={row.formula} aria-label="Formula perhitungan">
            <Info size={12} />
          </button>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className={styles.subCardPct}>{row.applicable ? row.persentase : '-'}</div>
      <span className={styles.subCardPctCaption}>Persentase capaian</span>

      <div className={styles.subCardBarTrack}>
        <div className={`${styles.subCardBarFill} ${styles[`bar_${status.variant}`]}`} style={{ width: `${barPct}%` }} />
      </div>
      {overTarget && (
        <span className={styles.overBadge}>Melampaui target +{fmtDec(pctNum! - 100, 2)}%</span>
      )}

      <div className={styles.subCardScoreRow}>
        <span>Skor</span>
        <span className={styles.subCardScoreValue}>
          {row.applicable ? fmtDec(row.skor, 2) : '-'} / {fmtDec(row.skorMax, row.skorMax % 1 === 0 ? 0 : 1)}
        </span>
      </div>

      <div className={`${styles.subCardNote} ${row.applicable ? '' : styles.subCardNoteWarn}`}>
        {row.applicable ? <Info size={11} /> : <TriangleAlert size={11} />}
        <span>{row.catatan}</span>
      </div>
    </div>
  );
}

function RingkasanACard({ totalA, rows, href }: { totalA: number; rows: ItkpARowResult[]; href: string }) {
  const tercapai = rows.filter((r) => r.applicable && r.skor >= r.skorMax).length;
  const perluPerhatian = rows.length - tercapai;

  return (
    <Link href={href} className={`${styles.subCard} ${styles.summaryCard}`}>
      <span className={styles.summaryHead}>Ringkasan A</span>
      <div className={styles.summaryScore}>
        {fmtDec(totalA, 2)}
        <span className={styles.summaryScoreMax}>/30</span>
      </div>
      <div className={styles.summaryRow}>
        <span>Bobot</span>
        <span>30%</span>
      </div>
      <div className={styles.summaryRow}>
        <span>Komponen tercapai</span>
        <span>
          {tercapai} dari {rows.length}
        </span>
      </div>
      <div className={styles.summaryRow}>
        <span>Perlu perhatian</span>
        <span>{perluPerhatian}</span>
      </div>
      <span className={styles.summaryCta}>
        Lihat analisis <ArrowRight size={13} />
      </span>
    </Link>
  );
}
