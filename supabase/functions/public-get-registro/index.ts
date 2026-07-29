import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ success: false, error: "Método não permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return json({ success: false, error: "Token ausente." }, 401);
    }

    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      return json({ success: false, error: "Servidor sem configuração JWT." }, 500);
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    const jovemId = typeof payload?.jovem_id === "string" ? payload.jovem_id : null;
    const inscricaoId = typeof payload?.inscricao_id === "string" ? payload.inscricao_id : null;
    const isPublicAccess = payload?.public_access === true;

    if (!jovemId || !isPublicAccess) {
      return json({ success: false, error: "Token inválido." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const [jovemRes, inscricaoRes, docsRes] = await Promise.all([
      supabase
        .from("jovens")
        .select("id, nome_completo, data_nascimento, email, celular, status")
        .eq("id", jovemId)
        .maybeSingle(),
      inscricaoId
        ? supabase
            .from("inscricoes_jovens_aprendizes")
            .select("id, nome_completo, data_nascimento, email, contato_1, status")
            .eq("id", inscricaoId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("documentos_jovem")
        .select("id, tipo, nome_arquivo, status_validacao, enviado_em")
        .eq("jovem_id", jovemId)
        .order("enviado_em", { ascending: false }),
    ]);

    if (jovemRes.error) {
      return json({ success: false, error: jovemRes.error.message }, 500);
    }
    if (inscricaoRes?.error) {
      return json({ success: false, error: inscricaoRes.error.message }, 500);
    }
    if (!jovemRes.data && !inscricaoRes?.data) {
      return json({ success: false, error: "Sessão inválida ou expirada." }, 401);
    }
    if (docsRes.error) {
      return json({ success: false, error: docsRes.error.message }, 500);
    }

    return json(
      {
        success: true,
        jovem: jovemRes.data,
        inscricao: inscricaoRes?.data || null,
        documentos: docsRes.data || [],
      },
      200,
    );
  } catch (error: any) {
    return json(
      { success: false, error: error?.message || "Erro inesperado ao carregar registro." },
      401,
    );
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
