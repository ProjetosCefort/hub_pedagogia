import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  if (req.method !== "GET") {
    return json({ success: false, error: "Metodo nao permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) {
      return json({ success: false, error: "Nao autenticado." }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase
      .from("integracoes_email")
      .select("provider, sender_email, scope, last_connected_at, access_token_expires_at")
      .eq("provider", "gmail")
      .maybeSingle();

    if (error) {
      return json({ success: false, error: error.message }, 500);
    }

    return json({
      success: true,
      connected: Boolean(data),
      integration: data || null,
    });
  } catch (error: any) {
    return json({ success: false, error: error?.message || "Erro ao consultar integração." }, 500);
  }
});
