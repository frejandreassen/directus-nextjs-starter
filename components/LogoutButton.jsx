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