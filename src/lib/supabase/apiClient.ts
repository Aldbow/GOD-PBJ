import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/**
 * Klien Supabase untuk route handler, dibuat saat dipanggil bukan saat modul
 * diimpor.
 *
 * createClient() melempar "supabaseUrl is required" bila URL kosong, sedangkan
 * `next build` memuat setiap modul route saat mengumpulkan data halaman. Jadi
 * inisialisasi di module scope membuat BUILD gagal di lingkungan yang belum
 * punya env, bukan sekadar request yang gagal. Di Vercel itu berarti Preview
 * deployment yang variabelnya belum diisi ikut gagal build.
 *
 * Dengan pola ini env yang hilang menjadi error runtime yang jelas pada
 * endpoint yang bersangkutan, dan halaman lain tetap terbangun.
 */
export function getApiSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum dikonfigurasi.'
    );
  }

  client = createClient(url, anonKey);
  return client;
}
