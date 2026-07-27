"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { KurasiTidakAkuratDetail } from '../lib/ringkasanData';
import { fmtRupiah, fmtInt } from '@/lib/format';
import styles from './KurasiTidakAkuratTable.module.css';

const PER_PAGE = 5;

export function KurasiTidakAkuratTable({ rows }: { rows: KurasiTidakAkuratDetail[] }) {
  const [page, setPage] = useState(1);

  if (rows.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <CheckCircle2 size={16} />
        Semua paket pada filter ini sudah berstatus Akurat.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const pageRows = rows.slice(start, start + PER_PAGE);

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>Paket Perlu Koreksi (Tidak Akurat)</span>
        <span className={styles.count}>{fmtInt(rows.length)} paket</span>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.no}>#</th>
              <th>Paket</th>
              <th>Satker / PPK</th>
              <th className={styles.num}>Pagu</th>
              <th className={styles.num}>Realisasi</th>
              <th>Catatan &amp; Rekomendasi Kurasi AI</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={`${r.kd_rup}-${start + i}`}>
                <td className={styles.no}>{start + i + 1}</td>
                <td>
                  <div className={styles.paketName} title={r.rup_name || undefined}>{r.rup_name || 'Tidak Diketahui'}</div>
                  <div className={styles.sub}>{r.metode_pengadaan || 'Lainnya'} · RUP {r.kd_rup}</div>
                </td>
                <td>
                  <div className={styles.satker} title={r.satker || undefined}>{r.satker || '-'}</div>
                  <div className={styles.sub} title={r.nama_ppk || undefined}>{r.nama_ppk || '-'}</div>
                </td>
                <td className={`${styles.num} ${styles.mono}`}>{fmtRupiah(r.pagu)}</td>
                <td className={`${styles.num} ${styles.mono}`}>{fmtRupiah(r.total)}</td>
                <td>
                  <div className={styles.catatan} title={r.catatan_kurasi || undefined}>{r.catatan_kurasi || '-'}</div>
                  {r.rekomendasi_kurasi && (
                    <div className={styles.rekomendasi} title={r.rekomendasi_kurasi}>→ {r.rekomendasi_kurasi}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span className={styles.range}>
          Menampilkan {fmtInt(start + 1)}–{fmtInt(start + pageRows.length)} dari {fmtInt(rows.length)}
        </span>
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={15} />
          </button>
          <span className={styles.pageInfo}>
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
