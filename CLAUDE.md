Del 1: Sätta upp Server-Side Autentisering

Steg 1: Förbered Directus-kommunikation
Kontrollera: Öppna filen lib/directus.js.
Verifiera: Se till att funktionerna authenticate och refreshCredentials finns där. Dessa pratar med Directus.
Miljövariabel: Öppna .env.local. Dubbelkolla att NEXT_PUBLIC_DIRECTUS_URL är satt till rätt adress för din Directus-instans (t.ex. NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055).
Steg 2: Skapa API Route för Inloggning
Skapa fil: app/api/auth/login/route.js
Klistra in och anpassa följande kod:
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

    const cookieStore = cookies();

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
Use code with caution.
JavaScript
Förstå: Denna kod tar emot email/lösenord, skickar dem till Directus, och om det lyckas sätter den två viktiga cookies (directus_access_token, directus_refresh_token) som är HttpOnly (kan inte läsas av JavaScript i webbläsaren).
Steg 3: Uppdatera Inloggningsformuläret
Öppna fil: components/login-form.jsx
Modifiera handleSubmit funktionen:
// components/login-form.jsx
'use client'
import Link from "next/link"
import { useRouter } from "next/navigation" // Viktigt: använd från next/navigation
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Ta bort: import { authenticate } from '../lib/directus'
// Ta bort: import auth from '../lib/auth'

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      // Anropa din nya API Route
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Inloggningen misslyckades");
      }

      // Omdirigera till företagssidan (eller startsidan) efter lyckad inloggning
      router.push("/companies"); // Ändra till "/" om du vill gå till startsidan
      router.refresh(); // Mycket viktigt! Detta laddar om serverkomponenter med de nya cookies.

    } catch (err) {
      setError(err.message || "Felaktigt email eller lösenord");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // ... resten av din JSX för formuläret (behåll den som den är) ...
  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Ange din e-post nedan för att logga in på ditt konto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Lösenord</Label>
                <Link href="#" className="ml-auto inline-block text-sm underline">
                  Glömt ditt lösenord?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loggar in..." : "Logga in"}
            </Button>
            {/* Kommentera bort eller ta bort Google-inloggningsknappen om den inte används
            <Button variant="outline" className="w-full" disabled={isLoading}>
              Logga in med Google
            </Button>
            */}
          </div>
          <div className="mt-4 text-center text-sm">
            Har du inget konto?{" "}
            <Link href="#" className="underline">
              Registrera dig
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
Use code with caution.
Jsx
Ta bort: Du kan nu ta bort lib/auth.js då den inte längre behövs för localStorage.
Steg 4: Testa Inloggningen
Starta din Next.js-app (npm run dev).
Gå till din inloggningssida (/login).
Försök logga in.
Verifiera i webbläsaren:
Öppna utvecklarverktygen (högerklicka -> Inspektera).
Gå till fliken "Application" (eller "Storage" i Firefox).
Under "Cookies", välj din webbplats (t.ex. http://localhost:3000).
Du bör se directus_access_token och directus_refresh_token. Kolla att kolumnen HttpOnly är ikryssad för dem.
Du bör också bli omdirigerad till /companies (den sidan finns inte än, så du får 404, det är okej för nu).
Del 2: Skapa Server-Renderad Företagslista

Steg 5: Skapa Sidan för Företagslistan
Skapa fil: app/companies/page.jsx
Klistra in och anpassa följande kod:
// app/companies/page.jsx
// Detta är en Server Component som standard

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CompanyList from '@/components/CompanyList'; // Din befintliga UI-komponent
import LogoutButton from '@/components/LogoutButton'; // Vi skapar denna snart

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;

// Funktion för att hämta företag från Directus
async function fetchCompanies(accessToken) {
  if (!accessToken) {
    return null; // Ingen token, kan inte hämta
  }

  try {
    const response = await fetch(`${DIRECTUS_URL}/items/companies`, { // Anpassa '/items/companies' till din Directus collection
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store', // Viktigt: Hämta färsk data varje gång för denna dynamiska sida
    });

    if (response.status === 401) {
      console.warn('Fetch companies: Access token är ogiltig (401).');
      return 'unauthorized'; // Speciellt värde för att signalera ogiltig token
    }

    if (!response.ok) {
      console.error(`Fetch companies: Kunde inte hämta företag. Status: ${response.status}`);
      return null; // Annat fel
    }

    const data = await response.json();
    return data.data || []; // Returnera företagslistan (eller en tom array)
  } catch (error) {
    console.error('Fetch companies: Fel vid hämtning av företag:', error);
    return null;
  }
}

export default async function CompaniesPage() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('directus_access_token')?.value;

  if (!accessToken) {
    // Om ingen token finns, skicka till login.
    // callbackUrl hjälper oss att komma tillbaka hit efter lyckad inloggning.
    redirect('/login?callbackUrl=/companies');
  }

  const companiesData = await fetchCompanies(accessToken);

  if (companiesData === 'unauthorized') {
    // Om token var ogiltig (t.ex. utgången)
    // Här skulle en mer avancerad lösning försöka använda refresh token.
    // För nu omdirigerar vi till login och indikerar att sessionen kan ha gått ut.
    // Vi bör också överväga att rensa de dåliga cookies. Detta kan göras via en redirect till en /api/auth/clear route eller i middleware.
    redirect('/login?error=session_expired&callbackUrl=/companies');
  }

  if (companiesData === null) {
    // Annat fel vid hämtning av företag
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Våra Företag (Server-Renderad)</h1>
          <LogoutButton />
        </div>
        <p className="text-red-500">Kunde inte ladda företagslistan. Försök igen senare.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Våra Företag (Server-Renderad)</h1>
        <LogoutButton />
      </div>
      {companiesData.length > 0 ? (
        <CompanyList companies={companiesData} />
      ) : (
        <p>Inga företag hittades.</p>
      )}
    </div>
  );
}
Use code with caution.
Jsx
Steg 6: Skapa API Route för Utloggning
Skapa fil: app/api/auth/logout/route.js
Klistra in och anpassa följande kod:
// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;

export async function POST() { // Utloggning sker ofta via POST för att undvika CSRF på GET
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('directus_refresh_token')?.value;

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
Use code with caution.
JavaScript
Steg 7: Skapa Utloggningsknapp (Client Component)
Skapa fil: components/LogoutButton.jsx
Klistra in följande kod:
// components/LogoutButton.jsx
"use client"; // Denna komponent behöver vara en client component för onClick

import { useRouter } from "next/navigation";
import { Button } from "./ui/button"; // Antag att du har /components/ui/button.jsx
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login'); // Omdirigera till login-sidan
      router.refresh(); // Ladda om server-komponenter
    } catch (error) {
        console.error("Logout failed:", error);
        // Visa eventuellt ett felmeddelande för användaren
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleLogout} variant="outline" disabled={isLoading}>
      {isLoading ? "Loggar ut..." : "Logga ut"}
    </Button>
  );
}
Use code with caution.
Jsx
Steg 8: Testa Företagssidan och Utloggning
Logga in igen om din session har gått ut. Du bör nu bli omdirigerad till /companies.
Om allt fungerar bör du se listan med företag (eller "Inga företag hittades"). Titeln ska indikera att den är server-renderad.
Klicka på "Logga ut"-knappen.
Du bör bli omdirigerad till /login.
Försök gå direkt till /companies i webbläsaren. Du bör bli omdirigerad tillbaka till /login.
Del 3: (Valfritt men Rekommenderat) Grundläggande Skydd med Middleware

