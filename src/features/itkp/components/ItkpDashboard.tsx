"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CalendarDays,
  Clock3,
  Info,
  TriangleAlert,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  MonitorSmartphone,
  Users,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ErrorBox } from '@/components/ui/ErrorBox';
import { computeItkpA, type ItkpAInput, type ItkpAResult } from '@/lib/itkp/calcA';
import { computeItkpBCD, type ItkpBCDResult } from '@/lib/itkp/calcBCD';
import { getDummyBCDForUnit } from '@/lib/itkp/dummyBCD';
import { fetchItkpAData } from '@/lib/itkp/fetchA';
import { fmtDec, fmtPct } from '@/lib/format';
import {
  buildComponents,
  predikatOf,
  PREDIKAT_BANDS,
  type ComponentCode,
  type ItkpComponentModel,
  type ItkpIndicatorModel,
} from '@/lib/itkp/itkpModel';
import styles from './ItkpDashboard.module.css';

const KEMENTERIAN_LABEL = 'Kementerian (Total)';
const TAHUN = 2026;

const COMP_ICON: Record<ComponentCode, React.ReactNode> = {
  A: <MonitorSmartphone size={18} />,
  B: <Users size={18} />,
  C: <Building2 size={18} />,
  D: <ShieldCheck size={18} />,
};

