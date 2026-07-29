"use client";

import React, { useActionState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Mail, Lock, LogIn, ShieldCheck, LineChart, Radar, AlertCircle } from 'lucide-react';
import { login, type LoginState } from '@/lib/auth/actions';
import { AuthInput } from '@/components/auth/AuthInput';
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

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);
  const reduce = useReducedMotion();

  // Gerakan orb latar (dinonaktifkan saat prefers-reduced-motion)
  const floatA = reduce ? {} : { x: [0, 30, -10, 0], y: [0, -24, 12, 0], scale: [1, 1.1, 0.98, 1] };
  const floatB = reduce ? {} : { x: [0, -26, 14, 0], y: [0, 18, -14, 0], scale: [1, 0.94, 1.08, 1] };

  return (
    <div className={styles.page}>
      {/* ---------- Panel brand (kiri) ---------- */}
      <aside className={styles.brandPanel}>
        {/* Aurora / orb latar */}
        <motion.span
          className={`${styles.orb} ${styles.orbTeal}`}
          animate={floatA}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className={`${styles.orb} ${styles.orbBlue}`}
          animate={floatB}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className={styles.grid} aria-hidden />

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
            <motion.h2 variants={item}>
              Pantau realisasi PBJ Kemnaker <em>secara real-time</em>.
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

          <motion.div className={styles.brandFoot} variants={item}>
            Kementerian Ketenagakerjaan Republik Indonesia
          </motion.div>
        </motion.div>
      </aside>

      {/* ---------- Form (kanan) ---------- */}
      <main className={styles.formPanel}>
        <span className={`${styles.orb} ${styles.orbSoft}`} aria-hidden />

        <motion.div
          className={styles.card}
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div className={styles.mobileBrand} variants={item}>
            <span className={styles.brandMark} />
            <strong>DEWA-PBJ</strong>
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
              whileHover={reduce ? undefined : { scale: 1.015 }}
              whileTap={reduce ? undefined : { scale: 0.985 }}
            >
              {pending ? (
                <span className={styles.spinner} aria-hidden />
              ) : (
                <LogIn size={17} />
              )}
              {pending ? 'Memproses…' : 'Masuk'}
            </motion.button>
          </form>

          <motion.p className={styles.legal} variants={item}>
            © 2026 DEWA-PBJ · Kementerian Ketenagakerjaan
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
