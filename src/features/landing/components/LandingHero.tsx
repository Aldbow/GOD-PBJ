'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  Zap,
  ShieldCheck,
  TrendingUp,
  LayoutDashboard,
  ShieldAlert,
  ShoppingCart,
  GraduationCap,
} from 'lucide-react';
import { useLandingReveal } from './LandingIntro';
import styles from './LandingHero.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12 + 0.15, duration: 0.7, ease: EASE },
  }),
};

const CHART_BARS = [38, 56, 46, 70, 52, 88, 64];

type Particle = { top: string; left: string; size: number; dur: number; delay: number };

const PARTICLES: Particle[] = [
  { top: '18%', left: '38%', size: 3, dur: 5.5, delay: 0 },
  { top: '32%', left: '52%', size: 2, dur: 6.5, delay: 0.8 },
  { top: '12%', left: '62%', size: 3, dur: 5, delay: 1.6 },
  { top: '48%', left: '30%', size: 2, dur: 7, delay: 0.4 },
  { top: '60%', left: '68%', size: 3, dur: 6, delay: 2.2 },
  { top: '25%', left: '20%', size: 2, dur: 5.8, delay: 1.2 },
  { top: '70%', left: '45%', size: 2, dur: 6.8, delay: 2.8 },
  { top: '8%', left: '48%', size: 3, dur: 5.2, delay: 1.9 },
];

function DashboardMockup() {
  return (
    <div className={styles.dashMockup}>
      <div className={styles.dashTopbar}>
        <span className={styles.dashDot} data-c="red" />
        <span className={styles.dashDot} data-c="amber" />
        <span className={styles.dashDot} data-c="brand" />
        <span className={styles.dashUrl}>dewa-pbj.app/ringkasan</span>
      </div>

      <div className={styles.dashBody}>
        <div className={styles.dashSidebar}>
          <span className={`${styles.dashSidebarIcon} ${styles.dashSidebarIconActive}`}>
            <LayoutDashboard size={13} />
          </span>
          <span className={styles.dashSidebarIcon}>
            <ShieldAlert size={13} />
          </span>
          <span className={styles.dashSidebarIcon}>
            <ShoppingCart size={13} />
          </span>
          <span className={styles.dashSidebarIcon}>
            <GraduationCap size={13} />
          </span>
        </div>

        <div className={styles.dashMain}>
          <div className={styles.dashKpiRow}>
            <div className={styles.dashKpi}>
              <span className={styles.dashKpiValue} data-c="brand">92%</span>
              <span className={styles.dashKpiLabel}>Realisasi</span>
            </div>
            <div className={styles.dashKpi}>
              <span className={styles.dashKpiValue} data-c="indigo">128</span>
              <span className={styles.dashKpiLabel}>Paket</span>
            </div>
            <div className={styles.dashKpi}>
              <span className={styles.dashKpiValue} data-c="amber">7</span>
              <span className={styles.dashKpiLabel}>Risiko</span>
            </div>
          </div>

          <div className={styles.dashChartPanel}>
            <div className={styles.dashChart}>
              {CHART_BARS.map((h, i) => (
                <span
                  key={i}
                  className={styles.dashBar}
                  data-peak={i === CHART_BARS.length - 2 || undefined}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className={styles.dashGauge}>
              <div className={styles.dashGaugeRing} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  const parallaxRef = useRef<HTMLDivElement>(null);
  // Entrance hero ditahan sampai splash mengangkat, supaya stagger-nya terlihat.
  const animate = useLandingReveal() ? 'visible' : 'hidden';

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const handleMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty('--px', `${x * 22}px`);
        el.style.setProperty('--py', `${y * 16}px`);
      });
    };

    window.addEventListener('pointermove', handleMove);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.gradientBg} aria-hidden>
        <div ref={parallaxRef} className={styles.parallaxLayer}>
          <span className={styles.blob1} />
          <span className={styles.blob2} />
          <span className={styles.blob3} />
        </div>
        <span className={styles.aurora} />
        <div className={styles.particles}>
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className={styles.particle}
              style={
                {
                  '--py2': p.top,
                  '--px2': p.left,
                  '--size': `${p.size}px`,
                  '--dur': `${p.dur}s`,
                  '--delay': `${p.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <span className={styles.gridOverlay} />
      </div>

      <div className={styles.inner}>
        <div className={styles.left}>
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate={animate} className={styles.badge}>
            <Zap size={14} />
            <span>Sistem Peringatan Dini Pengadaan Barang/Jasa</span>
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate={animate} className={styles.title}>
            Digital Early Warning
            <br />
            <span className={styles.titleAccent}>Analytics </span>
          </motion.h1>

          <motion.div custom={3} variants={fadeUp} initial="hidden" animate={animate} className={styles.actions}>
            <Link href="/login" className={styles.primaryBtn}>
              Masuk ke Sistem
              <ArrowRight size={17} />
            </Link>
            <a href="#modul" className={styles.secondaryBtn}>
              Modul
              <ChevronDown size={16} />
            </a>
          </motion.div>
        </div>

        <motion.div custom={2} variants={fadeUp} initial="hidden" animate={animate} className={styles.right}>
          <div className={styles.isoWrap}>
            <div className={styles.dashGlow} aria-hidden />
            <div className={styles.dashStage}>
              <DashboardMockup />
              <div className={styles.isoFloatCard}>
                <ShieldCheck size={15} />
                <span>Risiko Terpantau</span>
              </div>
              <div className={styles.isoFloatCard2}>
                <TrendingUp size={15} />
                <span>Realisasi Terkendali</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <a href="#modul" className={styles.scrollCue}>
        <span>Scroll</span>
        <ChevronDown size={18} />
      </a>
    </section>
  );
}