Steg 9: Skapa Middleware-fil
Skapa fil: middleware.js (i roten av ditt projekt, bredvid app och public katalogerna).
Klistra in och anpassa följande kod:
// middleware.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Använd för App Router

// Lista över sidor som kräver inloggning
const protectedRoutes = ['/companies', '/profile']; // Lägg till fler skyddade rutter här
// Lista över sidor som är publika (t.ex. inloggningssidan)
const publicRoutes = ['/login', '/signup'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const cookieStore = cookies(); // Hämta cookies-objektet
  const accessToken = cookieStore.get('directus_access_token')?.value;
  const isAuthenticated = !!accessToken; // Enkel check om token finns

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.includes(pathname);

  if (isProtectedRoute && !isAuthenticated) {
    // Om användaren försöker nå en skyddad sida utan att vara inloggad,
    // skicka dem till inloggningssidan.
    const loginUrl = new URL('/login', request.nextUrl.origin);
    // Spara den ursprungliga sidan så vi kan skicka tillbaka användaren dit efter lyckad inloggning.
    loginUrl.searchParams.set('callbackUrl', pathname); 
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && isAuthenticated && pathname !== '/') { 
    // Om en inloggad användare försöker nå t.ex. /login, skicka dem till en skyddad sida.
    // Undvik omdirigering om de är på startsidan ('/') och den är publik.
    return NextResponse.redirect(new URL('/companies', request.nextUrl.origin)); // Eller till '/'
  }

  // Låt requesten passera om inget av ovanstående gäller.
  return NextResponse.next();
}

// Konfiguration för vilka sökvägar middleware ska köras på.
// Detta undviker att köra middleware på t.ex. API-anrop eller statiska filer.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
Use code with caution.
JavaScript
Förstå: Middleware körs på servern innan sidan renderas. Denna enkla middleware kollar om användaren har en access token och omdirigerar dem baserat på om sidan är skyddad eller publik.
Steg 10: Testa med Middleware
Starta om din Next.js-app.
Testa att navigera till /companies utan att vara inloggad. Du bör automatiskt omdirigeras till /login.
Logga in. Försök sedan gå till /login igen. Du bör automatiskt omdirigeras till /companies.
Sammanfattning för Juniorutvecklaren:

Fokusera på en del i taget. Börja med inloggningen.
Använd webbläsarens utvecklarverktyg flitigt för att inspektera cookies och nätverksanrop.
Läs felmeddelanden noga, både i webbläsarens konsol och i terminalen där Next.js körs.
router.refresh() är din vän efter att cookies har ändrats på servern och du vill att Server Components ska se de nya värdena.
Denna guide täcker inte automatisk förnyelse (refresh) av access tokens på ett avancerat sätt, men lägger grunden för det. För nu, om en token går ut, kommer användaren att behöva logga in igen.