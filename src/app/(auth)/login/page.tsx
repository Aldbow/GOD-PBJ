"use client";

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  type Variants,
} from 'framer-motion';
import { Mail, Lock, LogIn, ShieldCheck, LineChart, Radar, AlertCircle, ArrowLeft } from 'lucide-react';
import { login, type LoginState } from '@/lib/auth/actions';
import { AuthInput } from '@/components/auth/AuthInput';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import styles from './login.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const FEATURES = [
  { icon: ShieldCheck, text: 'Akses yang aman sesuai peran' },
  { icon: Radar, text: 'Deteksi dini risiko paket pengadaan' },
  { icon: LineChart, text: 'Lihat realisasi pengadaan' },
];

/** Posisi partikel deterministik (bukan Math.random) agar aman untuk SSR/hydration. */
const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = i * 2.399963; // golden-angle spread, hasil sebaran natural tanpa random
  const radius = 8 + (i * 4.6) % 46;
  return {
    id: i,
    left: 50 + Math.cos(angle) * radius,
    top: 50 + Math.sin(angle) * radius,
    size: 2 + (i % 3),
    duration: 13 + (i % 5) * 2.4,
    delay: -(i * 1.7),
  };
});

let rippleId = 0;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);
  const reduce = useReducedMotion();

  // Gerakan orb latar (dinonaktifkan saat prefers-reduced-motion)
  const floatA = reduce ? {} : { x: [0, 30, -10, 0], y: [0, -24, 12, 0], scale: [1, 1.1, 0.98, 1] };
  const floatB = reduce ? {} : { x: [0, -26, 14, 0], y: [0, 18, -14, 0], scale: [1, 0.94, 1.08, 1] };

  // ---------- Tilt 3D halus pada kartu form ----------
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 180, damping: 22 });
  const springRotateY = useSpring(rotateY, { stiffness: 180, damping: 22 });
  function handleCardPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 6);
    rotateX.set(py * -6);
  }
  function handleCardPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  // ---------- Tombol submit magnetik + ripple ----------
  const btnX = useMotionValue(0);
  const btnY = useMotionValue(0);
  const springBtnX = useSpring(btnX, { stiffness: 220, damping: 16 });
  const springBtnY = useSpring(btnY, { stiffness: 220, damping: 16 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  function handleBtnPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    btnX.set((e.clientX - rect.left - rect.width / 2) * 0.25);
    btnY.set((e.clientY - rect.top - rect.height / 2) * 0.5);
  }
  function handleBtnPointerLeave() {
    btnX.set(0);
    btnY.set(0);
  }
  function handleBtnPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = rippleId++;
    setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  }
  function removeRipple(id: number) {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className={styles.page}>
      {/* ---------- Panel brand (kiri) ---------- */}
      <aside className={styles.brandPanel}>
        {/* Aurora / orb latar */}
        <motion.span
          className={`${styles.orb} ${styles.orbBrand}`}
          animate={floatA}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className={`${styles.orb} ${styles.orbBlue}`}
          animate={floatB}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className={styles.grid} aria-hidden />
        <span className={styles.scanline} aria-hidden />
        <span className={styles.noise} aria-hidden />

        {/* Partikel data yang melayang — nuansa dashboard pemantauan */}
        <div className={styles.particles} aria-hidden>
          {PARTICLES.map((p) => (
            <motion.span
              key={p.id}
              className={styles.particle}
              style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
              animate={reduce ? {} : { y: [0, -18, 0], opacity: [0.15, 0.65, 0.15] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <motion.div
          className={styles.brandInner}
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div className={styles.brandTop} variants={item}>
            <span className={styles.brandMark} />
            <div className={styles.brandLockup}>
              <strong>DEWA-PBJ</strong>
              <span>Early warning pengadaan</span>
            </div>
          </motion.div>

          <div className={styles.brandBody}>
            <motion.span className={styles.eyebrow} variants={item}>
              <span className={styles.eyebrowDot} />
              Digital Early Warning Analytics
            </motion.span>
            <motion.h2 variants={item}>
              Pantau realisasi PBJ <em>Kementerian Ketenagakerjaan</em>.
            </motion.h2>
            <ul className={styles.points}>
              {FEATURES.map(({ icon: Icon, text }) => (
                <motion.li key={text} variants={item}>
                  <span className={styles.pointIcon}><Icon size={16} /></span>
                  {text}
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.div
            className={styles.brandFoot}
            variants={item}
          >
            <Image
              src="/logo/kemnaker-putih.png"
              alt="Kementerian Ketenagakerjaan Republik Indonesia"
              width={461}
              height={158}
              className={styles.footKemnaker}
            />
            <span className={styles.footRule} aria-hidden />
            <Image
              src="/logo/ukpbj-putih.png"
              alt="Unit Kerja Pengadaan Barang dan Jasa Kementerian Ketenagakerjaan"
              width={900}
              height={259}
              className={styles.footUkpbj}
            />
          </motion.div>
        </motion.div>
      </aside>

      {/* ---------- Form (kanan) ---------- */}
      <main className={styles.formPanel}>
        <span className={`${styles.orb} ${styles.orbSoft}`} aria-hidden />

        <div className={styles.topBar}>
          <ThemeToggle />
        </div>

        <motion.div
          className={styles.cardWrap}
          variants={container}
          initial="hidden"
          animate="show"
          style={{ rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 1200 }}
          onPointerMove={handleCardPointerMove}
          onPointerLeave={handleCardPointerLeave}
        >
          <div className={styles.card}>
            <motion.div className={styles.mobileBrand} variants={item}>
              <span className={styles.brandMark} />
              <strong>DEWA-PBJ</strong>
            </motion.div>

            <motion.div variants={item} className={styles.backButtonWrapper}>
              <Link href="/" className={styles.backButton}>
                <ArrowLeft size={16} />
                Kembali ke Beranda
              </Link>
            </motion.div>

            <motion.h1 className={styles.heading} variants={item}>
              Selamat datang
            </motion.h1>
            <motion.p className={styles.sub} variants={item}>
              Masuk dengan akun yang diberikan Admin.
            </motion.p>

            <form action={formAction} className={styles.form}>
              <motion.div variants={item}>
                <AuthInput
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  icon={Mail}
                  placeholder="nama@dewa-pbj.go.id"
                  autoComplete="email"
                  required
                  aria-invalid={!!state?.fieldErrors?.email}
                />
                {state?.fieldErrors?.email && (
                  <p className={styles.fieldError}>{state.fieldErrors.email[0]}</p>
                )}
              </motion.div>

              <motion.div variants={item}>
                <AuthInput
                  id="password"
                  name="password"
                  label="Kata sandi"
                  icon={Lock}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  revealable
                  required
                  aria-invalid={!!state?.fieldErrors?.password}
                />
                {state?.fieldErrors?.password && (
                  <p className={styles.fieldError}>{state.fieldErrors.password[0]}</p>
                )}
              </motion.div>

              {state?.error && (
                <motion.div
                  className={styles.formError}
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <AlertCircle size={16} />
                  <span>{state.error}</span>
                </motion.div>
              )}

              <motion.button
                type="submit"
                className={styles.submit}
                disabled={pending}
                variants={item}
                style={{ x: springBtnX, y: springBtnY }}
                onPointerMove={handleBtnPointerMove}
                onPointerLeave={handleBtnPointerLeave}
                onPointerDown={handleBtnPointerDown}
                whileHover={reduce ? undefined : { scale: 1.015 }}
                whileTap={reduce ? undefined : { scale: 0.985 }}
              >
                {ripples.map((r) => (
                  <motion.span
                    key={r.id}
                    className={styles.ripple}
                    style={{ left: r.x, top: r.y }}
                    initial={{ scale: 0, opacity: 0.45 }}
                    animate={{ scale: 4, opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    onAnimationComplete={() => removeRipple(r.id)}
                  />
                ))}
                {pending ? (
                  <span className={styles.spinner} aria-hidden />
                ) : (
                  <LogIn size={17} />
                )}
                {pending ? 'Memproses…' : 'Masuk'}
              </motion.button>
            </form>

            <motion.div className={styles.cardInstitution} variants={item}>
              <Image
                src="/logo/kemnaker.png"
                alt="Kementerian Ketenagakerjaan Republik Indonesia"
                width={461}
                height={158}
                className={`${styles.cardInstK} ${styles.instLight}`}
              />
              <Image
                src="/logo/kemnaker-putih.png"
                alt="Kementerian Ketenagakerjaan Republik Indonesia"
                width={461}
                height={158}
                className={`${styles.cardInstK} ${styles.instDark}`}
              />

              <span className={styles.cardInstRule} aria-hidden />

              <Image
                src="/logo/ukpbj.png"
                alt="Unit Kerja Pengadaan Barang dan Jasa Kementerian Ketenagakerjaan"
                width={900}
                height={259}
                className={`${styles.cardInstU} ${styles.instLight}`}
              />
              <Image
                src="/logo/ukpbj-putih.png"
                alt="Unit Kerja Pengadaan Barang dan Jasa Kementerian Ketenagakerjaan"
                width={900}
                height={259}
                className={`${styles.cardInstU} ${styles.instDark}`}
              />
            </motion.div>

            <motion.p className={styles.legal} variants={item}>
              © 2026 DEWA-PBJ · Kementerian Ketenagakerjaan
            </motion.p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
