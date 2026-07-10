import { PengadaanLangsungView } from '@/features/pengadaan-langsung/components/PengadaanLangsungView';

export const metadata = {
  title: 'Realisasi Pengadaan Langsung - Dewa-PBJ',
  description: 'Ringkasan Realisasi Pengadaan Langsung',
};

export default function PengadaanLangsungPage() {
  return (
    <div style={{ padding: '24px 32px' }}>
      <PengadaanLangsungView />
    </div>
  );
}
