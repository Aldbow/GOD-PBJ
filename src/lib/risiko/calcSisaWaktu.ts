export interface SisaWaktuResult {
  score: number;
  sisaHari: number;
  reason: string;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Skor risiko sisa waktu untuk paket yang BELUM dilaksanakan — bandingkan targetDate
 * (tgl_akhir_pemilihan / tgl_awal_pelaksanaan_kontrak) terhadap `today` (WAJIB di-inject oleh
 * pemanggil, jangan `new Date()` di dalam fungsi ini, supaya deterministik & bisa diuji):
 *   > 3 bulan dari hari ini        -> 0
 *   2 s.d. 3 bulan (inklusif)      -> 1
 *   1 s.d. <2 bulan                -> 2
 *   < 1 bulan atau sudah terlewati -> 3
 * Perbandingan pakai kalender bulan (setMonth), bukan hari/30, supaya batas "tepat N bulan"
 * konsisten dengan panjang bulan yang berbeda-beda. */
export function sisaWaktuScore(targetDate: Date, today: Date): SisaWaktuResult {
  const sisaHari = Math.ceil((targetDate.getTime() - today.getTime()) / 86_400_000);

  const oneMonth = addMonths(today, 1);
  const twoMonths = addMonths(today, 2);
  const threeMonths = addMonths(today, 3);

  let score: number;
  if (targetDate.getTime() > threeMonths.getTime()) score = 0;
  else if (targetDate.getTime() >= twoMonths.getTime()) score = 1;
  else if (targetDate.getTime() >= oneMonth.getTime()) score = 2;
  else score = 3;

  const reason =
    sisaHari >= 0
      ? `Batas akhir tersisa ${sisaHari} hari sehingga memperoleh skor waktu ${score}.`
      : `Batas akhir telah terlewati ${Math.abs(sisaHari)} hari sehingga memperoleh skor waktu ${score}.`;

  return { score, sisaHari, reason };
}
