"use client";

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
  type ScriptableContext,
  type TooltipModel,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtRupiahDetail, fmtPct } from '@/lib/format';
import { useIsDark, chartInk, fmtCompactRp } from './chartTheme';
import { TARGET_TRIWULAN } from '../../lib/targetTriwulan';
import type { KurvaRealisasi } from '../../lib/realisasiTimeline';
import styles from './KurvaRealisasiTarget.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

/** Warna seri, mengikuti token --brand-600 / --teal-600 di kedua tema. */
const BRAND = { light: '#13416B', dark: '#3D86CC' };
const TEAL = '#00B676'; // --teal-600, sama di light dan dark

/** Komponen RGB dari hex, untuk menyusun gradien area. */
function rgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

interface TipState {
  x: number;
  y: number;
  label: string;
  realisasi: number;
  target: number;
  proyeksi: boolean;
  adaData: boolean;
}

interface Props {
  kurva: KurvaRealisasi;
  loading?: boolean;
  /** Sumbu waktunya gagal dimuat — dibedakan dari "memang tidak ada datanya". */
  error?: string | null;
}

export function KurvaRealisasiTarget({ kurva, loading = false, error = null }: Props) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);
  const brand = isDark ? BRAND.dark : BRAND.light;
  const [tip, setTip] = useState<TipState | null>(null);
  /** Kunci tooltip terakhir, supaya external handler tidak setState tiap frame. */
  const tipKeyRef = useRef<string>('');

  const { titik, indeksAktual, indeksAkhirData } = kurva;

  // Kurva realisasi berhenti di bulan terakhir yang punya data. Menarik garis
  // datar sampai Desember akan terbaca sebagai "dipastikan tidak ada realisasi
  // lagi" — padahal yang benar adalah datanya memang belum ada.
  const dataRealisasi = useMemo(
    () => titik.map((t, i) => (i <= indeksAkhirData ? t.realisasi : null)),
    [titik, indeksAkhirData]
  );
  const dataTarget = useMemo(() => titik.map((t) => t.target), [titik]);

  const external = useCallback(
    (ctx: { chart: ChartJS; tooltip: TooltipModel<'line'> }) => {
      const { tooltip, chart } = ctx;
      if (tooltip.opacity === 0) {
        if (tipKeyRef.current !== '') {
          tipKeyRef.current = '';
          setTip(null);
        }
        return;
      }
      const i = tooltip.dataPoints?.[0]?.dataIndex;
      if (i === undefined || !titik[i]) return;
      const key = `${i}:${Math.round(tooltip.caretX)}`;
      if (key === tipKeyRef.current) return;
      tipKeyRef.current = key;
      const t = titik[i];
      setTip({
        // Jaga tooltip tetap di dalam kanvas: di dekat tepi, geser titik jangkarnya.
        x: Math.min(Math.max(tooltip.caretX, 96), chart.width - 96),
        y: Math.max(tooltip.caretY - 12, 8),
        label: t.label,
        realisasi: t.realisasi,
        target: t.target,
        proyeksi: t.proyeksi,
        adaData: i <= indeksAkhirData,
      });
    },
    [titik, indeksAkhirData]
  );

  const data = useMemo(
    () => ({
      labels: titik.map((t) => t.label),
      datasets: [
        {
          label: 'Target',
          data: dataTarget,
          borderColor: TEAL,
          backgroundColor: TEAL,
          borderWidth: 2,
          borderDash: [5, 6],
          pointRadius: (c: ScriptableContext<'line'>) => (titik[c.dataIndex]?.tutupTriwulan ? 3.5 : 0),
          pointHoverRadius: (c: ScriptableContext<'line'>) => (titik[c.dataIndex]?.tutupTriwulan ? 5 : 0),
          pointBackgroundColor: TEAL,
          pointBorderColor: ink.surface,
          pointBorderWidth: 1.5,
          tension: 0,
          fill: false,
          order: 2,
        },
        {
          label: 'Realisasi',
          data: dataRealisasi,
          borderColor: brand,
          borderWidth: 2.5,
          // Ruas setelah bulan yang sudah benar-benar terjadi digambar putus-
          // putus: nilainya berasal dari tender yang menang tapi belum
          // berkontrak, jadi belum boleh dibaca sebagai serapan.
          segment: {
            borderDash: (c: { p0DataIndex: number }) => (c.p0DataIndex >= indeksAktual ? [4, 5] : undefined),
          },
          backgroundColor: (c: ScriptableContext<'line'>) => {
            const { ctx, chartArea } = c.chart;
            if (!chartArea) return 'transparent';
            const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, `rgba(${rgb(brand)}, 0.22)`);
            g.addColorStop(1, `rgba(${rgb(brand)}, 0)`);
            return g;
          },
          pointRadius: (c: ScriptableContext<'line'>) =>
            c.dataIndex === indeksAktual || c.dataIndex === indeksAkhirData ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: brand,
          pointBorderColor: ink.surface,
          pointBorderWidth: 2,
          tension: 0.25,
          fill: true,
          order: 1,
        },
      ],
    }),
    [titik, dataRealisasi, dataTarget, brand, ink.surface, indeksAktual, indeksAkhirData]
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external, mode: 'index', intersect: false },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: ink.border },
          ticks: { color: ink.tick, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: ink.grid },
          border: { display: false },
          ticks: {
            color: ink.tick,
            font: { size: 11 },
            maxTicksLimit: 6,
            callback: (v: string | number) => fmtCompactRp(Number(v)),
          },
        },
      },
    }),
    [ink.border, ink.grid, ink.tick, external]
  );

  if (loading) {
    return (
      <Card variant="flush">
        <Card.Header>
          <Card.Icon tone="positive"><TrendingUp /></Card.Icon>
          <Card.Title>Kurva Realisasi terhadap Target Triwulan</Card.Title>
        </Card.Header>
        <Card.Body><Skeleton style={{ height: 320 }} /></Card.Body>
      </Card>
    );
  }

  const puncakAktual = indeksAktual >= 0 ? titik[indeksAktual] : null;
  const selisih = puncakAktual ? puncakAktual.realisasi - puncakAktual.target : 0;
  const tertinggal = selisih < 0;
  const pctRealisasi = kurva.totalPagu > 0 ? (kurva.realisasiAktual / kurva.totalPagu) * 100 : 0;
  const pctTarget = kurva.totalPagu > 0 && puncakAktual ? (puncakAktual.target / kurva.totalPagu) * 100 : 0;

  return (
    <Card variant="flush">
      <Card.Header className={styles.head}>
        <Card.Icon tone="positive"><TrendingUp /></Card.Icon>
        <div className={styles.headText}>
          <Card.Title as="span">Kurva Realisasi terhadap Target Triwulan</Card.Title>
          <span className={styles.caption}>
            Realisasi kumulatif dibanding target TW1 {TARGET_TRIWULAN[0]}% · TW2 {TARGET_TRIWULAN[1]}% ·
            TW3 {TARGET_TRIWULAN[2]}% · TW4 {TARGET_TRIWULAN[3]}% dari pagu — target yang sama dengan kartu
            &ldquo;Sudah Realisasi&rdquo;
          </span>
        </div>
      </Card.Header>

      {error ? (
        <div className={styles.empty}>
          Sumbu waktu realisasi gagal dimuat, jadi kurvanya tidak bisa disusun. Angka pada kartu KPI di atas
          tidak terpengaruh. ({error})
        </div>
      ) : titik.length === 0 ? (
        <div className={styles.empty}>
          Tidak ada realisasi bertanggal pada cakupan filter ini, sehingga kurvanya tidak bisa disusun.
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                <span className={styles.swatch} style={{ borderTopColor: brand, width: 14 }} />
                Realisasi s.d. {puncakAktual?.label ?? '-'}
              </span>
              <span className={styles.statValue}>{fmtRupiahDetail(kurva.realisasiAktual)}</span>
              <span className={styles.statNote}>{fmtPct(pctRealisasi)} dari pagu</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                <span
                  className={styles.swatch}
                  style={{ borderTopColor: TEAL, borderTopStyle: 'dashed', width: 14 }}
                />
                Target pada {puncakAktual?.label ?? '-'}
              </span>
              <span className={styles.statValue}>{fmtRupiahDetail(puncakAktual?.target ?? 0)}</span>
              <span className={styles.statNote}>{fmtPct(pctTarget)} dari pagu</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Selisih terhadap target</span>
              <span className={`${styles.statValue} ${tertinggal ? styles.behind : styles.ahead}`}>
                {tertinggal ? '−' : '+'}
                {fmtRupiahDetail(Math.abs(selisih))}
              </span>
              <span className={styles.statNote}>
                {tertinggal ? 'Di bawah kurva target' : 'Di atas kurva target'}
              </span>
            </div>
          </div>

          <div className={styles.canvasWrap}>
            <Line data={data} options={options} />
            {tip && (
              <div className={styles.tip} style={{ left: tip.x, top: tip.y }} role="presentation">
                <div className={styles.tipTitle}>
                  <span>{tip.label}</span>
                  {tip.proyeksi && <span className={styles.tipTag}>Proyeksi</span>}
                </div>
                {tip.adaData ? (
                  <>
                    <div className={styles.tipRow}>
                      <span className={styles.tipKey}>
                        <span className={styles.tipDot} style={{ background: brand }} />
                        Realisasi
                      </span>
                      <span className={styles.tipVal}>{fmtCompactRp(tip.realisasi)}</span>
                    </div>
                    <div className={styles.tipRow}>
                      <span className={styles.tipKey}>
                        <span className={styles.tipDot} style={{ background: TEAL }} />
                        Target
                      </span>
                      <span className={styles.tipVal}>{fmtCompactRp(tip.target)}</span>
                    </div>
                    <div className={styles.tipSep} />
                    <div className={styles.tipRow}>
                      <span className={styles.tipKey}>Selisih</span>
                      <span
                        className={`${styles.tipDelta} ${
                          tip.realisasi - tip.target < 0 ? styles.behind : styles.ahead
                        }`}
                      >
                        {tip.realisasi - tip.target < 0 ? '−' : '+'}
                        {fmtCompactRp(Math.abs(tip.realisasi - tip.target))}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.tipRow}>
                      <span className={styles.tipKey}>
                        <span className={styles.tipDot} style={{ background: TEAL }} />
                        Target
                      </span>
                      <span className={styles.tipVal}>{fmtCompactRp(tip.target)}</span>
                    </div>
                    <div className={styles.tipSep} />
                    <div className={styles.tipRow}>
                      <span className={styles.tipKey}>Realisasi</span>
                      <span className={styles.tipVal}>belum ada data</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <Card.Footer className={styles.foot}>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.swatch} style={{ borderTopColor: brand }} />
                Realisasi kumulatif
              </span>
              <span className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{ borderTopColor: brand, borderTopStyle: 'dashed' }}
                />
                Belum berkontrak (nilai HPS)
              </span>
              <span className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{ borderTopColor: TEAL, borderTopStyle: 'dashed' }}
                />
                Target kumulatif
              </span>
              <span className={styles.legendItem}>
                <span
                  className={styles.swatchArea}
                  style={{ background: `linear-gradient(180deg, rgba(${rgb(brand)},0.22), rgba(${rgb(brand)},0))` }}
                />
                Area realisasi
              </span>
            </div>

            {kurva.nilaiProyeksi > 0 && (
              <span className={styles.note}>
                <Info size={12} />
                <span>
                  {fmtRupiahDetail(kurva.nilaiProyeksi)} bertanggal setelah hari ini — tender yang sudah
                  ditetapkan pemenangnya tapi belum punya nilai kontrak, sehingga view memakai nilai HPS.
                  Ruas ini digambar putus-putus dan belum terjadi.
                </span>
              </span>
            )}
            {kurva.nilaiTanpaTanggal > 0 && (
              <span className={styles.note}>
                <Info size={12} />
                <span>
                  {fmtRupiahDetail(kurva.nilaiTanpaTanggal)} (
                  {fmtPct((kurva.nilaiTanpaTanggal / kurva.totalRealisasi) * 100)} dari realisasi) tidak
                  punya peristiwa bertanggal sehingga tidak masuk kurva. Total pada kartu KPI tetap{' '}
                  {fmtRupiahDetail(kurva.totalRealisasi)}.
                </span>
              </span>
            )}
          </Card.Footer>
        </>
      )}
    </Card>
  );
}
