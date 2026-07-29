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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    const configuredAppUrl = Deno.env.get("PUBLIC_APP_URL") ?? Deno.env.get("SITE_URL") ?? "";
    const originHeader = req.headers.get("Origin") ?? "";
    const refererHeader = req.headers.get("Referer") ?? "";

    if (!jwtSecret) {
      return json({ success: false, error: "Servidor sem configuracao JWT." }, 500);
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
    const avaliacaoId = typeof body?.avaliacao_id === "string" ? body.avaliacao_id : "";
    if (!avaliacaoId) {
      return json({ success: false, error: "Avaliacao invalida." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: avaliacao, error } = await adminClient
      .from("avaliacoes_praticas")
      .select("id, avaliador_email")
      .eq("id", avaliacaoId)
      .maybeSingle();

    if (error || !avaliacao) {
      return json({ success: false, error: "Avaliacao nao encontrada." }, 404);
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14;
    const token = await new SignJWT({
      practical_evaluation_id: avaliacao.id,
      public_practical_access: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(new TextEncoder().encode(jwtSecret));

    const refererOrigin = (() => {
      try {
        return refererHeader ? new URL(refererHeader).origin : "";
      } catch {
        return "";
      }
    })();
    const baseUrl = (configuredAppUrl || originHeader || refererOrigin).replace(/\/$/, "");
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      return json({
        success: false,
        error: "URL publica do sistema nao configurada. Defina PUBLIC_APP_URL ou SITE_URL.",
      }, 500);
    }
    const publicUrl = `${baseUrl}/avaliacao-pratica/empresa?token=${encodeURIComponent(token)}`;

    return json({
      success: true,
      access_token: token,
      public_url: publicUrl,
      avaliador_email: avaliacao.avaliador_email,
      expires_at: expiresAt,
    });
  } catch (error: any) {
    return json(
      { success: false, error: error?.message || "Erro ao gerar link publico." },
      500,
    );
  }
});
