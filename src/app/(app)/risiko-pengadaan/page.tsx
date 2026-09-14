import { Metadata } from 'next';
import { RisikoPengadaanView } from '@/features/risiko/components/RisikoPengadaanView';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Risiko Pengadaan - Dewa-PBJ',
  description: 'Skor risiko per paket RUP: nilai pagu, metode/jenis pengadaan, sumber dana, sisa waktu pelaksanaan, dan revisi RUP',
};

export default function RisikoPengadaanPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
      <RisikoPengadaanView />
    </Suspense>
  );
}