export function ItkpDashboard() {
  const [kementerian, setKementerian] = useState<ItkpAInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeCode, setActiveCode] = useState<ComponentCode>('A');
  const [pedomanOpen, setPedomanOpen] = useState(false);
  const rincianRef = useRef<HTMLElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchItkpAData();
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

  const resultA: ItkpAResult | null = useMemo(
    () => (kementerian ? computeItkpA(kementerian) : null),
    [kementerian]
  );

  const bcdAgg = useMemo(() => {
    // Pada tingkat kementerian, nilai B, C, D dihitung menggunakan rata-rata dari seluruh satker (dummy dataset)
    // yang merepresentasikan performa nasional. (Mocking for now to avoid breaking the full dummy logic)
    const allUnits = ['Satker A', 'Satker B', 'Satker C']; // Representasi unit
    const perUnit = allUnits.map((u) => computeItkpBCD(getDummyBCDForUnit(u)));
    const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
    return {
      nilaiB: avg(perUnit.map((r) => r.nilaiB)),
      nilaiC: avg(perUnit.map((r) => r.nilaiC)),
      nilaiD: avg(perUnit.map((r) => r.nilaiD)),
    };
  }, []);

  const totalA = resultA?.total ?? 0;
  const totalItkp = totalA + bcdAgg.nilaiB + bcdAgg.nilaiC + bcdAgg.nilaiD;
  const currentPredikat = predikatOf(totalItkp);

  const detailHref = '/itkp/pemanfaatan-sistem';

  const components = useMemo(
    () =>
      buildComponents({
        resultA,
        totalA,
        nilaiB: bcdAgg.nilaiB,
        nilaiC: bcdAgg.nilaiC,
        nilaiD: bcdAgg.nilaiD,
        bcdRows: null,
        detailHrefA: detailHref,
      }),
    [resultA, totalA, bcdAgg, detailHref]
  );

  const activeComp = components.find((c) => c.code === activeCode) ?? components[0];

  const selectComponent = (code: ComponentCode) => {
    setActiveCode(code);
    setPedomanOpen(false);
    // Scroll halus ke rincian tanpa reload halaman.
    window.requestAnimationFrame(() => {
      rincianRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const updatedLabel = lastUpdate
    ? `${lastUpdate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, ${lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
    : 'Memuat...';

  const markerPos = Math.max(0, Math.min(100, totalItkp));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {/* ── Judul ── */}
      <div className={styles.pageHead}>
        <span className={styles.crumb}>ITKP · Monitoring &amp; Evaluasi</span>
        <h1 className={styles.pageTitle}>Dashboard Penilaian ITKP</h1>
      </div>

      {error && <ErrorBox className={styles.sectionSpacer}>{error}</ErrorBox>}

      {/* ── Info Pembaruan ── */}
      <div className={styles.filterBar} style={{ justifyContent: 'flex-end', border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, marginBottom: 12 }}>
        <div className={styles.updatedWrap}>
          <span className={styles.updated}>
            <Clock3 size={13} />
            Data terakhir diperbarui {updatedLabel}
          </span>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={load}
            disabled={loading}
            aria-label="Muat ulang data"
          >
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* ── Ringkasan Skor ITKP ── */}
      <div className={styles.scoreSummary}>
        {/* Skor */}
        <div className={styles.sumScore}>
          <span className={styles.sumLabel}>Skor ITKP {TAHUN}</span>
          <div className={styles.sumScoreRow}>
            <span className={styles.sumScoreValue}>{fmtDec(totalItkp, 2)}</span>
            <span className={styles.predikatPill} style={{ background: currentPredikat.color }}>
              {currentPredikat.kode} · {currentPredikat.label}
            </span>
          </div>
          <span className={styles.sumScoreMeta}>
            Predikat {currentPredikat.kode} ({currentPredikat.rangeLabel}) · skor {fmtDec(totalItkp, 2)} dari 100
          </span>
        </div>

        {/* Distribusi kategori */}
        <div className={styles.sumDist}>
          <span className={styles.sumLabel}>Distribusi Kategori Penilaian</span>
          <div className={styles.distWrap}>
            <div className={styles.distMarker} style={{ left: `${markerPos}%` }}>
              <span className={styles.distMarkerValue}>{fmtDec(totalItkp, 2)}</span>
              <span className={styles.distMarkerStem} />
            </div>
            <div className={styles.distTrack}>
              {PREDIKAT_BANDS.map((b) => (
                <div
                  key={b.level}
                  className={styles.distSeg}
                  style={{ width: `${b.max - b.min}%`, background: b.color }}
                  title={`${b.kode} · ${b.label} · ${b.rangeLabel}`}
                >
                  <span className={styles.distSegLabel}>{b.kode}</span>
                </div>
              ))}
            </div>
            <div className={styles.distTicks}>
              {[0, 30, 50, 60, 70, 80, 90, 100].map((t) => (
                <span key={t} className={styles.distTick} style={{ left: `${t}%` }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Kartu Komponen A–D ── */}
      <div className={styles.compGrid}>
        {components.map((c) => (
          <ComponentCard key={c.code} comp={c} active={c.code === activeCode} onSelect={() => selectComponent(c.code)} />
        ))}
      </div>

      {/* ── Rincian Indikator Komponen Aktif ── */}
      <section ref={rincianRef} className={`${styles.rincian} ${styles[`comp${activeComp.code}`]}`}>
        <header className={styles.rincianHead}>
          <div className={styles.rincianTitleWrap}>
            <span className={styles.rincianIcon}>{COMP_ICON[activeComp.code]}</span>
            <div>
              <h2 className={styles.rincianTitle}>
                Rincian Indikator Komponen {activeComp.code} — {activeComp.name}
              </h2>
              <div className={styles.rincianMeta}>
                <span>
                  Bobot <strong>{activeComp.weight}%</strong>
                </span>
                <span className={styles.metaDot} />
                <span>
                  Skor{' '}
                  <strong>
                    {fmtDec(activeComp.score, 2)} / {fmtDec(activeComp.maxScore, 0)}
                  </strong>
                </span>
                <span className={styles.metaDot} />
                <span>
                  Capaian <strong>{fmtPct(activeComp.percentage)}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.pedomanBtn}
            onClick={() => setPedomanOpen((v) => !v)}
            aria-expanded={pedomanOpen}
          >
            <BookOpen size={14} />
            {pedomanOpen ? 'Tutup pedoman' : 'Lihat pedoman penilaian'}
          </button>
        </header>

        {pedomanOpen && (
          <div className={styles.pedomanPanel}>
            <p className={styles.pedomanIntro}>
              Formula perhitungan tiap indikator Komponen {activeComp.code} (sesuai Kepka penilaian ITKP):
            </p>
            <ul className={styles.pedomanList}>
              {activeComp.indicators.map((ind) => (
                <li key={ind.code}>
                  <span className={styles.pedomanCode}>{ind.code}</span>
                  <span>
                    <strong>{ind.name}.</strong> {ind.formula}
                  </span>
                </li>
              ))}
              {activeComp.indicators.length === 0 && <li>Rincian tersedia saat memilih satu Unit Penilaian.</li>}
            </ul>
          </div>
        )}

        <div className={styles.indGrid}>
          {activeComp.indicators.map((ind) => (
            <IndicatorCard key={ind.code} ind={ind} />
          ))}
          {activeComp.indicators.length === 0 && (
            <div className={styles.indEmpty}>
              <Info size={16} />
              <p>
                Rincian indikator Komponen {activeComp.code} ditampilkan saat memilih <strong>Unit Penilaian</strong>{' '}
                tertentu. Pada tingkat Kementerian (Total), nilai komponen ini merupakan agregat antar-unit.
              </p>
            </div>
          )}
          <ComponentSummaryCard comp={activeComp} />
        </div>
      </section>
    </motion.div>
  );
}

// ── Kartu Komponen A–D ──
function ComponentCard({
  comp,
  active,
  onSelect,
}: {
  comp: ItkpComponentModel;
  active: boolean;
  onSelect: () => void;
}) {
  const barPct = Math.max(0, Math.min(comp.percentage, 100));
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`${styles.compCard} ${styles[`comp${comp.code}`]} ${active ? styles.compCardActive : ''}`}
    >
      <div className={styles.compTop}>
        <span className={styles.compIcon}>{COMP_ICON[comp.code]}</span>
        <Badge variant={comp.status.variant}>{comp.status.label}</Badge>
      </div>
      <div className={styles.compName}>
        {comp.code}. {comp.name}
      </div>
      <span className={styles.compWeight}>Bobot {comp.weight}%</span>
      <div className={styles.compScoreRow}>
        <span className={styles.compScore}>{fmtDec(comp.score, 2)}</span>
        <span className={styles.compScoreMax}>/ {fmtDec(comp.maxScore, 0)}</span>
      </div>
      <div
        className={styles.compBarTrack}
        role="progressbar"
        aria-valuenow={Math.round(comp.percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Capaian Komponen ${comp.name}`}
      >
        <div className={styles.compBarFill} style={{ width: `${barPct}%` }} />
      </div>
      <div className={styles.compFoot}>
        <span className={styles.compPct}>{fmtPct(comp.percentage)}</span>
        <span className={styles.compDetail}>
          Lihat rincian <ArrowRight size={13} />
        </span>
      </div>
    </button>
  );
}

