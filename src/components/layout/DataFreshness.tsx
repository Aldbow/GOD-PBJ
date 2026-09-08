"use client";

import React, { useSyncExternalStore } from 'react';
import styles from './DataFreshness.module.css';
import { formatExactUpdate, formatRelativeUpdate } from '@/lib/data-update/format';

/**
 * Jam dinding dengan resolusi menit, sebagai "external store" ala React.
 *
 * Kenapa useSyncExternalStore dan bukan useState + useEffect: waktu adalah
 * sumber data di luar React yang berubah sendiri. Pola setInterval yang
 * memanggil setState di badan effect ditolak eslint (react-hooks/set-state-in-effect)
 * karena memicu cascading render — dan memang di sini tidak perlu.
 */

function subscribeMenit(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/**
 * Nomor menit sejak epoch. Nilainya TETAP selama satu menit yang sama —
 * syarat wajib getSnapshot; kalau berubah tiap panggilan, React akan render
 * tanpa henti.
 */
function snapshotMenit() {
  return Math.floor(Date.now() / 60_000);
}

/**
 * Di server tidak ada "sekarang" yang sah untuk dipakai: jam server berbeda
 * dari jam browser, dan HTML hasil render bisa duduk di cache. null membuat
 * komponen tidak merender apa pun saat SSR, lalu terisi setelah hydration —
 * tanpa mismatch.
 */
function snapshotServer() {
  return null;
}

/**
 * Stempel "Diperbarui N jam lalu" di topbar.
 *
 * `finishedAt` berasal dari tabel data_update_log lewat server
 * (@/lib/data-update/lastUpdate), diteruskan AppLayout -> Shell -> Topbar.
 * Labelnya dihitung di client dan ikut segar tiap menit, jadi tab yang
 * dibiarkan terbuka lama tidak membeku di "5 menit lalu".
 */
export function DataFreshness({ finishedAt }: { finishedAt: string | null }) {
  const menit = useSyncExternalStore(subscribeMenit, snapshotMenit, snapshotServer);

  // Belum ada catatan update, atau masih di server — tidak menampilkan apa pun
  // lebih baik daripada stempel kosong yang bikin ragu.
  if (!finishedAt || menit === null) return null;

  const label = formatRelativeUpdate(finishedAt);
  if (!label) return null;

  const persis = formatExactUpdate(finishedAt);

  return (
    <span
      className={styles.freshness}
      title={persis ? 'Data pengadaan terakhir dimuat ke database pada ' + persis : undefined}
    >
      Diperbarui {label}
    </span>
  );
}
