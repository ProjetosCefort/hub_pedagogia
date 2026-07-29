/**
 * Cliente Supabase para acesso público do jovem (token temporário).
 * Envia o JWT armazenado em sessionStorage em todas as requisições.
 * Usar apenas nas páginas /acesso-jovem e /meu-registro.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

export const PUBLIC_ACCESS_JWT_KEY = "public_access_jwt";

function getPublicAccessFetch(): typeof fetch {
  const baseFetch = fetch.bind(globalThis);
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const jwt = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(PUBLIC_ACCESS_JWT_KEY) : null;
    const headers = new Headers(init?.headers);
    if (jwt) headers.set("Authorization", `Bearer ${jwt}`);
    return baseFetch(input, { ...init, headers });
  };
}

let publicAccessClientInstance: ReturnType<typeof createClient> | null = null;

export function getPublicAccessClient() {
  if (!publicAccessClientInstance) {
    publicAccessClientInstance = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: getPublicAccessFetch() },
    });
  }
  return publicAccessClientInstance;
}

export function setPublicAccessJwt(jwt: string | null) {
  if (typeof sessionStorage === "undefined") return;
  if (jwt) sessionStorage.setItem(PUBLIC_ACCESS_JWT_KEY, jwt);
  else sessionStorage.removeItem(PUBLIC_ACCESS_JWT_KEY);
}

export function getPublicAccessJwt(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(PUBLIC_ACCESS_JWT_KEY);
}
