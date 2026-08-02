'use client';

import Image from 'next/image';
import styles from './LandingSplash.module.css';

const BRAND = 'DEWA-PBJ';

type Props = {
  /** Dipanggil saat overlay mulai memudar — konten landing boleh muncul. */
  onExitStart: () => void;
  /** Dipanggil saat overlay selesai memudar — aman dilepas dari DOM. */
  onExitEnd: () => void;
};

export function LandingSplash({ onExitStart, onExitEnd }: Props) {
  // `.splash` hanya punya satu animasi (splashOut); saring event yang
  // menggelembung dari anak-anaknya lewat perbandingan target.
  const isOwnAnimation = (event: React.AnimationEvent) => event.target === event.currentTarget;

  return (
    <div
      className={styles.splash}
      role="status"
      aria-label="Memuat DEWA-PBJ"
      onAnimationStart={(e) => isOwnAnimation(e) && onExitStart()}
      onAnimationEnd={(e) => isOwnAnimation(e) && onExitEnd()}
    >
      <span className={styles.glow} aria-hidden />

      <div className={styles.stage} aria-hidden>
        {/* Urutan cerita: kementerian dan unit kerjanya lebih dulu, baru
            sistemnya. Sama seperti logo studio yang mendahului filmnya. */}
        <div className={styles.authority}>
          <Image
            src="/logo/kemnaker-putih.png"
            alt="Kementerian Ketenagakerjaan Republik Indonesia"
            width={461}
            height={158}
            className={styles.authKemnaker}
            priority
          />

          <span className={styles.authRule} />

          <Image
            src="/logo/ukpbj-putih.png"
            alt="Unit Kerja Pengadaan Barang dan Jasa Kementerian Ketenagakerjaan"
            width={900}
            height={259}
            className={styles.authUkpbj}
            priority
          />
        </div>

        {/* Menandai serah terima dari pihak berwenang ke sistemnya. */}
        <span className={styles.handoff} />

        <span className={styles.mark}>
          <svg viewBox="0 0 100 100" className={styles.markSvg}>
            <circle className={styles.markRing} cx="50" cy="50" r="42" />
            <circle className={styles.markCore} cx="50" cy="50" r="11" />
          </svg>
          <span className={styles.markPulse} />
        </span>

        <div className={styles.wordmark}>
          {BRAND.split('').map((char, i) => (
            <span key={i} className={styles.letter} style={{ '--i': i } as React.CSSProperties}>
              {char}
            </span>
          ))}
        </div>

        <p className={styles.tagline}>Digital Early Warning Analytics</p>

        <span className={styles.progress}>
          <i />
        </span>
      </div>
    </div>
  );
}
