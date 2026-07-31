'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import styles from './LandingHeader.module.css';

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} />
          <span className={styles.brandName}>DEWA-PBJ</span>
        </Link>

        <nav className={styles.nav}>
          <a href="#modul" className={styles.navLink}>Modul</a>
        </nav>

        <Link href="/login" className={styles.loginBtn}>
          Masuk
          <ArrowRight size={15} />
        </Link>
      </div>
    </header>
  );
}
