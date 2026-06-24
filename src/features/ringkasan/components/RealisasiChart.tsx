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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
  const idealColor = isDark ? '#9098AC' : '#8B92A0';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139,146,160,0.15)';
  const tickColor = isDark ? '#9CA3B8' : '#5B6472';

  const data = period === 'bulanan' ? {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
    datasets: [
      { label: 'Realisasi aktual', data: [4, 9, 16, 22, 27, 31], borderColor: actualColor, backgroundColor: actualColor, borderWidth: 2, pointRadius: 3, tension: 0.3 },
      { label: 'Kurva ideal', data: [5, 11, 19, 28, 36, 44], borderColor: idealColor, backgroundColor: idealColor, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, tension: 0.3 }
    ]
  } : {
    labels: ['Q1', 'Q2'],
    datasets: [
      { label: 'Realisasi aktual', data: [16, 31], borderColor: actualColor, backgroundColor: actualColor, borderWidth: 2, pointRadius: 3, tension: 0.3 },
      { label: 'Kurva ideal', data: [19, 44], borderColor: idealColor, backgroundColor: idealColor, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, tension: 0.3 }
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
    <Card style={{ marginBottom: 26, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
          Realisasi belanja vs kurva ideal
        </p>
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <button 
            style={{ fontSize: 12, padding: '6px 14px', border: 'none', background: period === 'bulanan' ? 'var(--info-600)' : 'var(--surface)', color: period === 'bulanan' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setPeriod('bulanan')}
          >
            Bulanan
          </button>
          <button 
            style={{ fontSize: 12, padding: '6px 14px', border: 'none', background: period === 'kuartalan' ? 'var(--info-600)' : 'var(--surface)', color: period === 'kuartalan' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setPeriod('kuartalan')}
          >
            Kuartalan
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 12px' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 5, verticalAlign: '-1px', background: actualColor }}></span>Realisasi aktual</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 5, verticalAlign: '-1px', background: idealColor }}></span>Kurva ideal</span>
      </div>
      <div style={{ position: 'relative', height: 230 }}>
        <Line data={data} options={options} />
      </div>
    </Card>
  );
}
