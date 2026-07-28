import { supabase } from '@/lib/supabase';
import type { ItkpBCDInput, PenugasanKondisi, RenaksiKondisi } from './calcBCD';

/**
 * Mengambil data secara dinamis dari tabel `formasi_jf_ukpbj`, `data_jf_kemnaker`, dan `data_renaksi`.
 * Karena belum ada pengelompokkan per `kd_satker`, data yang dikembalikan bersifat agregat (Nasional).
 */
export async function fetchItkpBCDData(): Promise<ItkpBCDInput> {
  // 1. Fetch Formasi Kebutuhan dan Terpenuhi
  let kebutuhanFormasi = 0;
  let formasiTerisi = 0;
  let rawFormasi: any[] = [];

  const { data: formasiData, error: formasiErr } = await supabase
    .from('formasi_jf_ukpbj')
    .select('*');
  
  if (!formasiErr && formasiData) {
    rawFormasi = formasiData;
    for (const row of formasiData) {
      kebutuhanFormasi += Number(row['Formasi Kebutuhan']) || 0;
      formasiTerisi += Number(row['Formasi Terpenuhi']) || 0;
    }
  } else if (formasiErr) {
    console.error('Error fetching formasi:', formasiErr);
  }

  // 2. Fetch Penugasan JF
  let penugasan: PenugasanKondisi = 'e'; // Default 'e' (Belum ada yang ditugaskan)
  let rawPenugasan: any[] = [];
  
  const { data: jfData, error: jfErr } = await supabase
    .from('data_jf_kemnaker')
    .select('*');

  if (!jfErr && jfData && jfData.length > 0) {
    rawPenugasan = jfData;
    let countAssigned = 0;

    for (const row of jfData) {
      const p = String(row['Penugasan']).toUpperCase();
      if (p.includes('POKJA') || p.includes('PEJABAT PENGADAAN') || p.includes('PPK')) {
        countAssigned++;
      }
    }

    const totalPegawai = jfData.length;
    if (countAssigned === totalPegawai) {
       // Seluruh JF ditugaskan sebagai Pokja / PP / PPK
       penugasan = 'a';
    } else if (countAssigned > 0) {
       // Sebagian JF ditugaskan
       penugasan = 'd';
    }
  } else if (jfErr) {
    console.error('Error fetching penugasan:', jfErr);
  }

  // 3. Fetch Renaksi
  let renaksi: RenaksiKondisi = 'none';
  let rawRenaksi: any[] = [];

  const { data: renaksiData, error: renaksiErr } = await supabase
    .from('data_renaksi')
    .select('*');
  
  if (!renaksiErr && renaksiData) {
    rawRenaksi = renaksiData;
    let hasPPK = false;
    let hasJF = false;

    for (const row of renaksiData) {
      const pelaku = String(row['Pelaku Pengadaan']).toUpperCase();
      const renaksiVal = String(row['Renaksi']).toUpperCase();
      
      let ukLevel = 0;
      const match = renaksiVal.match(/UK\s*(\d+)/);
      if (match) {
        ukLevel = parseInt(match[1], 10);
      }

      if (ukLevel > 0) {
        if (pelaku.includes('PPK') && ukLevel >= 2) {
          hasPPK = true;
        }

        const isJF = pelaku.includes('JF PPBJ');
        const isLainnya = pelaku.includes('PERSONEL LAINNYA');

        if (isJF && ukLevel >= 4) {
          hasJF = true;
        } else if (!isJF && isLainnya && ukLevel >= 2) {
          hasJF = true;
        }
      }
    }

    if (hasJF && hasPPK) {
      renaksi = 'jf_ppk';
    } else if (hasJF) {
      renaksi = 'jf';
    } else if (hasPPK) {
      renaksi = 'ppk';
    }
  } else if (renaksiErr) {
    console.error('Error fetching renaksi:', renaksiErr);
  }

  // 4. Data Dummy untuk Kematangan dan Integritas
  const rawSpi = {
    indeks: 66.12,
    tahun: 2025,
    instansiPemerintahDaerah: 0,
    totalInstansiPemerintahDaerah: 0,
    instansiKL: 66.12,
    totalInstansiKL: 1,
    categories: {
      Internal: {
        score: 76.59,
        dimensions: [
          { name: 'Integritas Dalam Pelaksanaan Tugas', value: 69.93 },
          { name: 'Pengelolaan Anggaran', value: 81.30 },
          { name: 'Pengelolaan PBJ', value: 84.32 },
          { name: 'Pengelolaan SDM', value: 72.77 },
          { name: 'Perdagangan Pengaruh (Trading in Influence)', value: 75.41 },
          { name: 'Sosialisasi Antikorupsi', value: 69.73 },
          { name: 'Transparansi', value: 82.94 },
        ],
      },
      Eksternal: {
        score: 88.10,
        dimensions: [
          { name: 'Integritas Pegawai', value: 97.15 },
          { name: 'Transparansi dan Keadilan Layanan', value: 84.74 },
          { name: 'Upaya Pencegahan Korupsi', value: 81.38 },
        ],
      },
      Eksper: {
        score: 58.37,
        dimensions: [
          { name: 'Integritas Instansi', value: 58.37 },
        ],
      },
      'Faktor Koreksi': {
        score: null,
        dimensions: [
          { name: 'Pelaksanaan SPI', value: 4.49 },
          { name: 'Fakta Korupsi', value: 3.06 },
        ],
      },
    }
  };

  return {
    kebutuhanFormasi,
    formasiTerisi,
    penugasan,
    renaksi,
    kematangan: 'sembilan_sembilan', // Dummy
    nilaiSpi: 66.12, // Dummy
    tahunPenilaianSpi: 2025, // Diubah menjadi 2025 sesuai permintaan
    rawFormasi,
    rawPenugasan,
    rawRenaksi,
    rawSpi,
  };
}
