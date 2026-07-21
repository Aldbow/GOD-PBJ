import { ItkpDashboard } from '@/features/itkp/components/ItkpDashboard';
import { PageTransition } from '@/components/layout/PageTransition';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard Penilaian ITKP - Dewa-PBJ',
  description: 'Skor ITKP: Pemanfaatan Sistem, Kualifikasi & Kompetensi SDM PBJ, Tingkat Kematangan UKPBJ, Integritas Pengadaan',
};

export default function ItkpPage() {
  return (
    <PageTransition>
      <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
        <ItkpDashboard />
      </Suspense>
    </PageTransition>
  );
}
