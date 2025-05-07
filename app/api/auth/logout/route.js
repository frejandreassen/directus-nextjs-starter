// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;

export async function POST() { // Utloggning sker ofta via POST för att undvika CSRF på GET
  const cookieStore = await cookies();
  const refreshTokenCookie = cookieStore.get('directus_refresh_token');
  const refreshToken = refreshTokenCookie?.value || null;

  try {
    // Valfritt: Försök logga ut från Directus också
    if (refreshToken && DIRECTUS_URL) {
      await fetch(`${DIRECTUS_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      // Ignorera fel här, vi vill rensa lokala cookies oavsett.
    }
  } catch (error) {
    console.warn("Fel vid försök att logga ut från Directus:", error.message);
  }
  
  // Rensa cookies
  cookieStore.delete('directus_access_token');
  cookieStore.delete('directus_refresh_token');
  cookieStore.delete('directus_access_token_expires_at');

  return NextResponse.json({ success: true, message: 'Utloggning lyckades!' });
}