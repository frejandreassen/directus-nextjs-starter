// app/api/auth/refresh/route.js
import { NextResponse } from 'next/server';
import { refreshCredentials } from '@/lib/directus';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('directus_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token saknas' }, { status: 401 });
    }

    // Anropa Directus för att få nya tokens
    const credentials = await refreshCredentials(refreshToken);

    if (!credentials || !credentials.access_token || !credentials.refresh_token) {
      return NextResponse.json({ error: 'Token refresh misslyckades' }, { status: 401 });
    }

    // Uppdatera cookies med nya token
    cookieStore.set('directus_access_token', credentials.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: credentials.expires / 1000,
      path: '/',
      sameSite: 'lax',
    });

    // Uppdatera refresh token också
    cookieStore.set('directus_refresh_token', credentials.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 dagar
      path: '/',
      sameSite: 'lax',
    });

    // Uppdatera expires_at
    cookieStore.set('directus_access_token_expires_at', String(Date.now() + credentials.expires), {
      secure: process.env.NODE_ENV === 'production',
      maxAge: credentials.expires / 1000,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true, message: 'Token förnyad!' });
  } catch (error) {
    console.error('Refresh error:', error.message);
    return NextResponse.json({ error: 'Kunde inte förnya token' }, { status: 401 });
  }
}