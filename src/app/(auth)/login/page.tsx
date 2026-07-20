"use client";

import React, { useActionState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { login, type LoginState } from '@/lib/auth/actions';
import { AuthInput } from '@/components/auth/AuthInput';
import styles from './login.module.css';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <div className={styles.page}>
      {/* Panel brand (kiri) */}
      <aside className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <div className={styles.brandMark} />
          <div className={styles.brandLockup}>
            <strong>DEWA-PBJ</strong>
            <span>Early warning pengadaan</span>
          </div>
        </div>

        <div className={styles.brandBody}>
          <h2>Pantau realisasi PBJ Kemnaker secara real-time.</h2>
          <ul className={styles.points}>
            <li><ShieldCheck size={16} /> Akses berbasis peran (RBAC) yang aman</li>
            <li><ShieldCheck size={16} /> Deteksi dini risiko paket pengadaan</li>
            <li><ShieldCheck size={16} /> Data SIRUP &amp; SPSE dalam satu dasbor</li>
          </ul>
        </div>

        <div className={styles.brandFoot}>Aksi perubahan — Kemnaker</div>
      </aside>

      {/* Form (kanan) */}
      <main className={styles.formPanel}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.mobileBrand}>
            <div className={styles.brandMark} />
            <strong>DEWA-PBJ</strong>
          </div>

          <h1 className={styles.heading}>Masuk ke DEWA-PBJ</h1>
          <p className={styles.sub}>Gunakan akun yang diberikan administrator UKPBJ.</p>

          <form action={formAction} className={styles.form}>
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

            {state?.error && (
              <div className={styles.formError} role="alert">
                <AlertCircle size={16} />
                <span>{state.error}</span>
              </div>
            )}

            <motion.button
              type="submit"
              className={styles.submit}
              disabled={pending}
              whileTap={{ scale: 0.98 }}
            >
              <LogIn size={16} />
              {pending ? 'Memproses…' : 'Masuk'}
            </motion.button>
          </form>
        </motion.div>

        <p className={styles.legal}>© 2026 DEWA-PBJ · Kementerian Ketenagakerjaan</p>
      </main>
    </div>
  );
}
