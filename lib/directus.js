"use server";
const url = process.env.NEXT_PUBLIC_DIRECTUS_URL;

export async function authenticate(email, password) {
  try {
    const response = await fetch(`${url}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });
    console.log(response);
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}

export async function refreshCredentials(refreshToken) {
  try {
    const response = await fetch(`${url}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        refresh_mode: "json",
      }),
    });
    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.statusText}`);
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error("Refresh error:", error);
    throw error;
  }
}
