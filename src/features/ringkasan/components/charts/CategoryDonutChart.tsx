"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type TooltipItem, type ChartEvent, type ActiveElement } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useIsDark, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface CategoryDatum {
  jumlahPaket: number;
  pagu: number;
  realisasi: number;
}

/** Tujuan klik untuk satu kategori. null = kategori ini tidak punya halaman. */
export interface CategoryLink {
  href: string;
  /** Nama halaman tujuan, untuk tooltip dan label aksesibilitas. */
  label: string;
}

interface Props<T extends CategoryDatum> {
  data: T[];
  getLabel: (item: T) => string;
  getColor: (label: string, isDark: boolean) => string;
  totalPaket: number;
  /**
   * Bila diisi, tiap potongan donut dan tiap baris legenda menjadi jalan masuk
   * ke daftar paketnya. Legenda dipakai sebagai tautan sungguhan (bukan tombol
   * ber-onClick) supaya bisa dibuka di tab baru, disalin alamatnya, dan
   * dijangkau keyboard — potongan kanvas tidak bisa melakukan itu.
   */
  getLink?: (label: string) => CategoryLink | null;
}

export function CategoryDonutChart<T extends CategoryDatum>({ data, getLabel, getColor, totalPaket, getLink }: Props<T>) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);
  const router = useRouter();

  const { chartData, options } = useMemo(() => {
    const labels = data.map(getLabel);
    const colors = labels.map((l) => getColor(l, isDark));
    const total = data.reduce((s, d) => s + d.jumlahPaket, 0) || 1;

    return {
      chartData: {
        labels,
        datasets: [
          {
            data: data.map((d) => d.jumlahPaket),
            backgroundColor: colors,
            borderColor: ink.surface,
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        onClick: (_e: ChartEvent, elements: ActiveElement[]) => {
          const i = elements[0]?.index;
          if (i === undefined) return;
          const target = getLink?.(labels[i]);
          if (target) router.push(target.href);
        },
        // Kursor hanya berubah di atas potongan yang benar-benar punya tujuan —
        // kalau seluruh kanvas jadi pointer, potongan tanpa tujuan ikut tampak
        // bisa diklik lalu tidak melakukan apa-apa.
        onHover: (e: ChartEvent, elements: ActiveElement[], chart: ChartJS) => {
          const canvas = chart.canvas;
          if (!canvas || !e.native) return;
          const i = elements[0]?.index;
          canvas.style.cursor = i !== undefined && getLink?.(labels[i]) ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const d = data[ctx.dataIndex];
                const pct = ((d.jumlahPaket / total) * 100).toFixed(1).replace('.', ',');
                return [
                  `${fmtInt(d.jumlahPaket)} paket (${pct}%)`,
                  `Pagu: ${fmtCompactRp(d.pagu)}`,
                  `Realisasi: ${fmtCompactRp(d.realisasi)}`,
                ];
              },
            },
          },
        },
      },
    };
  }, [data, getLabel, getColor, isDark, ink.surface, ink.tooltipBg, getLink, router]);

  if (data.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  const total = data.reduce((s, d) => s + d.jumlahPaket, 0) || 1;

  return (
    <div className={styles.donutLayout}>
      <ul className={styles.legendCol}>
        {data.map((d) => {
          const label = getLabel(d);
          const pct = ((d.jumlahPaket / total) * 100).toFixed(1).replace('.', ',');
          const target = getLink?.(label) ?? null;

          const isi = (
            <>
              <span className={styles.swatch} style={{ background: getColor(label, isDark) }} />
              <span className={styles.legendName} title={label}>{label}</span>
              <span className={styles.legendCount}>{fmtInt(d.jumlahPaket)}</span>
              <span className={styles.legendPct}>{pct}%</span>
            </>
          );

          if (!target) {
            return (
              <li key={label} className={styles.legendRow}>
                {isi}
              </li>
            );
          }

          return (
            <li key={label} className={styles.legendRow}>
              <Link
                href={target.href}
                className={styles.legendLink}
                title={`Buka ${fmtInt(d.jumlahPaket)} paket ${label} di ${target.label}`}
              >
                {isi}
                <ArrowUpRight size={13} className={styles.legendArrow} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.donutArea}>
        <div className={`${styles.wrap} ${styles.donutBox}`}>
          <Doughnut data={chartData} options={options} />
          <div className={styles.donutCenter}>
            <div className={styles.donutTotal}>{fmtInt(totalPaket)}</div>
            <div className={styles.donutLabel}>Total Paket</div>
          </div>
        </div>
      </div>
    </div>
  );
}