// ── Kartu Indikator ──
function IndicatorCard({ ind }: { ind: ItkpIndicatorModel }) {
  const barPct = ind.applicable ? Math.max(0, Math.min(ind.attainment, 100)) : 0;
  return (
    <div className={styles.indCard}>
      <div className={styles.indHead}>
        <div className={styles.indTitle}>
          <span className={styles.indCode}>{ind.code}</span>
          <span className={styles.indName}>{ind.name}</span>
          <button type="button" className={styles.infoBtn} title={ind.formula} aria-label={`Formula ${ind.name}`}>
            <Info size={12} />
          </button>
        </div>
        <Badge variant={ind.status.variant}>{ind.status.label}</Badge>
      </div>

      <div className={styles.indPct}>{ind.capaianLabel}</div>
      <span className={styles.indPctCaption}>Persentase capaian</span>

      <div className={styles.indBarTrack}>
        <div className={`${styles.indBarFill} ${styles[`bar_${ind.status.variant}`]}`} style={{ width: `${barPct}%` }} />
      </div>
      {ind.overTarget !== null && (
        <span className={styles.overBadge}>
          <ArrowUpRight size={11} /> Melampaui target +{fmtDec(ind.overTarget, 2)}%
        </span>
      )}

      <div className={styles.indScoreRow}>
        <span>Skor</span>
        <span className={styles.indScoreValue}>
          {ind.applicable ? fmtDec(ind.score, 2) : '—'} / {fmtDec(ind.maxScore, ind.maxScore % 1 === 0 ? 0 : 1)}
        </span>
      </div>

      <div className={`${styles.indNote} ${ind.applicable ? '' : styles.indNoteWarn}`}>
        {ind.applicable ? <Info size={11} /> : <TriangleAlert size={11} />}
        <span>{ind.description}</span>
      </div>
    </div>
  );
}

// ── Kartu Ringkasan Komponen ──
function ComponentSummaryCard({ comp }: { comp: ItkpComponentModel }) {
  const tercapai = comp.indicators.filter((i) => i.applicable && i.score >= i.maxScore).length;
  const inner = (
    <>
      <span className={styles.summaryHead}>Ringkasan Komponen {comp.code}</span>
      <div className={styles.summaryScoreRow}>
        <span className={styles.summaryScore}>
          {fmtDec(comp.score, 2)}
          <span className={styles.summaryScoreMax}>/ {fmtDec(comp.maxScore, 0)}</span>
        </span>
        <Badge variant={comp.status.variant}>{comp.status.label}</Badge>
      </div>
      <div className={styles.summaryRows}>
        <div className={styles.summaryRow}>
          <span>Bobot</span>
          <span>{comp.weight}%</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Persentase capaian</span>
          <span>{fmtPct(comp.percentage)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Subindikator</span>
          <span>{comp.indicators.length} indikator</span>
        </div>
        {comp.indicators.length > 0 && (
          <div className={styles.summaryRow}>
            <span>Indikator tercapai</span>
            <span>
              {tercapai} dari {comp.indicators.length}
            </span>
          </div>
        )}
      </div>
      {comp.detailHref && (
        <span className={styles.summaryCta}>
          Lihat analisis <ArrowRight size={13} />
        </span>
      )}
    </>
  );

  if (comp.detailHref) {
    return (
      <Link href={comp.detailHref} className={`${styles.summaryCard} ${styles.summaryCardLink}`}>
        {inner}
      </Link>
    );
  }
  return <div className={styles.summaryCard}>{inner}</div>;
}
