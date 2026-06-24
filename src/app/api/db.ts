import { Satker, PPK } from '@/types';

// Helper to generate IDs
let pkgId = 1;
const genPkgId = () => `pkg-${pkgId++}`;

export const satkerData: Record<string, Satker> = {
  binapenta: { 
    id: 'binapenta',
    name: 'Ditjen Binapenta', 
    packages: [
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Pengadaan jasa konsultansi sistem informasi', nilai: 1.25, spse: 'Evaluasi penawaran', sirup: false, realisasi: 18, risiko: 'tinggi', pic: 'Budi S.' },
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Pengadaan aplikasi Bursa Kerja Online v2', nilai: 2.10, spse: 'Pemilihan penyedia', sirup: true, realisasi: 22, risiko: 'tinggi', pic: 'Dewi K.' },
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Pelatihan modul digital tenaga kerja luar negeri', nilai: 0.99, spse: 'Pemilihan penyedia', sirup: true, realisasi: 30, risiko: 'sedang', pic: 'Wahyu S.' },
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Pengadaan media promosi penempatan TKI', nilai: 0.42, spse: 'Kontrak', sirup: true, realisasi: 45, risiko: 'sedang', pic: 'Budi S.' },
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Sewa gedung pelaksanaan job fair nasional', nilai: 0.85, spse: 'Kontrak', sirup: true, realisasi: 60, risiko: 'sedang', pic: 'Andi P.' },
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Pengadaan perangkat job fair virtual', nilai: 0.53, spse: 'Kontrak', sirup: true, realisasi: 72, risiko: 'rendah', pic: 'Indra L.' },
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Jasa pemeliharaan sistem informasi ketenagakerjaan', nilai: 0.68, spse: 'Selesai', sirup: true, realisasi: 100, risiko: 'rendah', pic: 'Budi S.' },
      { id: genPkgId(), satkerId: 'binapenta', nama: 'Pengadaan ATK dan kebutuhan operasional', nilai: 0.18, spse: 'Selesai', sirup: true, realisasi: 100, risiko: 'rendah', pic: 'Eka N.' }
    ]
  },
  setjen: { 
    id: 'setjen',
    name: 'Sekretariat Jenderal', 
    packages: [
      { id: genPkgId(), satkerId: 'setjen', nama: 'Pengadaan ATK dan perlengkapan kantor', nilai: 0.35, spse: 'Kontrak (mundur 6 hari)', sirup: true, realisasi: 55, risiko: 'sedang', pic: 'Rina A.' },
      { id: genPkgId(), satkerId: 'setjen', nama: 'Pengadaan jasa kebersihan dan keamanan gedung', nilai: 1.80, spse: 'Selesai', sirup: true, realisasi: 100, risiko: 'rendah', pic: 'Dimas F.' },
      { id: genPkgId(), satkerId: 'setjen', nama: 'Pengadaan kendaraan dinas operasional', nilai: 2.40, spse: 'Pemilihan penyedia', sirup: false, realisasi: 12, risiko: 'tinggi', pic: 'Wulan S.' },
      { id: genPkgId(), satkerId: 'setjen', nama: 'Pengadaan perangkat IT kantor pusat', nilai: 1.10, spse: 'Kontrak', sirup: true, realisasi: 48, risiko: 'sedang', pic: 'Eko P.' },
      { id: genPkgId(), satkerId: 'setjen', nama: 'Jasa katering rapat dan kegiatan', nilai: 0.25, spse: 'Selesai', sirup: true, realisasi: 100, risiko: 'rendah', pic: 'Nita W.' },
      { id: genPkgId(), satkerId: 'setjen', nama: 'Pengadaan langganan jurnal dan referensi hukum', nilai: 0.15, spse: 'Kontrak', sirup: true, realisasi: 80, risiko: 'rendah', pic: 'Agus T.' }
    ]
  },
  binalattas: { 
    id: 'binalattas',
    name: 'Ditjen Binalattas', 
    packages: [
      { id: genPkgId(), satkerId: 'binalattas', nama: 'Pembangunan gedung pelatihan vokasi', nilai: 3.20, spse: 'Pemilihan penyedia (sanggah peserta)', sirup: true, realisasi: 25, risiko: 'sedang', pic: 'Hadi P.' },
      { id: genPkgId(), satkerId: 'binalattas', nama: 'Pengadaan alat praktik pelatihan las dan otomotif', nilai: 0.95, spse: 'Selesai', sirup: true, realisasi: 100, risiko: 'rendah', pic: 'Fitri N.' },
      { id: genPkgId(), satkerId: 'binalattas', nama: 'Pengadaan modul e-learning pelatihan kerja', nilai: 0.60, spse: 'Kontrak', sirup: true, realisasi: 52, risiko: 'sedang', pic: 'Galih R.' },
      { id: genPkgId(), satkerId: 'binalattas', nama: 'Sertifikasi instruktur pelatihan vokasi', nilai: 0.40, spse: 'Selesai', sirup: true, realisasi: 90, risiko: 'rendah', pic: 'Maya K.' },
      { id: genPkgId(), satkerId: 'binalattas', nama: 'Pengadaan APD untuk peserta pelatihan', nilai: 0.20, spse: 'Kontrak', sirup: true, realisasi: 70, risiko: 'rendah', pic: 'Yudi S.' },
      { id: genPkgId(), satkerId: 'binalattas', nama: 'Pengembangan platform sertifikasi kompetensi digital', nilai: 1.10, spse: 'Evaluasi penawaran', sirup: false, realisasi: 15, risiko: 'tinggi', pic: 'Lina D.' }
    ]
  },
  pusdatin: { 
    id: 'pusdatin',
    name: 'Pusdatin', 
    packages: [
      { id: genPkgId(), satkerId: 'pusdatin', nama: 'Pengadaan laptop unit kerja Pusdatin', nilai: 0.30, spse: 'Selesai', sirup: true, realisasi: 100, risiko: 'rendah', pic: 'Sari D.' },
      { id: genPkgId(), satkerId: 'pusdatin', nama: 'Pengadaan server dan storage data center', nilai: 1.50, spse: 'Kontrak', sirup: true, realisasi: 40, risiko: 'sedang', pic: 'Arman H.' },
      { id: genPkgId(), satkerId: 'pusdatin', nama: 'Jasa keamanan siber dan audit sistem', nilai: 0.70, spse: 'Pemilihan penyedia', sirup: true, realisasi: 20, risiko: 'sedang', pic: 'Nadia P.' },
      { id: genPkgId(), satkerId: 'pusdatin', nama: 'Pengembangan integrasi API SPSE-SIRUP', nilai: 0.85, spse: 'Kontrak', sirup: true, realisasi: 65, risiko: 'rendah', pic: 'Yoga W.' }
    ]
  },
  blk3: { 
    id: 'blk3',
    name: 'BLK Wilayah III', 
    packages: [
      { id: genPkgId(), satkerId: 'blk3', nama: 'Renovasi balai latihan kerja daerah', nilai: 1.60, spse: 'Kontrak (potensi penumpukan akhir tahun)', sirup: true, realisasi: 30, risiko: 'tinggi', pic: 'Toni W.' },
      { id: genPkgId(), satkerId: 'blk3', nama: 'Pengadaan alat praktik pelatihan otomotif', nilai: 0.55, spse: 'Selesai', sirup: true, realisasi: 100, risiko: 'rendah', pic: 'Putri A.' },
      { id: genPkgId(), satkerId: 'blk3', nama: 'Pengadaan seragam dan APD peserta', nilai: 0.18, spse: 'Kontrak', sirup: true, realisasi: 75, risiko: 'rendah', pic: 'Bayu N.' },
      { id: genPkgId(), satkerId: 'blk3', nama: 'Pemeliharaan asrama peserta pelatihan', nilai: 0.30, spse: 'Pemilihan penyedia', sirup: true, realisasi: 35, risiko: 'sedang', pic: 'Citra D.' },
      { id: genPkgId(), satkerId: 'blk3', nama: 'Pengadaan internet dan jaringan BLK', nilai: 0.22, spse: 'Kontrak', sirup: true, realisasi: 60, risiko: 'rendah', pic: 'Doni P.' }
    ]
  }
};

export const ppkRoster: PPK[] = [
  { id: 'ppk-0', name: 'Budi S.', satkerId: 'binapenta', satkerName: 'Ditjen Binapenta' },
  { id: 'ppk-1', name: 'Rina A.', satkerId: 'setjen', satkerName: 'Sekretariat Jenderal' },
  { id: 'ppk-2', name: 'Hadi P.', satkerId: 'binalattas', satkerName: 'Ditjen Binalattas' },
  { id: 'ppk-3', name: 'Toni W.', satkerId: 'blk3', satkerName: 'BLK Wilayah III' }
];
