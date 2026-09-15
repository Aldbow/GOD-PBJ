"use client";

import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  /** Nilai akhir yang dituju. */
  value: number;
  /** Ubah angka mentah jadi teks tampilan (mis. fmtInt, fmtRupiahPenuh). */
  format?: (n: number) => string;
  /** Detik. Nilai besar (miliaran rupiah) tetap kena durasi yang sama --
   * count-up ini soal kesan "hidup", bukan mensimulasikan kecepatan hitung. */
  duration?: number;
}

/**
 * Angka yang menghitung naik/turun secara halus ke `value` setiap kali nilainya
 * berubah -- dari 0 saat pertama kali dipasang (mis. kartu KPI baru selesai
 * loading), atau dari nilai sebelumnya saat filter berganti (bukan lompat).
 *
 * `displayRef` (bukan `value` sebelumnya) yang jadi titik awal animasi
 * berikutnya, supaya kalau `value` berubah lagi sebelum animasi sebelumnya
 * selesai, hitungannya melanjutkan dari angka yang SEDANG terlihat di layar --
 * tidak melompat balik ke target lama dulu baru lanjut.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toString(),
  duration = 1.1,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    // Reduced motion: tidak ada apa pun untuk disinkronkan lewat efek ini --
    // render di bawah langsung memakai `value` mentah, tanpa animasi.
    if (reduce) return;
    const controls = animate(displayRef.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // exponential ease-out, sama seperti --ease-out di globals.css
      onUpdate: (v) => {
        displayRef.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <>{format(reduce ? value : display)}</>;
}
