'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, ChevronDown, Zap } from 'lucide-react';
import styles from './LandingHero.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15 + 0.2, duration: 0.7, ease: EASE },
  }),
};

type Mouse = { x: number | null; y: number | null; radius: number };

class Particle {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  color: string;

  constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.directionX = directionX;
    this.directionY = directionY;
    this.size = size;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, mouse: Mouse) {
    if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
    if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius + this.size) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (mouse.radius - distance) / mouse.radius;
        this.x -= forceDirectionX * force * 5;
        this.y -= forceDirectionY * force * 5;
      }
    }

    this.x += this.directionX;
    this.y += this.directionY;
    this.draw(ctx);
  }
}

export function LandingHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse: Mouse = { x: null, y: null, radius: 180 };

    const init = () => {
      particles = [];
      const numberOfParticles = (canvas.height * canvas.width) / 9000;
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 2 + 1;
        const x = Math.random() * (canvas.width - size * 4) + size * 2;
        const y = Math.random() * (canvas.height - size * 4) + size * 2;
        const directionX = reduceMotion ? 0 : Math.random() * 0.4 - 0.2;
        const directionY = reduceMotion ? 0 : Math.random() * 0.4 - 0.2;
        particles.push(new Particle(x, y, directionX, directionY, size, 'rgba(45, 212, 168, 0.85)'));
      }
    };

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      init();
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const connect = () => {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dist = (particles[a].x - particles[b].x) ** 2 + (particles[a].y - particles[b].y) ** 2;

          if (dist < (canvas.width / 7) * (canvas.height / 7)) {
            const opacity = 1 - dist / 22000;
            const dxMouseA = particles[a].x - (mouse.x ?? -9999);
            const dyMouseA = particles[a].y - (mouse.y ?? -9999);
            const distMouseA = Math.sqrt(dxMouseA * dxMouseA + dyMouseA * dyMouseA);

            ctx.strokeStyle =
              mouse.x !== null && distMouseA < mouse.radius
                ? `rgba(255, 255, 255, ${opacity})`
                : `rgba(45, 212, 168, ${opacity * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const draw = () => {
      ctx.fillStyle = '#0A0E15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => p.update(ctx, canvas, mouse));
      connect();
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      draw();
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };
    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    init();
    if (reduceMotion) {
      draw();
    } else {
      animate();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className={styles.hero}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
      <div className={styles.overlay} aria-hidden />

      <div className={styles.content}>
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className={styles.badge}>
          <Zap size={14} />
          <span>Sistem Peringatan Dini Pengadaan</span>
        </motion.div>

        <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible" className={styles.title}>
          DEWA-PBJ
        </motion.h1>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible" className={styles.subtitle}>
          Dashboard pemantauan realisasi Pengadaan Barang/Jasa Kementerian Ketenagakerjaan —
          mendeteksi risiko sejak dini, menyajikan data secara real-time.
        </motion.p>

        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className={styles.actions}>
          <Link href="/login" className={styles.primaryBtn}>
            Masuk ke Dashboard
            <ArrowRight size={17} />
          </Link>
          <a href="#modul" className={styles.secondaryBtn}>
            Lihat Modul
            <ChevronDown size={16} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
