import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5.2.0";

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

function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as T;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Metodo nao permitido." }, 405);
  }

  try {
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!jwtSecret || !clientId || !clientSecret || !redirectUri) {
      return json({ success: false, error: "OAuth do Google nao configurado." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : "";
    const state = typeof body?.state === "string" ? body.state : "";

    if (!code || !state) {
      return json({ success: false, error: "Code ou state ausente." }, 400);
    }

    const { payload } = await jwtVerify(state, new TextEncoder().encode(jwtSecret));
    if (payload?.action !== "gmail_oauth_connect" || typeof payload?.user_id !== "string") {
      return json({ success: false, error: "State invalido." }, 401);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      console.error("gmail-oauth-callback: token exchange error", tokenData);
      return json({ success: false, error: tokenData?.error_description || "Falha ao trocar code por token." }, 502);
    }

    const refreshToken = typeof tokenData?.refresh_token === "string" ? tokenData.refresh_token : "";
    const accessToken = typeof tokenData?.access_token === "string" ? tokenData.access_token : "";
    const tokenType = typeof tokenData?.token_type === "string" ? tokenData.token_type : null;
    const scope = typeof tokenData?.scope === "string" ? tokenData.scope : null;
    const expiresIn = typeof tokenData?.expires_in === "number" ? tokenData.expires_in : null;

    if (!refreshToken || !accessToken) {
      return json({ success: false, error: "Google nao retornou refresh token. Revogue o acesso anterior e tente novamente com prompt de consentimento." }, 400);
    }

    const idTokenPayload = typeof tokenData?.id_token === "string"
      ? decodeJwtPayload<{ email?: string }>(tokenData.id_token)
      : null;
    const senderEmail = idTokenPayload?.email;

    if (!senderEmail) {
      return json({ success: false, error: "Nao foi possivel identificar o e-mail conectado." }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    const { error } = await supabase
      .from("integracoes_email")
      .upsert({
        provider: "gmail",
        sender_email: senderEmail,
        refresh_token: refreshToken,
        access_token: accessToken,
        token_type: tokenType,
        scope,
        access_token_expires_at: expiresAt,
        connected_by: payload.user_id,
        last_connected_at: new Date().toISOString(),
      }, { onConflict: "provider" });

    if (error) {
      return json({ success: false, error: error.message }, 500);
    }

    return json({
      success: true,
      sender_email: senderEmail,
      return_to: typeof payload.return_to === "string" ? payload.return_to : "/configuracoes",
    });
  } catch (error: any) {
    return json({ success: false, error: error?.message || "Erro ao concluir OAuth." }, 500);
  }
});
