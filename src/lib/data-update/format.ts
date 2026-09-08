/**
 * Format stempel "kapan data terakhir diperbarui" untuk topbar.
 *
 * Dipisah dari komponen supaya bisa diuji tanpa render (lihat
 * __tests__/format.test.ts) — batas antar satuan (60 detik, 24 jam, 7 hari)
 * gampang meleset kalau ditulis inline di JSX.
 */

const MENIT = 60_000;
const JAM = 60 * MENIT;
const HARI = 24 * JAM;
const MINGGU = 7 * HARI;
const BULAN = 30 * HARI;
const TAHUN = 365 * HARI;

/**
 * Jarak waktu dalam bahasa manusia, mis. "22 jam lalu".
 *
 * `now` bisa disuntik untuk pengujian. Stempel di masa depan (jam server dan
 * jam browser tidak pernah persis sama) dianggap "baru saja", bukan
 * "-1 menit lalu".
 */
export function formatRelativeUpdate(iso: string, now: Date = new Date()): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;

  const selisih = now.getTime() - t;
  if (selisih < MENIT) return 'baru saja';
  if (selisih < JAM) return Math.floor(selisih / MENIT) + ' menit lalu';
  if (selisih < HARI) return Math.floor(selisih / JAM) + ' jam lalu';
  if (selisih < MINGGU) return Math.floor(selisih / HARI) + ' hari lalu';
  if (selisih < BULAN) return Math.floor(selisih / MINGGU) + ' minggu lalu';
  if (selisih < TAHUN) return Math.floor(selisih / BULAN) + ' bulan lalu';
  return Math.floor(selisih / TAHUN) + ' tahun lalu';
}

/**
 * Waktu persisnya, dipakai sebagai tooltip bawaan browser (atribut `title`)
 * supaya teks relatif tetap bisa ditelusuri.
 *
 * Selalu WIB — pengguna aplikasi ini di Indonesia, sedangkan finished_at
 * disimpan UTC. Tanpa pemaksaan zona, laptop yang jamnya diset zona lain akan
 * menampilkan tanggal yang berbeda dari yang lain.
 */
export function formatExactUpdate(iso: string): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;

  const tanggal = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(t));

  return tanggal + ' WIB';
}
