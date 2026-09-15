"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Clock, BarChart3 } from 'lucide-react';
import type { KurasiAggregate, MetodeAggregate } from '../lib/ringkasanData';
import { fmtInt, fmtPct } from '@/lib/format';
import { KurasiMetodeChart } from './charts/KurasiMetodeChart';
import { useSession } from '@/components/auth/SessionProvider';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import styles from './KurasiAkurasi.module.css';

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

// fmtInt sendiri TIDAK membulatkan (langsung toLocaleString) -- aman untuk nilai
// yang sudah pasti bulat, tapi <AnimatedNumber> memberi nilai PECAHAN di
// tengah hitungan (mis. 41,7 saat menuju 42), dan tanpa pembulatan itu akan
// tercetak sebagai "41,7" (koma desimal id-ID terbaca seperti pemisah ribuan
// lain). Bulatkan dulu di sini supaya yang tampil selalu bilangan bulat.
const fmtIntBulat = (n: number) => fmtInt(Math.round(n));

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
  const { role } = useSession();

  const runCuration = async () => {
    setIsLoading(true);
    setIsAutoRunning(true);
    stopRef.current = false;
    setMessage('Memulai kurasi otomatis...');
    let totalProcessed = 0;
    let consecutiveRateLimits = 0;
    let consecutiveNoProgress = 0;
    const MAX_CONSECUTIVE_RATE_LIMITS = 3;
    // Batas ronde tanpa progres berturut-turut (mis. semua hasil AI di ronde itu tidak
    // konsisten — lihat detectStatusConflict di route.ts) — mencegah loop tak berhenti
    // kalau ada baris yang terus-menerus gagal konsisten.
    const MAX_CONSECUTIVE_NO_PROGRESS = 3;

    while (!stopRef.current) {
      try {
        const res = await fetch('/api/kurasi', { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
          consecutiveRateLimits = 0;
          const updated = data.updated_count ?? 0;
          totalProcessed += updated;

          if (data.no_more_data) {
            setMessage(`Selesai! Tidak ada lagi data yang perlu dikurasi. (Total berhasil dikurasi: ${totalProcessed} paket)`);
            break;
          }

          if (updated === 0) {
            consecutiveNoProgress += 1;
            if (consecutiveNoProgress >= MAX_CONSECUTIVE_NO_PROGRESS) {
              setMessage(`Dihentikan: ${data.conflicted?.length ?? 0} data terus menghasilkan status yang tidak konsisten (catatan vs tag berbeda). Coba jalankan kurasi lagi nanti. Total berhasil: ${totalProcessed} paket.`);
              break;
            }
          } else {
            consecutiveNoProgress = 0;
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

  // Cincin dan stack bar sudah punya CSS transition pada stroke-dashoffset/width
  // (lihat KurasiAkurasi.module.css) -- itu cukup untuk animasi saat NILAINYA
  // berubah (filter diganti), tapi TIDAK cukup untuk render pertama: React
  // langsung mem-paint di nilai akhir sejak mount, tidak ada "keadaan sebelum"
  // untuk ditransisikan dari situ. `entered` menunda satu frame supaya mount
  // pertama benar-benar mulai dari 0% dulu, baru CSS transition membawanya naik.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Card>
      <Card.Header className={styles.head}>
        <Card.Icon tone="neutral"><Sparkles /></Card.Icon>
        <div className={styles.titleWrap}>
          <Card.Title>Akurasi Rencana Umum Pengadaan</Card.Title>
          <p className={styles.sub}>Kualitas metode pemilihan terhadap pagu &amp; jenis pengadaan</p>
        </div>
        <div className={styles.actions}>
          {role === 'admin' && (
            <>
              {isAutoRunning && (
                <button className={`${styles.btn} ${styles.btnStop}`} onClick={stopCuration}>
                  Hentikan
                </button>
              )}
              <button className={`${styles.btn} ${styles.btnRun}`} onClick={runCuration} disabled={isLoading}>
                {isLoading ? <Loader2 size={15} className={styles.spin} /> : <Sparkles size={15} />}
                {isLoading ? 'AI Bekerja...' : 'Jalankan Kurasi'}
              </button>
            </>
          )}
        </div>
      </Card.Header>

      <Card.Body className={`${styles.mainLayout} ${isFullWidth ? styles.mainLayoutFullWidth : ''}`}>
        <div className={styles.body}>
          <div className={styles.ringWrap}>
            <svg viewBox="0 0 130 130" className={styles.ring} role="img" aria-label={`Akurasi ${fmtPct(pctAkurasi)}`}>
              <defs>
                <linearGradient id="kurasiRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1FA89A" />
                  <stop offset="100%" stopColor="#27B6D6" />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r={RING_R} className={styles.ringTrack} fill="transparent" strokeWidth="11" stroke="var(--surface-2, #e2e8f0)" />
              <circle
                cx="65"
                cy="65"
                r={RING_R}
                className={styles.ringValue}
                fill="transparent"
                strokeWidth="11"
                stroke="url(#kurasiRingGrad)"
                style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - (entered ? pctAkurasi : 0) / 100) }}
                transform="rotate(-90 65 65)"
              />
            </svg>
            <div className={styles.ringCenter}>
              <span className={styles.ringPct}>
                <AnimatedNumber value={pctAkurasi} format={(n) => fmtPct(n, 1)} />
              </span>
              <span className={styles.ringLabel}>Akurasi</span>
            </div>
          </div>

          <div className={styles.statsCol}>
            <div className={styles.stackBar} role="img" aria-label="Distribusi status kurasi">
              <span className={styles.segAkurat} style={{ width: `${entered ? wAkurat : 0}%` }} title={`Akurat: ${fmtInt(akurat)}`} />
              <span className={styles.segKoreksi} style={{ width: `${entered ? wKoreksi : 0}%` }} title={`Perlu koreksi: ${fmtInt(perluKoreksi)}`} />
              <span className={styles.segBelum} style={{ width: `${entered ? wBelum : 0}%` }} title={`Belum dikurasi: ${fmtInt(belumDikurasi)}`} />
            </div>
            <p className={styles.progressNote}>
              <AnimatedNumber value={pctSelesai} format={(n) => fmtPct(n, 1)} /> paket telah dievaluasi AI
            </p>

            <div className={styles.numGrid}>
              <div className={styles.numCard} title="Jumlah paket yang sudah punya keputusan Akurat atau Tidak Akurat">
                <span className={styles.numVal}><AnimatedNumber value={kurasi.totalDikurasi} format={fmtIntBulat} /></span>
                <span className={styles.numLabel}>Total Dikurasi</span>
              </div>
              <div className={`${styles.numCard} ${styles.nGood}`} title="Metode pemilihan sesuai batas nilai & jenis pengadaan (Perpres 12/2021)">
                <span className={styles.numVal}><CheckCircle2 size={13} /> <AnimatedNumber value={akurat} format={fmtIntBulat} /></span>
                <span className={styles.numLabel}>Akurat</span>
              </div>
              <div className={`${styles.numCard} ${styles.nBad}`} title="Metode melanggar batas nilai untuk jenis pengadaannya">
                <span className={styles.numVal}><AlertTriangle size={13} /> <AnimatedNumber value={perluKoreksi} format={fmtIntBulat} /></span>
                <span className={styles.numLabel}>Perlu Koreksi</span>
              </div>
              <div className={`${styles.numCard} ${styles.nWait}`} title="Belum dievaluasi atau data tidak cukup untuk dinilai">
                <span className={styles.numVal}><Clock size={13} /> <AnimatedNumber value={belumDikurasi} format={fmtIntBulat} /></span>
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

        {message && <div className={styles.msg}>{message}</div>}
      </Card.Body>
    </Card>
  );
}
