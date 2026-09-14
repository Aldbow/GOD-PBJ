'use client';

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { LandingSplash } from './LandingSplash';
import styles from './LandingIntro.module.css';

/** Saat konten mulai muncul dan splash mulai menghilang (ms sejak mount). */
const REVEAL_AT = 3800;
/** Batas aman melepas overlay dari DOM bila event animasi tidak sampai. */
const UNMOUNT_AT = 5400;

const RevealContext = createContext(true);

/** True bila konten landing sudah boleh menjalankan animasi masuknya. */
export function useLandingReveal() {
  return useContext(RevealContext);
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function LandingIntro({ children }: { children: ReactNode }) {
  const [splashMounted, setSplashMounted] = useState(true);
  const [revealed, setRevealed] = useState(false);

  // Kunci scroll selama splash masih menutupi halaman.
  useIsomorphicLayoutEffect(() => {
    if (revealed) return;

    const root = document.documentElement;
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      root.style.overflow = prevRootOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [revealed]);

  // Cadangan bila animasi CSS sudah lewat sebelum komponen ini terhidrasi,
  // sehingga onAnimationStart/End dari splash tidak pernah tertangkap React.
  useEffect(() => {
    const revealTimer = window.setTimeout(() => setRevealed(true), REVEAL_AT);
    const unmountTimer = window.setTimeout(() => setSplashMounted(false), UNMOUNT_AT);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(unmountTimer);
    };
  }, []);

  return (
    <RevealContext.Provider value={revealed}>
      <div style={{ '--splash-reveal': `${REVEAL_AT}ms` } as CSSProperties}>
        {splashMounted && (
          <LandingSplash
            onExitStart={() => setRevealed(true)}
            onExitEnd={() => setSplashMounted(false)}
          />
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </RevealContext.Provider>
  );
}
