'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MasterDataPN } from '@/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { parseIndonesianNumber } from '../utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardChartsProps {
  data: MasterDataPN[];
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const { barData } = useMemo(() => {
    // 1. Prepare Bar Chart Data (Pagu vs Realisasi per Program/RO - Top 5)
    const programMap: Record<string, { pagu: number; realisasi: number }> = {};

    data.forEach(item => {
      // Program processing (using Nama RO instead of Unit)
      const namaRO = item['Nama RO'] || 'Unknown Program';
      const pagu = parseIndonesianNumber(item['Pagu (Capaian)']);
      const realisasi = parseIndonesianNumber(item['Realisasi Anggaran']);

      if (!programMap[namaRO]) {
        programMap[namaRO] = { pagu: 0, realisasi: 0 };
      }
      programMap[namaRO].pagu += pagu;
      programMap[namaRO].realisasi += realisasi;
    });

    // Sort programs by Pagu descending and take top 5
    const sortedPrograms = Object.entries(programMap)
      .sort((a, b) => b[1].pagu - a[1].pagu)
      .slice(0, 5);

    // To make it look aesthetic on horizontal bar, we should chunk the strings if they are too long
    // so they wrap on the y-axis labels. Chart.js accepts arrays for multi-line labels.
    const formatLabel = (label: string) => {
      const maxLen = 40;
      if (label.length <= maxLen) return label;
      
      const words = label.split(' ');
      let currentLine = '';
      const lines = [];
      
      for (const word of words) {
        if ((currentLine + word).length > maxLen) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      }
      if (currentLine) lines.push(currentLine.trim());
      
      return lines;
    };

    const barChartData = {
      labels: sortedPrograms.map(u => formatLabel(u[0])),
      datasets: [
        {
          label: 'Pagu',
          data: sortedPrograms.map(u => u[1].pagu),
          backgroundColor: 'rgba(13, 148, 136, 0.8)', // teal-600
          borderRadius: 4,
        },
        {
          label: 'Realisasi',
          data: sortedPrograms.map(u => u[1].realisasi),
          backgroundColor: 'rgba(2, 132, 199, 0.8)', // info-600
          borderRadius: 4,
        }
      ],
    };

    return { barData: barChartData };
  }, [data]);

  const barOptions = {
    indexAxis: 'y' as const, // Makes the bar chart horizontal
    responsive: true,
    maintainAspectRatio: false,
    color: '#9ca3af', // Global default font color for this chart
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          color: '#9ca3af', // Set legend text color
          font: {
            weight: 500
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { dataset: { label?: string }; parsed: { x: number | null } }) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.x !== null) {
              label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.parsed.x);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)' // subtle grid color
        },
        ticks: {
          color: '#9ca3af',
          font: {
            weight: 500
          },
          callback: function(value: string | number) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (numValue >= 1000000000) return (numValue / 1000000000).toFixed(1) + ' M';
            if (numValue >= 1000000) return (numValue / 1000000).toFixed(1) + ' Juta';
            return numValue;
          }
        }
      },
      y: {
        grid: {
          display: false // hide y grid for cleaner look
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
            weight: 500
          }
        }
      }
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '32px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border)',
          minHeight: '450px', // Increased height to give horizontal bars room
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Top 5 Program Prioritas Nasional (Pagu vs Realisasi)
        </h3>
        <div style={{ flex: 1, position: 'relative' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </motion.div>
    </div>
  );
}
