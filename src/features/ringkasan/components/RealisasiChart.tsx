"use client";

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import styles from './RealisasiChart.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export function RealisasiChart() {
  const [period, setPeriod] = useState<'bulanan' | 'kuartalan'>('bulanan');
  const [isDark, setIsDark] = useState(true);

  // Sync with HTML data-theme attribute
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    return () => observer.disconnect();
  }, []);

  const actualColor = isDark ? '#5B9BF0' : '#1D5FA8';
  const actualFill = isDark ? 'rgba(91,155,240,0.14)' : 'rgba(29,95,168,0.10)';
  const idealColor = isDark ? '#9098AC' : '#8B92A0';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139,146,160,0.15)';
  const tickColor = isDark ? '#9CA3B8' : '#5B6472';

  const data = period === 'bulanan' ? {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
    datasets: [
      { label: 'Realisasi aktual', data: [4, 9, 16, 22, 27, 31], borderColor: actualColor, backgroundColor: actualFill, pointBackgroundColor: actualColor, borderWidth: 2, pointRadius: 3, tension: 0.3, fill: true },
      { label: 'Kurva ideal', data: [5, 11, 19, 28, 36, 44], borderColor: idealColor, backgroundColor: idealColor, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, tension: 0.3, fill: false }
    ]
  } : {
    labels: ['Q1', 'Q2'],
    datasets: [
      { label: 'Realisasi aktual', data: [16, 31], borderColor: actualColor, backgroundColor: actualFill, pointBackgroundColor: actualColor, borderWidth: 2, pointRadius: 3, tension: 0.3, fill: true },
      { label: 'Kurva ideal', data: [19, 44], borderColor: idealColor, backgroundColor: idealColor, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, tension: 0.3, fill: false }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        ticks: { callback: (v: any) => v + '%', color: tickColor },
        grid: { color: gridColor }
      },
      x: {
        ticks: { color: tickColor },
        grid: { display: false }
      }
    }
  };

  return (
    <Card className={styles.card}>
      <Card.Header>
        <Card.Icon tone="positive"><TrendingUp /></Card.Icon>
        <Card.Title>Realisasi belanja vs kurva ideal</Card.Title>
        <div className={`${styles.segmented} ${styles.headerAction}`}>
          <button
            className={`${styles.segBtn} ${period === 'bulanan' ? styles.active : ''}`}
            onClick={() => setPeriod('bulanan')}
          >
            Bulanan
          </button>
          <button
            className={`${styles.segBtn} ${period === 'kuartalan' ? styles.active : ''}`}
            onClick={() => setPeriod('kuartalan')}
          >
            Kuartalan
          </button>
        </div>
      </Card.Header>
      <Card.Body>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: actualColor }} />
          Realisasi aktual
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchDashed} style={{ color: idealColor, width: 14 }} />
          Kurva ideal
        </span>
      </div>
      <div className={styles.chartWrap}>
        <Line data={data} options={options} />
      </div>
      </Card.Body>
    </Card>
  );
}
