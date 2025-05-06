"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import auth from "@/lib/auth";
import { refreshCredentials } from "@/lib/directus";

export default function Home() {
  // Vi behöver inte URL:en till Directus längre eftersom vi inte hämtar data här
  // const url = process.env.NEXT_PUBLIC_DIRECTUS_URL; 

  const [credentials, setCredentials] = useState(null); // Behövs fortfarande för att kolla inloggningsstatus
  const [isLoading, setIsLoading] = useState(true); // Behövs för att visa laddningsstatus medan vi kollar inloggning
  // Vi behöver inte products-state längre
  // const [products, setProducts] = useState([]); 

  const router = useRouter(); // Behövs för omdirigering

  const checkAuthStatus = async () => { // Döp om funktionen då den inte längre "fetchar data"
    try {
      let currentCredentials = auth.getCredentials(); // Hämta credentials

      if (!currentCredentials) {
        console.log("No credentials found, redirecting to login.");
        // Ingen credential => omdirigera direkt till login
        router.push("/login");
        // Sätt isLoading till false här också, även om vi omdirigerar, för renlighet
        setIsLoading(false); 
        return; // Avbryt vidare exekvering om inte inloggad
      }

      // Sätt credentials-state om de finns
      setCredentials(currentCredentials);

      // Valfritt men bra: kolla om token behöver förnyas innan vi fortsätter
      // Detta säkerställer att användaren har en giltig token om de stannar kvar
      if (currentCredentials.expires_at - 1000 * 60 * 5 < new Date().getTime()) {
        console.log("Credentials near expiry, refreshing...");
        const refreshedCredentials = await refreshCredentials(
          currentCredentials.refresh_token,
        );
        auth.setCredentials(refreshedCredentials);
        setCredentials(refreshedCredentials);
        console.log("Credentials refreshed.");
        // Uppdatera currentCredentials om de förnyades för att vara säker
        currentCredentials = refreshedCredentials; 
      }

      // Om vi kommer hit är användaren inloggad (och eventuellt fick sin token förnyad)
      setIsLoading(false); // Stoppa laddningsindikatorn

      // Produktenhämtningslogiken är borttagen härifrån

    } catch (error) {
      console.log("Error during authentication check or refresh:", error);
      // Om något går fel under hämtning/förnyelse, antag att inloggningen är ogiltig
      router.push("/login"); // Omdirigera till login vid fel
      setIsLoading(false); // Sätt isLoading till false vid fel
    }
  };

  useEffect(() => {
    checkAuthStatus(); // Kör autentiseringskollen när komponenten laddas
    // Tom array [] gör att effekten bara körs en gång efter första renderingen
  }, []); 

  // Visa laddningsindikator medan vi kollar inloggningsstatus
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Om isLoading är false och vi inte har omdirigerats,
  // betyder det att användaren är inloggad. Visa välkomstmeddelandet.
  // Vi använder credentials-staten här, men egentligen bara för att veta ATT vi är inloggade.
  // Själva credentials-objektet behöver inte visas.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
        <p>You are logged in.</p>
        {/* Du kan lägga till mer information här om det finns i credentials, t.ex. användarnamn */}
        {/* Exempel: <p>User: {credentials?.user?.email}</p> */}
      </div>
    </div>
  );
}