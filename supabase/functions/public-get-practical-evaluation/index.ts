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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ success: false, error: "Metodo nao permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return json({ success: false, error: "Token ausente." }, 401);
    }

    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      return json({ success: false, error: "Servidor sem configuracao JWT." }, 500);
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    const avaliacaoId =
      typeof payload?.practical_evaluation_id === "string"
        ? payload.practical_evaluation_id
        : null;
    const isPublicAccess = payload?.public_practical_access === true;

    if (!avaliacaoId || !isPublicAccess) {
      return json({ success: false, error: "Token invalido." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from("avaliacoes_praticas")
      .select(`
        id,
        status,
        data_solicitacao,
        data_resposta,
        proxima_data_envio,
        avaliador_nome,
        avaliador_email,
        parecer_empresa,
        observacoes,
        resumo_atividades,
        manteve_turno_contrato,
        justificativa_turno,
        competencia_comunicacao,
        competencia_trabalho_equipe,
        competencia_proatividade,
        competencia_responsabilidade,
        competencia_assiduidade,
        pontos_fortes,
        pontos_melhoria,
        feedback_fornecido,
        quantidade_feedbacks,
        medidas_disciplinares,
        quantidade_medidas_disciplinares,
        motivos_medidas_disciplinares,
        jovem:jovens(
          nome_completo,
          data_admissao,
          turma:turmas(
            nome,
            curso:cursos(nome)
          )
        ),
        empresa:empresas(nome_fantasia, razao_social)
      `)
      .eq("id", avaliacaoId)
      .maybeSingle();

    if (error) {
      return json({ success: false, error: error.message }, 500);
    }
    if (!data) {
      return json({ success: false, error: "Avaliacao nao encontrada." }, 404);
    }

    return json({ success: true, avaliacao: data });
  } catch (error: any) {
    return json(
      { success: false, error: error?.message || "Erro ao carregar avaliacao." },
      401,
    );
  }
});
