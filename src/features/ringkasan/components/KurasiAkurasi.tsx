"use client";

import React, { useRef, useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Clock, BarChart3 } from 'lucide-react';
import type { KurasiAggregate, MetodeAggregate } from '../lib/ringkasanData';
import { fmtInt, fmtPct } from '@/lib/format';
import { KurasiMetodeChart } from './charts/KurasiMetodeChart';
import styles from './KurasiAkurasi.module.css';

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

interface Props {
  kurasi: KurasiAggregate;
  metode: MetodeAggregate[];
  onRefresh: () => void | Promise<void>;
  isFullWidth?: boolean;
}

export function KurasiAkurasi({ kurasi, metode, onRefresh, isFullWidth = false }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const stopRef = useRef(false);

  const runCuration = async () => {
    setIsLoading(true);
    setIsAutoRunning(true);
    stopRef.current = false;
    setMessage('Memulai kurasi otomatis...');
    let totalProcessed = 0;
    let consecutiveRateLimits = 0;
    const MAX_CONSECUTIVE_RATE_LIMITS = 3;

    while (!stopRef.current) {
      try {
        const res = await fetch('/api/kurasi', { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
          consecutiveRateLimits = 0;
          const updated = data.updated_count ?? 0;
          totalProcessed += updated;
          if (updated === 0) {
            setMessage(`Selesai! Tidak ada lagi data yang perlu dikurasi. (Total berhasil dikurasi: ${totalProcessed} paket)`);
            break;
          }
          setMessage(`Telah mengurasi ${totalProcessed} data. Menunggu 5 detik untuk permintaan berikutnya...`);
          await new Promise((r) => setTimeout(r, 5000));
        } else if (res.status === 429) {
          consecutiveRateLimits += 1;
          if (consecutiveRateLimits >= MAX_CONSECUTIVE_RATE_LIMITS) {
            setMessage(`Kuota Gemini API terus tercapai (kemungkinan batas harian free tier). Kurasi dihentikan. Total berhasil: ${totalProcessed} paket.`);
            break;
          }
          const waitSec = Math.min(Math.max(Number(data.retryAfterSeconds) || 35, 5), 60);
          setMessage(`Batas akses (kuota) Gemini API tercapai. Menunggu ${waitSec} detik sebelum mencoba lagi (${consecutiveRateLimits}/${MAX_CONSECUTIVE_RATE_LIMITS})...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        } else {
          setMessage(`Terjadi kesalahan: ${data.error}. Menghentikan kurasi otomatis.`);
          break;
        }
      } catch {
        setMessage('Gagal menghubungi server API. Menghentikan kurasi otomatis.');
        break;
      }
    }

    setIsLoading(false);
    setIsAutoRunning(false);
    await onRefresh();
  };

  const stopCuration = () => {
    stopRef.current = true;
    setMessage('Perintah berhenti diterima. Menunggu AI menyelesaikan paket yang sedang dikerjakan...');
  };

  const { akurat, perluKoreksi, belumDikurasi, totalPaket, pctAkurasi, pctSelesai } = kurasi;
  const segTotal = totalPaket || 1;
  const wAkurat = (akurat / segTotal) * 100;
  const wKoreksi = (perluKoreksi / segTotal) * 100;
  const wBelum = (belumDikurasi / segTotal) * 100;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>Akurasi Hasil Kurasi Paket</h3>
          <p className={styles.sub}>Kualitas metode pemilihan terhadap pagu &amp; jenis pengadaan</p>
        </div>
        <div className={styles.actions}>
          {isAutoRunning && (
            <button className={`${styles.btn} ${styles.btnStop}`} onClick={stopCuration}>
              Hentikan
            </button>
          )}
          <button className={`${styles.btn} ${styles.btnRun}`} onClick={runCuration} disabled={isLoading}>
            {isLoading ? <Loader2 size={15} className={styles.spin} /> : <Sparkles size={15} />}
            {isLoading ? 'AI Bekerja...' : 'Jalankan Kurasi'}
          </button>
        </div>
      </div>

      <div className={`${styles.mainLayout} ${isFullWidth ? styles.mainLayoutFullWidth : ''}`}>
        <div className={styles.body}>
          <div className={styles.ringWrap}>
            <svg viewBox="0 0 130 130" className={styles.ring} role="img" aria-label={`Akurasi ${fmtPct(pctAkurasi)}`}>
              <defs>
                <linearGradient id="kurasiRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1FA89A" />
                  <stop offset="100%" stopColor="#27B6D6" />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r={RING_R} className={styles.ringTrack} />
              <circle
                cx="65"
                cy="65"
                r={RING_R}
                className={styles.ringValue}
                style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - pctAkurasi / 100) }}
                transform="rotate(-90 65 65)"
              />
            </svg>
            <div className={styles.ringCenter}>
              <span className={styles.ringPct}>{fmtPct(pctAkurasi, 1)}</span>
              <span className={styles.ringLabel}>Akurasi</span>
            </div>
          </div>

          <div className={styles.statsCol}>
            <div className={styles.stackBar} role="img" aria-label="Distribusi status kurasi">
              <span className={styles.segAkurat} style={{ width: `${wAkurat}%` }} title={`Akurat: ${fmtInt(akurat)}`} />
              <span className={styles.segKoreksi} style={{ width: `${wKoreksi}%` }} title={`Perlu koreksi: ${fmtInt(perluKoreksi)}`} />
              <span className={styles.segBelum} style={{ width: `${wBelum}%` }} title={`Belum dikurasi: ${fmtInt(belumDikurasi)}`} />
            </div>
            <p className={styles.progressNote}>{fmtPct(pctSelesai, 1)} paket telah dievaluasi AI</p>

            <div className={styles.numGrid}>
              <div className={styles.numCard} title="Jumlah paket yang sudah punya keputusan Akurat atau Tidak Akurat">
                <span className={styles.numVal}>{fmtInt(kurasi.totalDikurasi)}</span>
                <span className={styles.numLabel}>Total Dikurasi</span>
              </div>
              <div className={`${styles.numCard} ${styles.nGood}`} title="Metode pemilihan sesuai batas nilai & jenis pengadaan (Perpres 12/2021)">
                <span className={styles.numVal}><CheckCircle2 size={13} /> {fmtInt(akurat)}</span>
                <span className={styles.numLabel}>Akurat</span>
              </div>
              <div className={`${styles.numCard} ${styles.nBad}`} title="Metode melanggar batas nilai untuk jenis pengadaannya">
                <span className={styles.numVal}><AlertTriangle size={13} /> {fmtInt(perluKoreksi)}</span>
                <span className={styles.numLabel}>Perlu Koreksi</span>
              </div>
              <div className={`${styles.numCard} ${styles.nWait}`} title="Belum dievaluasi atau data tidak cukup untuk dinilai">
                <span className={styles.numVal}><Clock size={13} /> {fmtInt(belumDikurasi)}</span>
                <span className={styles.numLabel}>Belum Dikurasi</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.breakdownSection}>
          <div className={styles.breakdownHead}>
            <BarChart3 size={14} /> Breakdown Akurasi per Metode Pengadaan
          </div>
          <KurasiMetodeChart metode={metode} />
        </div>
      </div>

      {message && <div className={styles.msg}>{message}</div>}
    </div>
  );
}
