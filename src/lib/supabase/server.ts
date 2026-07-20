import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Supabase client untuk konteks server (Server Components, Route Handlers,
 * Server Actions, DAL). Membaca/menulis session dari cookie via next/headers.
 *
 * Catatan Next 16: cookies() bersifat async → harus di-await.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Dipanggil dari Server Component (cookie read-only). Aman diabaikan
          // karena proxy.ts yang bertugas me-refresh cookie session.
        }
      },
    },
  });
}
