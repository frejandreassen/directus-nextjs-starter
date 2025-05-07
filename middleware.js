// middleware.js
import { NextResponse } from 'next/server';

// Lista över sidor som kräver inloggning
const protectedRoutes = ['/companies', '/profile']; // Lägg till fler skyddade rutter här
// Lista över sidor som är publika (t.ex. inloggningssidan)
const publicRoutes = ['/login', '/signup'];

// Helper funktion för att försöka förnya token
async function attemptRefresh(request) {
  try {
    // Anropa vår refresh-API för att förnya token
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || request.nextUrl.origin}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Skapa ett modifierat svar med de nya cookies
        const responseHeaders = new Headers(response.headers);
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          responseHeaders.set('set-cookie', setCookieHeader);
        }
        
        // Vi returnerar både att förnyelsen lyckades och headers
        return { success: true, headers: responseHeaders };
      }
    }
    return { success: false };
  } catch (error) {
    console.error('Middleware refresh error:', error);
    return { success: false };
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Använd request.cookies istället för cookies() från next/headers
  const accessToken = request.cookies.get('directus_access_token')?.value;
  const refreshToken = request.cookies.get('directus_refresh_token')?.value;
  const expiresAt = request.cookies.get('directus_access_token_expires_at')?.value;
  
  // Kolla om token har gått ut eller snart går ut
  const isTokenExpiredOrExpiring = expiresAt && parseInt(expiresAt, 10) < Date.now() + 60000; // 60 sekunder buffer
  
  // Vi har 3 fall:
  // 1. Har access token som är giltig: isAuthenticated = true
  // 2. Har access token som gått ut (eller snart går ut) men har refresh token: shouldRefresh = true
  // 3. Har ingen access token eller refresh token: isAuthenticated = false, shouldRefresh = false
  
  const hasValidToken = accessToken && !isTokenExpiredOrExpiring;
  const hasExpiredToken = accessToken && isTokenExpiredOrExpiring;
  const shouldRefresh = refreshToken && (hasExpiredToken || !accessToken);
  
  // Försök förnya token om det behövs
  let isAuthenticated = hasValidToken;
  let refreshedHeaders = null;
  
  if (shouldRefresh) {
    const refreshResult = await attemptRefresh(request);
    if (refreshResult.success) {
      isAuthenticated = true;
      refreshedHeaders = refreshResult.headers;
    }
  }

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.includes(pathname);

  // Om användaren försöker nå en skyddad sida utan att vara inloggad
  if (isProtectedRoute && !isAuthenticated) {
    // Skicka dem till inloggningssidan
    const loginUrl = new URL('/login', request.nextUrl.origin);
    // Spara den ursprungliga sidan så vi kan skicka tillbaka användaren dit efter lyckad inloggning
    loginUrl.searchParams.set('callbackUrl', pathname);
    // Om token har gått ut, visa ett felmeddelande
    if (hasExpiredToken && !isAuthenticated) {
      loginUrl.searchParams.set('error', 'session_expired');
    }
    return NextResponse.redirect(loginUrl);
  }

  // Om en inloggad användare försöker nå en publik sida (t.ex. login), skicka dem till en skyddad sida
  if (isPublicRoute && isAuthenticated && pathname !== '/') {
    return NextResponse.redirect(new URL('/companies', request.nextUrl.origin));
  }

  // Om token förnyades, använd de nya headers i svaret
  if (isAuthenticated && refreshedHeaders) {
    // Fortsätt till den ursprungliga sidan med nya cookies
    return NextResponse.next({
      request: {
        headers: refreshedHeaders,
      },
    });
  }

  // Låt requesten passera om inget av ovanstående gäller
  return NextResponse.next();
}

// Konfiguration för vilka sökvägar middleware ska köras på.
// Detta undviker att köra middleware på t.ex. API-anrop eller statiska filer.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};