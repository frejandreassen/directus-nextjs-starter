"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();

  const goToCompanies = () => {
    router.push("/companies");
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Välkommen till Directus Frontend Starter!</h1>
        <p className="mb-6">Det här är startsidan för din Next.js-applikation med Directus.</p>
        <Button onClick={goToCompanies}>Gå till företag</Button>
      </div>
    </div>
  );
}