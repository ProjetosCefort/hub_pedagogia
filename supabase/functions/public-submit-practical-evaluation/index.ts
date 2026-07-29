import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
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

const RATING_LABELS: Record<string, string> = {
  excelente: "Excelente",
  bom: "Bom",
  regular: "Regular",
  insuficiente: "Insuficiente",
};

const COMPETENCY_LABELS: Array<[string, string]> = [
  ["competencia_comunicacao", "Comunicação"],
  ["competencia_trabalho_equipe", "Trabalho em equipe"],
  ["competencia_proatividade", "Proatividade"],
  ["competencia_responsabilidade", "Responsabilidade"],
  ["competencia_assiduidade", "Assiduidade"],
];

function stringField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function booleanField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "boolean" ? value : null;
}

function integerField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  return null;
}

function ratingField(body: Record<string, unknown>, key: string) {
  const value = stringField(body, key);
  return Object.keys(RATING_LABELS).includes(value) ? value : "";
}

function yesNo(value: boolean | null) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "Não informado";
}

function buildParecerEmpresa(data: Record<string, unknown>) {
  const lines = [
    `Resumo das atividades: ${data.resumo_atividades || "Não informado"}`,
    `Manteve o turno estipulado em contrato: ${yesNo(data.manteve_turno_contrato as boolean | null)}`,
  ];

  if (data.manteve_turno_contrato === false) {
    lines.push(`Justificativa da mudança de turno: ${data.justificativa_turno || "Não informado"}`);
  }

  lines.push("Competências comportamentais:");
  COMPETENCY_LABELS.forEach(([key, label]) => {
    const value = typeof data[key] === "string" ? data[key] as string : "";
    lines.push(`- ${label}: ${RATING_LABELS[value] || "Não informado"}`);
  });

  lines.push(`Pontos fortes: ${data.pontos_fortes || "Não informado"}`);
  lines.push(`Pontos de melhoria: ${data.pontos_melhoria || "Não informado"}`);
  lines.push(`Feedback fornecido ao aprendiz: ${yesNo(data.feedback_fornecido as boolean | null)}`);
  if (data.feedback_fornecido === true) {
    lines.push(`Quantidade de feedbacks: ${data.quantidade_feedbacks ?? 0}`);
  }
  lines.push(`Medidas disciplinares: ${yesNo(data.medidas_disciplinares as boolean | null)}`);
  if (data.medidas_disciplinares === true) {
    lines.push(`Quantidade de medidas disciplinares: ${data.quantidade_medidas_disciplinares ?? 0}`);
    lines.push(`Motivos: ${data.motivos_medidas_disciplinares || "Não informado"}`);
  }

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
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

    const { payload: jwtPayload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    const avaliacaoId =
      typeof jwtPayload?.practical_evaluation_id === "string"
        ? jwtPayload.practical_evaluation_id
        : null;
    const isPublicAccess = jwtPayload?.public_practical_access === true;

    if (!avaliacaoId || !isPublicAccess) {
      return json({ success: false, error: "Token invalido." }, 401);
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const avaliadorNome = stringField(body, "avaliador_nome");
    const avaliadorEmail = stringField(body, "avaliador_email");
    const evaluationPayload = {
      resumo_atividades: stringField(body, "resumo_atividades"),
      manteve_turno_contrato: booleanField(body, "manteve_turno_contrato"),
      justificativa_turno: stringField(body, "justificativa_turno"),
      competencia_comunicacao: ratingField(body, "competencia_comunicacao"),
      competencia_trabalho_equipe: ratingField(body, "competencia_trabalho_equipe"),
      competencia_proatividade: ratingField(body, "competencia_proatividade"),
      competencia_responsabilidade: ratingField(body, "competencia_responsabilidade"),
      competencia_assiduidade: ratingField(body, "competencia_assiduidade"),
      pontos_fortes: stringField(body, "pontos_fortes"),
      pontos_melhoria: stringField(body, "pontos_melhoria"),
      feedback_fornecido: booleanField(body, "feedback_fornecido"),
      quantidade_feedbacks: integerField(body, "quantidade_feedbacks"),
      medidas_disciplinares: booleanField(body, "medidas_disciplinares"),
      quantidade_medidas_disciplinares: integerField(body, "quantidade_medidas_disciplinares"),
      motivos_medidas_disciplinares: stringField(body, "motivos_medidas_disciplinares"),
    };

    if (!avaliadorNome) {
      return json({ success: false, error: "Nome do gestor obrigatorio." }, 400);
    }
    if (!evaluationPayload.resumo_atividades) {
      return json({ success: false, error: "Resumo das atividades obrigatorio." }, 400);
    }
    if (evaluationPayload.manteve_turno_contrato === null) {
      return json({ success: false, error: "Informe se o turno foi mantido." }, 400);
    }
    if (evaluationPayload.manteve_turno_contrato === false && !evaluationPayload.justificativa_turno) {
      return json({ success: false, error: "Justificativa da mudança de turno obrigatoria." }, 400);
    }
    const missingCompetency = COMPETENCY_LABELS.find(([key]) => !evaluationPayload[key as keyof typeof evaluationPayload]);
    if (missingCompetency) {
      return json({ success: false, error: `Competencia obrigatoria: ${missingCompetency[1]}.` }, 400);
    }
    if (!evaluationPayload.pontos_fortes || !evaluationPayload.pontos_melhoria) {
      return json({ success: false, error: "Pontos fortes e pontos de melhoria sao obrigatorios." }, 400);
    }
    if (evaluationPayload.feedback_fornecido === null) {
      return json({ success: false, error: "Informe se houve feedback ao aprendiz." }, 400);
    }
    if (evaluationPayload.feedback_fornecido === true && !evaluationPayload.quantidade_feedbacks) {
      return json({ success: false, error: "Quantidade de feedbacks obrigatoria." }, 400);
    }
    if (evaluationPayload.medidas_disciplinares === null) {
      return json({ success: false, error: "Informe se houve medidas disciplinares." }, 400);
    }
    if (
      evaluationPayload.medidas_disciplinares === true &&
      (!evaluationPayload.quantidade_medidas_disciplinares || !evaluationPayload.motivos_medidas_disciplinares)
    ) {
      return json({ success: false, error: "Quantidade e motivos das medidas disciplinares sao obrigatorios." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: existing, error: existingError } = await supabase
      .from("avaliacoes_praticas")
      .select("id, data_resposta")
      .eq("id", avaliacaoId)
      .maybeSingle();

    if (existingError) {
      return json({ success: false, error: existingError.message }, 500);
    }
    if (!existing) {
      return json({ success: false, error: "Avaliacao nao encontrada." }, 404);
    }
    if (existing.data_resposta) {
      return json({ success: false, error: "Esta ficha ja foi enviada e nao pode ser alterada." }, 409);
    }

    const { error } = await supabase
      .from("avaliacoes_praticas")
      .update({
        ...evaluationPayload,
        parecer_empresa: buildParecerEmpresa(evaluationPayload),
        avaliador_nome: avaliadorNome || null,
        avaliador_email: avaliadorEmail || null,
        status: "respondida",
        data_resposta: new Date().toISOString(),
      })
      .eq("id", avaliacaoId);

    if (error) {
      return json({ success: false, error: error.message }, 500);
    }

    return json({ success: true });
  } catch (error: any) {
    return json(
      { success: false, error: error?.message || "Erro ao enviar resposta." },
      401,
    );
  }
});
