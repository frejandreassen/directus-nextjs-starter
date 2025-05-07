'use client'
import Link from "next/link"
import { useRouter } from "next/navigation" // Viktigt: använd från next/navigation
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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