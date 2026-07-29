import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "npm:jose@5.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Metodo nao permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI");
    const defaultSender = Deno.env.get("GOOGLE_OAUTH_DEFAULT_SENDER") ?? "hub@cefort.org.br";

    if (!jwtSecret || !clientId || !redirectUri) {
      return json({ success: false, error: "OAuth do Google nao configurado." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData } = await userClient.auth.getUser();
    const user = authData.user;
    if (!user) {
      return json({ success: false, error: "Nao autenticado." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const returnTo = typeof body?.return_to === "string" && body.return_to.startsWith("/")
      ? body.return_to
      : "/configuracoes";

    const state = await new SignJWT({
      action: "gmail_oauth_connect",
      user_id: user.id,
      return_to: returnTo,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(jwtSecret));

    const scope = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid",
    ].join(" ");

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scope);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("login_hint", defaultSender);
    url.searchParams.set("state", state);

    return json({ success: true, authorization_url: url.toString() });
  } catch (error: any) {
    return json({ success: false, error: error?.message || "Erro ao iniciar OAuth." }, 500);
  }
});
