import { createClient } from './supabase/client';

type BrowserClient = ReturnType<typeof createClient>;

let instance: BrowserClient | undefined;

function getInstance(): BrowserClient {
  instance ??= createClient();
  return instance;
}

/**
 * Client Supabase bersama untuk kode browser (dipakai feature views existing).
 * Memakai createBrowserClient (@supabase/ssr) sehingga session tersimpan di
 * cookie & selaras dengan server/proxy. Import lama `{ supabase }` tetap jalan.
 *
 * Dibungkus Proxy supaya client baru dibuat saat properti pertama diakses,
 * bukan saat modul diimpor. Alasannya konkret: createBrowserClient melempar
 * bila URL kosong, sedangkan `next build` memuat setiap modul route saat
 * mengumpulkan data halaman. Route /api/paket dan /api/ppk mengimpor modul ini,
 * jadi instansiasi di module scope membuat BUILD gagal di lingkungan yang belum
 * punya env (mis. Preview deployment Vercel yang variabelnya baru diisi untuk
 * Production), bukan sekadar request yang gagal.
 *
 * Metode di-bind ke client asli supaya `this` di dalam supabase-js tetap benar.
 */
export const supabase = new Proxy({} as BrowserClient, {
  get(_target, prop) {
    const client = getInstance() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
