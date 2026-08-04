"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { supabase } from '@/lib/supabase';
import { fmtRupiah } from '@/lib/format';
import Link from 'next/link';
import styles from './PpkNotificationBell.module.css';

interface NotifItem {
  kd_rup: string;
  nama_paket: string | null;
  pagu: number | null;
  execution_status: string;
  kategori: string;
}

type FetchState = 'idle' | 'ready' | 'error';

const RISIKO_PATH = '/risiko-pengadaan';
/** Diambil lebih banyak dari yang ditampilkan supaya urutan keparahan dihitung di klien. */
const FETCH_LIMIT = 20;
const DISPLAY_LIMIT = 5;
/** Data risiko dihitung ulang lewat /api/risiko/recalculate, bukan realtime — polling lima menit cukup. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Paket yang belum jalan DAN berisiko tinggi harus tampil di atas paket yang cuma kena satu kondisi. */
function severity(item: NotifItem): number {
  const belum = item.execution_status === 'BELUM_DILAKSANAKAN';
  const tinggi = item.kategori === 'TINGGI';
  if (belum && tinggi) return 2;
  if (tinggi) return 1;
  return 0;
}

export function PpkNotificationBell() {
  const session = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<FetchState>('idle');
  /** Hanya untuk pengambilan ulang yang dipicu pengguna (buka dropdown / tombol coba lagi). */
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** Penanda request terakhir — respons yang datang telat dari request lama diabaikan. */
  const requestIdRef = useRef(0);

  const isPpk = session.role === 'ppk';
  // ppk_name adalah kolom yang dicocokkan ke risiko_pengadaan.nama_ppk; full_name hanya
  // cadangan untuk profil lama yang belum tertaut. Di-trim karena data master PBJ kerap
  // membawa spasi ekstra di ujung nama.
  const ppkName = useMemo(
    () => (session.ppk_name || session.full_name || '').trim(),
    [session.ppk_name, session.full_name]
  );

  const fetchData = useCallback(async () => {
    if (!isPpk || !ppkName) return;

    // Sengaja tidak ada setState sinkron di sini: fetchData dipanggil langsung dari
    // dalam useEffect, dan setState sinkron di badan efek memicu render berantai.
    const requestId = ++requestIdRef.current;

    const { data, error, count } = await supabase
      .from('risiko_pengadaan')
      .select('kd_rup, nama_paket, pagu, execution_status, kategori', { count: 'exact' })
      .eq('nama_ppk', ppkName)
      .or('execution_status.eq.BELUM_DILAKSANAKAN,kategori.eq.TINGGI')
      // nullsFirst wajib false: default Postgres untuk DESC adalah NULLS FIRST, sehingga
      // paket tanpa pagu justru menempati puncak daftar "pagu terbesar".
      .order('pagu', { ascending: false, nullsFirst: false })
      .limit(FETCH_LIMIT);

    if (requestId !== requestIdRef.current) return;

    if (error) {
      console.error('[PpkNotificationBell] gagal memuat peringatan paket:', error);
      setState('error');
      return;
    }

    const rows = ((data ?? []) as NotifItem[])
      .slice()
      .sort((a, b) => severity(b) - severity(a) || (b.pagu ?? 0) - (a.pagu ?? 0));

    setItems(rows.slice(0, DISPLAY_LIMIT));
    setTotalCount(count ?? rows.length);
    setState('ready');
  }, [isPpk, ppkName]);

  /** Pembungkus untuk pemicu dari event handler, supaya spinner muncul saat pengguna menunggu. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  // Muat awal, lalu segarkan saat tab kembali aktif dan tiap interval — data risiko
  // berubah setelah admin menjalankan recalculate, bukan lewat aksi pengguna di sini.
  useEffect(() => {
    if (!isPpk || !ppkName) return;

    fetchData();

    const onFocus = () => fetchData();
    const timer = window.setInterval(fetchData, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [isPpk, ppkName, fetchData]);

  const close = useCallback((returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    // Topbar menyembunyikan diri (translateY(-150%)) saat halaman digulir ke bawah dan
    // membawa serta dropdown ini. Menutupnya lebih jujur daripada membiarkannya terbang.
    const handleScroll = () => close();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, close]);

  // Rutenya /risiko-pengadaan (lihat nav.ts) — bukan /risiko, yang tidak ada dan berujung 404.
  // Query p = filter PPK dan q = pencarian, sesuai kontrak useOrgFilters.
  const riskHref = useCallback(
    (kdRup?: string) => {
      const params = new URLSearchParams();
      if (ppkName) params.set('p', ppkName);
      if (kdRup) params.set('q', kdRup);
      const qs = params.toString();
      return qs ? `${RISIKO_PATH}?${qs}` : RISIKO_PATH;
    },
    [ppkName]
  );

  if (!isPpk) return null;

  const hasAlerts = state === 'ready' && totalCount > 0;
  const badgeLabel = totalCount > 99 ? '99+' : String(totalCount);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    // Segarkan tiap kali dibuka supaya isi dropdown bukan sisa data saat halaman dimuat.
    if (next) refresh();
  };

  // Daftar lama tetap ditampilkan selama penyegaran; spinner hanya untuk keadaan kosong.
  const showLoading = items.length === 0 && (state === 'idle' || refreshing);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.bellBtn} ${isOpen ? styles.active : ''} ${hasAlerts ? styles.hasUnread : ''}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="ppk-notif-dropdown"
        aria-label={
          hasAlerts
            ? `Peringatan paket: ${totalCount} paket perlu perhatian`
            : 'Peringatan paket'
        }
      >
        <Bell size={18} className={styles.bellIcon} aria-hidden="true" />
        {hasAlerts && (
          <span className={styles.badge} aria-hidden="true">
            {badgeLabel}
          </span>
        )}
        {state === 'error' && <span className={styles.badgeError} aria-hidden="true" />}
      </button>

      {isOpen && (
        <div
          id="ppk-notif-dropdown"
          className={styles.dropdown}
          role="dialog"
          aria-label="Perhatian PPK"
        >
          <div className={styles.header}>
            <h3 className={styles.headerTitle}>Perhatian PPK</h3>
            {hasAlerts && <span className={styles.headerCount}>{totalCount} Paket</span>}
          </div>

          <div className={styles.content}>
            {!ppkName ? (
              <div className={styles.empty}>
                <div className={`${styles.emptyIconWrap} ${styles.warnIconWrap}`}>
                  <AlertTriangle size={28} />
                </div>
                <span className={styles.emptyText}>
                  Profil Anda belum tertaut ke nama PPK, jadi peringatan paket belum bisa
                  ditampilkan. Hubungi admin untuk melengkapinya.
                </span>
              </div>
            ) : showLoading ? (
              <div className={styles.loading}>
                <Loader2 size={24} className={styles.spin} aria-hidden="true" />
                <span>Memuat data...</span>
              </div>
            ) : state === 'error' ? (
              <div className={styles.empty}>
                <div className={`${styles.emptyIconWrap} ${styles.errorIconWrap}`}>
                  <AlertTriangle size={28} />
                </div>
                <span className={styles.emptyText}>
                  Gagal memuat peringatan paket. Periksa koneksi Anda lalu coba lagi.
                </span>
                <button type="button" className={styles.retryBtn} onClick={refresh} disabled={refreshing}>
                  <RefreshCw size={14} aria-hidden="true" className={refreshing ? styles.spin : undefined} />
                  Coba lagi
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIconWrap}>
                  <CheckCircle2 size={28} />
                </div>
                <span className={styles.emptyText}>
                  Semua paket di bawah pantauan Anda dalam kondisi aman dan sudah berjalan!
                </span>
              </div>
            ) : (
              items.map((item) => (
                <Link
                  href={riskHref(item.kd_rup)}
                  key={item.kd_rup}
                  prefetch={false}
                  className={styles.item}
                  onClick={() => close()}
                >
                  <div className={styles.itemHeader}>
                    <p className={styles.itemName} title={item.nama_paket ?? undefined}>
                      {item.nama_paket || 'Tanpa Nama'}
                    </p>
                  </div>
                  <div className={styles.itemTags}>
                    {item.execution_status === 'BELUM_DILAKSANAKAN' && (
                      <span className={`${styles.tag} ${styles.tagWarning}`}>Belum Dilaksanakan</span>
                    )}
                    {item.kategori === 'TINGGI' && (
                      <span className={`${styles.tag} ${styles.tagDanger}`}>Risiko Tinggi</span>
                    )}
                  </div>
                  <div className={styles.itemFooter}>
                    <span>{item.kd_rup}</span>
                    <span className={styles.itemPagu}>{fmtRupiah(item.pagu ?? 0)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {items.length > 0 && state !== 'error' && (
            <div className={styles.footer}>
              <Link href={riskHref()} prefetch={false} className={styles.viewAllBtn} onClick={() => close()}>
                {totalCount > items.length
                  ? `Lihat semua ${totalCount} paket di Risiko Pengadaan`
                  : 'Lihat Semua di Risiko Pengadaan'}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
