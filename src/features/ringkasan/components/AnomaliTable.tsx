"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { AnomaliDetail } from '../lib/ringkasanData';
import { ANOMALI_LABEL, type AnomaliJenis } from '@/lib/anomali';
import { fmtRupiah, fmtInt } from '@/lib/format';
import styles from './AnomaliTable.module.css';

const PER_PAGE = 5;

const jenisClass: Record<AnomaliJenis, string> = {
  tanpa_rup: styles.jTanpaRup,
  lebih_pagu: styles.jLebihPagu,
};

export function AnomaliTable({ rows }: { rows: AnomaliDetail[] }) {
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  if (rows.length === 0) return null;

  // Paginasi murni urusan layar. Cetak Laporan tidak lagi membaca tabel ini
  // dari DOM — ia menyusun ulang seluruh baris dari agregat — jadi tidak ada
  // lagi mode 'bentangkan semua' yang harus dinyalakan sebelum mencetak.
  const perPage = PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);
  const showBody = isOpen;

  return (
    <div className={styles.card}>
      <button 
        type="button"
        className={styles.headBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={showBody}
      >
        <div className={styles.headTitleWrap}>
          <span className={styles.title}>Rincian Paket Anomali</span>
          <span className={styles.count}>{fmtInt(rows.length)} paket</span>
        </div>
        {showBody ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showBody && (
        <div className={styles.body}>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.no}>#</th>
                  <th>Paket</th>
                  <th>Satker / PPK</th>
                  <th className={styles.num}>Pagu</th>
                  <th className={styles.num}>Realisasi</th>
                  <th>Jenis</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const sev = r.jenis.includes('tanpa_rup') ? styles.rowCritical : styles.rowSerious;
                  return (
                    <tr key={`${r.kd_rup}-${start + i}`} className={sev}>
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
                      <td className={`${styles.num} ${styles.mono} ${r.total > r.pagu ? styles.over : ''}`}>{fmtRupiah(r.total)}</td>
                      <td>
                        <div className={styles.jenisWrap}>
                          {r.jenis.map((j) => (
                            <span key={j} className={`${styles.jenis} ${jenisClass[j]}`}>{ANOMALI_LABEL[j]}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
      )}
    </div>
  );
}
