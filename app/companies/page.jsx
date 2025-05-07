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
  // Next.js 15 kräver asynkron hantering av cookies
  const cookieStore = await cookies();
  // Hämta access token
  const accessTokenCookie = cookieStore.get('directus_access_token');
  const accessToken = accessTokenCookie?.value || null;

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