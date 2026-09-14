'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LANDING } from '@/lib/auth/access';
import type { Role } from '@/types';

const LoginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(1, { message: 'Kata sandi wajib diisi.' }),
});

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
} | undefined;

/**
 * Server Action login — dipakai dengan useActionState di halaman /login.
 * Sukses → redirect ke landing sesuai role. Gagal → kembalikan pesan error.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !signInData.user) {
    return { error: 'Email atau kata sandi salah.' };
  }

  // Ambil role untuk menentukan landing; sekaligus tolak akun nonaktif.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', signInData.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: 'Akun tidak aktif atau belum terdaftar. Hubungi administrator.' };
  }

  redirect(LANDING[profile.role as Role]);
}

/** Server Action logout — hapus session lalu kembali ke /login. */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
