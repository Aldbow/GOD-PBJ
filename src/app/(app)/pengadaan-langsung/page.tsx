import { PengadaanLangsungView } from '@/features/pengadaan-langsung/components/PengadaanLangsungView';
import { Suspense } from 'react';

export const metadata = {
  title: 'Realisasi Pengadaan Langsung - Dewa-PBJ',
  description: 'Ringkasan Realisasi Pengadaan Langsung',
};

export default function PengadaanLangsungPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat dasbor...</p>}>
      <PengadaanLangsungView />
    </Suspense>
  );
}
