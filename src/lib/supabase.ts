import { createClient } from './supabase/client';

/**
 * Client Supabase bersama untuk kode browser (dipakai feature views existing).
 * Kini memakai createBrowserClient (@supabase/ssr) sehingga session tersimpan
 * di cookie & selaras dengan server/proxy. Import lama `{ supabase }` tetap jalan.
 */
export const supabase = createClient();
