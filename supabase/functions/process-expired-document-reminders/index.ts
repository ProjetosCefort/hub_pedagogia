import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DOCUMENT_REMINDER_CRON_SECRET = Deno.env.get("DOCUMENT_REMINDER_CRON_SECRET") ?? "";
const PUBLIC_APP_URL = (Deno.env.get("PUBLIC_APP_URL") ?? "https://hubcefort.skadyr.com").replace(/\/$/, "");
const WHATSAPP_REMINDER_WEBHOOK_URL = Deno.env.get("WHATSAPP_REMINDER_WEBHOOK_URL") ?? "";

const DEFAULT_REMINDER_TYPES = [
  "comprovante_escolaridade",
] as const;

const ALLOWED_TYPES = [
  "rg",
  "cpf",
  "comprovante_endereco",
  "comprovante_escolaridade",
  "carteira_trabalho",
] as const;

const REMINDER_TYPES = parseReminderTypes(Deno.env.get("DOCUMENT_REMINDER_TYPES"));

const DOC_LABEL: Record<string, string> = {
  rg: "RG",
  cpf: "CPF",
  comprovante_endereco: "Comprovante de endereço",
  comprovante_escolaridade: "Comprovante de escolaridade/matrícula",
  carteira_trabalho: "Carteira de trabalho",
  laudo_pcd: "Laudo PCD",
  outros: "Outros",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const isAuthorized =
      token &&
      (token === SUPABASE_SERVICE_ROLE_KEY ||
        (DOCUMENT_REMINDER_CRON_SECRET && token === DOCUMENT_REMINDER_CRON_SECRET));

    if (!isAuthorized) {
      return json({ success: false, error: "Nao autorizado." }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const todayIso = new Date().toISOString().slice(0, 10);

    const { data: docs, error: docsError } = await supabase
      .from("documentos_jovem")
      .select(`
        id,
        tipo,
        validade_em,
        jovem_id,
        inscricao_id,
        lembrete_vencimento_enviado_em,
        status_validacao,
        jovem:jovens(escolaridade_regular_status)
      `)
      .in("tipo", REMINDER_TYPES)
      .eq("status_validacao", "aprovado")
      .lte("validade_em", todayIso)
      .is("lembrete_vencimento_enviado_em", null)
      .limit(500);

    if (docsError) {
      return json({ success: false, error: docsError.message }, 500);
    }

    let remindersSent = 0;
    let emailSent = 0;
    let whatsappSent = 0;
    const failures: string[] = [];

    for (const doc of docs || []) {
      try {
        if (shouldSkipDocument(doc)) {
          await markReminderProcessed(supabase, doc.id);
          continue;
        }

        const profile = await resolveProfile(supabase, doc.jovem_id, doc.inscricao_id);
        if (!profile) {
          failures.push(`${doc.id}: perfil não encontrado`);
          continue;
        }

        if (await hasCurrentValidDocument(supabase, doc, todayIso)) {
          await markReminderProcessed(supabase, doc.id);
          continue;
        }

        const link = `${PUBLIC_APP_URL}/acesso-jovem`;
        const tipoLabel = DOC_LABEL[doc.tipo] ?? doc.tipo;
        let delivered = false;

        if (profile.email) {
          const ok = await sendEmailReminder({
            to: profile.email,
            nome: profile.nome,
            link,
            tipoDocumento: tipoLabel,
          });
          if (ok) {
            emailSent += 1;
            delivered = true;
          } else {
            failures.push(`${doc.id}: falha no envio de e-mail`);
          }
        } else {
          failures.push(`${doc.id}: e-mail não informado`);
        }

        if (WHATSAPP_REMINDER_WEBHOOK_URL && profile.telefone) {
          const ok = await sendWhatsAppReminder({
            telefone: profile.telefone,
            nome: profile.nome,
            link,
            tipoDocumento: tipoLabel,
            documentoId: doc.id,
          });
          if (ok) {
            whatsappSent += 1;
            delivered = true;
          } else {
            failures.push(`${doc.id}: falha no envio de WhatsApp`);
          }
        }

        if (!delivered) {
          continue;
        }

        if (!(await markReminderProcessed(supabase, doc.id))) {
          failures.push(`${doc.id}: lembrete não marcado`);
          continue;
        }

        if (doc.jovem_id) {
          await supabase.rpc("refresh_pendencia_notifications_for_jovem", {
            p_jovem_id: doc.jovem_id,
          });
        }

        remindersSent += 1;
      } catch (error) {
        console.error("process-expired-document-reminders item error:", error);
        failures.push(`${doc.id}: erro inesperado`);
      }
    }

    return json(
      {
        success: true,
        processed: docs?.length || 0,
        reminders_sent: remindersSent,
        emails_sent: emailSent,
        whatsapp_sent: whatsappSent,
        failures,
      },
      200,
    );
  } catch (error: any) {
    console.error("process-expired-document-reminders:", error);
    return json({ success: false, error: "Erro inesperado." }, 500);
  }
});

