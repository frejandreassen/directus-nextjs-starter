// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/directus'; // Importera från din directus.js
import { cookies } from 'next/headers';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL; // Används inte direkt här, men bra att ha i åtanke

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email och lösenord krävs' }, { status: 400 });
    }

    // Anropa din Directus authenticate-funktion
    const credentials = await authenticate(email, password);

    if (!credentials || !credentials.access_token || !credentials.refresh_token) {
      console.error('Inloggning misslyckades: Directus returnerade inte förväntade tokens.');
      return NextResponse.json({ error: 'Ogiltiga inloggningsuppgifter eller oväntat svar från Directus' }, { status: 401 });
    }

    const cookieStore = await cookies();

    // Sätt access token som en HttpOnly cookie
    cookieStore.set('directus_access_token', credentials.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Sätt till true i produktion (HTTPS)
      maxAge: credentials.expires / 1000, // credentials.expires är i millisekunder från Directus
      path: '/',
      sameSite: 'lax', // Bra skydd mot CSRF
    });

    // Sätt refresh token som en HttpOnly cookie
    cookieStore.set('directus_refresh_token', credentials.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 dagar (justera efter Directus inställning om nödvändigt)
      path: '/',
      sameSite: 'lax',
    });
    
    // (Valfritt) Sätt en vanlig cookie som klienten kan läsa för att veta när access token går ut
    // Detta kan användas för proaktiv refresh, men är inte kritiskt för denna guide.
    cookieStore.set('directus_access_token_expires_at', String(Date.now() + credentials.expires), {
      secure: process.env.NODE_ENV === 'production',
      maxAge: credentials.expires / 1000,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true, message: 'Inloggning lyckades!' });

  } catch (error) {
    console.error('Login API error:', error.message);
    return NextResponse.json({ error: 'Inloggningen misslyckades. Kontrollera dina uppgifter.' }, { status: 401 });
  }
}