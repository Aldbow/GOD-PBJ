import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccess, LANDING, PUBLIC_ROUTES } from '@/lib/auth/access';
import type { Role } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Next.js 16 Proxy (pengganti middleware). Berjalan di Node.js runtime.
 * Tugas:
 *   1. Refresh session Supabase & sinkronkan cookie (pola resmi @supabase/ssr).
 *   2. Gate rute: belum login → /login (kecuali '/', landing page publik);
 *      sudah login buka '/' atau /login → landing sesuai role;
 *      sudah login tapi role tak berhak → landing role tsb.
 *
 * Ini lapis optimistik; pengecekan ketat tetap di DAL & API (server-side).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.includes(path);

  // Helper: redirect sambil membawa cookie session yang sudah di-refresh.
  const redirectTo = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = '';
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  // Belum login → hanya boleh halaman publik
  if (!user) {
    if (isPublic) return response;
    return redirectTo('/login');
  }

  // Sudah login → tentukan role (RLS: user hanya baca profilnya sendiri)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role ?? 'ppk') as Role;

  // Sudah login tapi membuka /login → arahkan ke landing
  if (isPublic) return redirectTo(LANDING[role]);

  // Role tak berhak atas rute ini → arahkan ke landing role tsb
  if (!canAccess(role, path)) return redirectTo(LANDING[role]);

  return response;
}

export const config = {
  // Jalankan di semua rute kecuali API, aset statis, gambar, & favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