function parseReminderTypes(value: string | null): string[] {
  const parsed = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => ALLOWED_TYPES.includes(item as typeof ALLOWED_TYPES[number]));

  return parsed.length > 0 ? parsed : [...DEFAULT_REMINDER_TYPES];
}

function shouldSkipDocument(doc: {
  tipo: string;
  jovem?: { escolaridade_regular_status?: string | null } | null;
}) {
  return (
    doc.tipo === "comprovante_escolaridade" &&
    doc.jovem?.escolaridade_regular_status === "ensino_medio_completo"
  );
}

async function resolveProfile(
  supabase: ReturnType<typeof createClient>,
  jovemId: string | null,
  inscricaoId: string | null,
) {
  if (jovemId) {
    const { data, error } = await supabase
      .from("jovens")
      .select("nome_completo, email, celular, telefone")
      .eq("id", jovemId)
      .maybeSingle();
    if (!error && data) {
      return {
        nome: data.nome_completo || "Jovem",
        email: data.email || null,
        telefone: (data.celular || data.telefone || "").replace(/\D/g, "") || null,
      };
    }
  }

  if (inscricaoId) {
    const { data, error } = await supabase
      .from("inscricoes_jovens_aprendizes")
      .select("nome_completo, email, contato_1")
      .eq("id", inscricaoId)
      .maybeSingle();
    if (!error && data) {
      return {
        nome: data.nome_completo || "Jovem",
        email: data.email || null,
        telefone: (data.contato_1 || "").replace(/\D/g, "") || null,
      };
    }
  }

  return null;
}

async function hasCurrentValidDocument(
  supabase: ReturnType<typeof createClient>,
  doc: {
    id: string;
    tipo: string;
    jovem_id: string | null;
    inscricao_id: string | null;
  },
  todayIso: string,
) {
  let query = supabase
    .from("documentos_jovem")
    .select("id")
    .neq("id", doc.id)
    .eq("tipo", doc.tipo)
    .eq("status_validacao", "aprovado")
    .or(`validade_em.is.null,validade_em.gt.${todayIso}`)
    .limit(1);

  if (doc.jovem_id) {
    query = query.eq("jovem_id", doc.jovem_id);
  } else if (doc.inscricao_id) {
    query = query.eq("inscricao_id", doc.inscricao_id);
  } else {
    return false;
  }

  const { data, error } = await query;
  if (error) {
    console.error("hasCurrentValidDocument:", error);
    return false;
  }

  return Boolean(data?.length);
}

async function markReminderProcessed(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
) {
  const { error } = await supabase
    .from("documentos_jovem")
    .update({ lembrete_vencimento_enviado_em: new Date().toISOString() })
    .eq("id", documentId);

  return !error;
}

async function sendEmailReminder(params: {
  to: string;
  nome: string;
  link: string;
  tipoDocumento: string;
}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      to: params.to,
      template: "documentos_renovacao",
      payload: {
        nome: params.nome,
        link: params.link,
        tipo_documento: params.tipoDocumento,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  return response.ok && Boolean(payload?.success);
}

async function sendWhatsAppReminder(params: {
  telefone: string;
  nome: string;
  link: string;
  tipoDocumento: string;
  documentoId: string;
}) {
  try {
    const response = await fetch(WHATSAPP_REMINDER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "whatsapp",
        to: params.telefone,
        document_id: params.documentoId,
        template: "documentos_renovacao",
        payload: {
          nome: params.nome,
          tipo_documento: params.tipoDocumento,
          link: params.link,
          mensagem: `Olá, ${params.nome}! Seu documento (${params.tipoDocumento}) venceu. Atualize pelo link: ${params.link}`,
        },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
