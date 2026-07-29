// Edge Function: envio de e-mails transacionais para inscrição pública
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "contato@cefort.org.br";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

type EmailTemplate =
  | "inscricao_confirmacao"
  | "recuperar_acesso"
  | "documentos_upload_link"
  | "documentos_renovacao"
  | "documento_validacao"
  | "agendamento_jovem"
  | "avaliacao_pratica_empresa";

interface SendEmailRequest {
  to: string;
  template: EmailTemplate;
  payload?: Record<string, string>;
}

interface TemplateResult {
  subject: string;
  html: string;
  text: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if ((!RESEND_API_KEY || !RESEND_FROM_EMAIL) && (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET)) {
    return jsonResponse(
      { success: false, error: "Servico de email nao configurado." },
      500,
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as SendEmailRequest | null;
    if (!body) {
      return jsonResponse({ success: false, error: "Payload invalido." }, 400);
    }

    const { to, template, payload = {} } = body;
    if (
      !to ||
      !template ||
      ![
        "inscricao_confirmacao",
        "recuperar_acesso",
        "documentos_upload_link",
        "documentos_renovacao",
        "documento_validacao",
        "agendamento_jovem",
        "avaliacao_pratica_empresa",
      ].includes(template)
    ) {
      return jsonResponse({ success: false, error: "Requisicao invalida." }, 400);
    }

    const sanitizedTo = to.trim().toLowerCase();
    if (!sanitizedTo || !sanitizedTo.includes("@")) {
      return jsonResponse({ success: false, error: "Destinatario invalido." }, 400);
    }

    const emailContent = buildTemplate(template, payload);
    const delivery = await sendWithAvailableProvider({
      to: sanitizedTo,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!delivery.success) {
      console.error("send-email: provider error", delivery.error);
      return jsonResponse({ success: false, error: delivery.error || "Falha ao enviar email." }, 502);
    }

    await logEmailAudit({
      to: sanitizedTo,
      template,
      messageId: delivery.messageId ?? null,
      link: payload.link,
    });

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("send-email: unexpected error", error);
    return jsonResponse({ success: false, error: "Erro inesperado ao enviar email." }, 500);
  }
});

async function sendWithAvailableProvider(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string | null; error?: string }> {
  const gmailResult = await sendViaGmail(params);
  if (gmailResult.success) {
    return gmailResult;
  }

  if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const resendBody = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      return { success: false, error: resendBody?.message || resendBody?.error || "Falha ao enviar pelo Resend." };
    }

    return { success: true, messageId: resendBody?.id ?? null };
  }

  return gmailResult;
}

async function sendViaGmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string | null; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
    return { success: false, error: "Integração Gmail indisponível." };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: integration, error } = await supabase
    .from("integracoes_email")
    .select("sender_email, refresh_token")
    .eq("provider", "gmail")
    .maybeSingle();

  if (error || !integration) {
    return { success: false, error: error?.message || "Nenhuma conta Gmail conectada." };
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData?.access_token) {
    return { success: false, error: tokenData?.error_description || tokenData?.error || "Falha ao atualizar token Gmail." };
  }

  const rawMessage = buildRawMimeMessage({
    from: integration.sender_email,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawMessage }),
  });

  const gmailBody = await gmailResponse.json().catch(() => ({}));
  if (!gmailResponse.ok) {
    return { success: false, error: gmailBody?.error?.message || "Falha ao enviar pelo Gmail." };
  }

  await supabase
    .from("integracoes_email")
    .update({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type ?? null,
      scope: tokenData.scope ?? null,
      access_token_expires_at:
        typeof tokenData.expires_in === "number"
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
    })
    .eq("provider", "gmail");

  return { success: true, messageId: gmailBody?.id ?? null };
}

function buildRawMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const boundary = `hubcefort-${crypto.randomUUID()}`;
  const message = [
    `From: HubCefort <${params.from}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    params.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    params.html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return base64UrlEncode(message);
}

function base64UrlEncode(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildTemplate(template: EmailTemplate, payload: Record<string, string>): TemplateResult {
  const baseStyles = `
    body { font-family: Arial, sans-serif; background: #f7f7fb; color: #1f2933; padding: 0; margin: 0; }
    .container { max-width: 600px; margin: auto; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 20px 45px rgba(15,23,42,0.08); border: 1px solid #e5e7eb; }
    .cta { display: inline-block; padding: 14px 28px; background: #c80c96; color: #fff; border-radius: 999px; text-decoration: none; font-weight: bold; margin: 24px 0; }
    .muted { color: #6b7280; font-size: 14px; }
  `;

  switch (template) {
    case "inscricao_confirmacao": {
      const link = payload.link ?? "#";
      return {
        subject: "Continue sua inscrição - Jovem Aprendiz CEFORT",
        html: `
          <html><head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <p class="muted">#JovemAprendiz • Acesso Seguro</p>
              <div class="card">
                <h2>Vamos continuar sua inscrição?</h2>
                <p>Para concluir ou atualizar seu cadastro, acesse o link único abaixo. Ele expira em poucos dias para mantermos tudo seguro.</p>
                <p style="text-align:center;">
                  <a class="cta" href="${link}">Acessar minha inscrição</a>
                </p>
                <p class="muted">Se o botão não funcionar, copie e cole este link:<br/>${link}</p>
                <p class="muted">Dúvidas? Fale com nossa equipe: ${SUPPORT_EMAIL}</p>
              </div>
            </div>
          </body></html>
        `,
        text:
          `Vamos continuar sua inscrição?\nAcesse: ${link}\nSe precisar de ajuda, contate ${SUPPORT_EMAIL}.`,
      };
    }
    case "recuperar_acesso": {
      const link = payload.link ?? "#";
      return {
        subject: "Recupere o acesso ao seu cadastro - Jovem Aprendiz CEFORT",
        html: `
          <html><head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <p class="muted">#JovemAprendiz • Recuperação de acesso</p>
              <div class="card">
                <h2>Seu link exclusivo chegou!</h2>
                <p>Utilize o botão abaixo para retomar sua inscrição de forma segura. Caso não tenha solicitado, ignore este e-mail.</p>
                <p style="text-align:center;">
                  <a class="cta" href="${link}">Retomar cadastro</a>
                </p>
                <p class="muted">Link alternativo: ${link}</p>
                <p class="muted">Equipe CEFORT - ${SUPPORT_EMAIL}</p>
              </div>
            </div>
          </body></html>
        `,
        text:
          `Recupere o acesso ao seu cadastro usando o link seguro: ${link}. Se não solicitou, ignore este e-mail. Equipe CEFORT (${SUPPORT_EMAIL}).`,
      };
    }
    case "documentos_upload_link": {
      const link = payload.link ?? "#";
      const nome = payload.nome ?? "Jovem";
      const docs = payload.documentos ?? "RG, CPF, Comprovante de endereço, Comprovante de escolaridade/matrícula e Carteira de trabalho";
      return {
        subject: "Envio de documentos - CEFORT",
        html: `
          <html><head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="card">
                <h2>Olá, ${nome}!</h2>
                <p>Para continuar seu processo, envie os documentos solicitados:</p>
                <p><strong>${docs}</strong></p>
                <p style="text-align:center;">
                  <a class="cta" href="${link}">Enviar meus documentos</a>
                </p>
                <p class="muted">Link alternativo: ${link}</p>
                <p class="muted">Equipe CEFORT - ${SUPPORT_EMAIL}</p>
              </div>
            </div>
          </body></html>
        `,
        text:
          `Olá, ${nome}!\nEnvie os documentos solicitados (${docs}) no link: ${link}\nEquipe CEFORT (${SUPPORT_EMAIL}).`,
      };
    }
    case "documentos_renovacao": {
      const link = payload.link ?? "#";
      const nome = payload.nome ?? "Jovem";
      const tipo = payload.tipo_documento ?? "documento";
      return {
        subject: "Documento vencido - atualizacao necessaria",
        html: `
          <html><head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="card">
                <h2>Olá, ${nome}!</h2>
                <p>Seu documento <strong>${tipo}</strong> venceu e precisa ser atualizado.</p>
                <p style="text-align:center;">
                  <a class="cta" href="${link}">Atualizar documento</a>
                </p>
                <p class="muted">Link alternativo: ${link}</p>
                <p class="muted">Equipe CEFORT - ${SUPPORT_EMAIL}</p>
              </div>
            </div>
          </body></html>
        `,
        text:
          `Olá, ${nome}! Seu documento (${tipo}) venceu. Atualize pelo link: ${link}\nEquipe CEFORT (${SUPPORT_EMAIL}).`,
      };
    }
    case "documento_validacao": {
      const nome = payload.nome ?? "Jovem";
      const tipo = payload.tipo_documento ?? "documento";
      const status = payload.status === "aprovado" ? "aprovado" : "rejeitado";
      const observacao = payload.observacao ?? "";
      const aprovado = status === "aprovado";
      return {
        subject: aprovado ? "Documento aprovado - CEFORT" : "Documento rejeitado - CEFORT",
        html: `
          <html><head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="card">
                <h2>Olá, ${nome}!</h2>
                <p>Seu documento <strong>${tipo}</strong> foi <strong>${aprovado ? "aprovado" : "rejeitado"}</strong>.</p>
                ${observacao ? `<p><strong>Observação:</strong> ${observacao}</p>` : ""}
                <p class="muted">Equipe CEFORT - ${SUPPORT_EMAIL}</p>
              </div>
            </div>
          </body></html>
        `,
        text:
          `Olá, ${nome}! Seu documento (${tipo}) foi ${aprovado ? "aprovado" : "rejeitado"}.${observacao ? ` Observação: ${observacao}` : ""}\nEquipe CEFORT (${SUPPORT_EMAIL}).`,
      };
    }
    case "agendamento_jovem": {
      const nome = payload.nome ?? "Jovem";
      const titulo = payload.titulo ?? "Atendimento";
      const dataHora = payload.data_hora ?? "-";
      const setor = payload.setor ?? "-";
      const modalidade = payload.modalidade ?? "-";
      const localOuLink = payload.local_ou_link ?? "";
      const descricao = payload.descricao ?? "";
      return {
        subject: "Agendamento CEFORT - confirmação",
        html: `
          <html><head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="card">
                <h2>Olá, ${nome}!</h2>
                <p>Seu atendimento foi agendado com os detalhes abaixo:</p>
                <p><strong>Título:</strong> ${titulo}</p>
                <p><strong>Data e horário:</strong> ${dataHora}</p>
                <p><strong>Setor:</strong> ${setor}</p>
                <p><strong>Modalidade:</strong> ${modalidade}</p>
                ${localOuLink ? `<p><strong>Local/Link:</strong> ${localOuLink}</p>` : ""}
                ${descricao ? `<p><strong>Observações:</strong> ${descricao}</p>` : ""}
                <p class="muted">Dúvidas? ${SUPPORT_EMAIL}</p>
              </div>
            </div>
          </body></html>
        `,
        text:
          `Olá, ${nome}!\nSeu atendimento foi agendado.\nTítulo: ${titulo}\nData e horário: ${dataHora}\nSetor: ${setor}\nModalidade: ${modalidade}\n${localOuLink ? `Local/Link: ${localOuLink}\n` : ""}${descricao ? `Observações: ${descricao}\n` : ""}Dúvidas: ${SUPPORT_EMAIL}`,
      };
    }
    case "avaliacao_pratica_empresa": {
      const nome = payload.nome ?? "Responsavel";
      const jovem = payload.jovem ?? "Jovem";
      const empresa = payload.empresa ?? "Empresa";
      const link = payload.link ?? "#";
      const prazo = payload.prazo ?? "Nao informado";
      const observacoes = payload.observacoes ?? "";
      return {
        subject: "Avaliacao pratica pendente - CEFORT",
        html: `
          <html><head><style>${baseStyles}</style></head>
          <body>
            <div class="container">
              <div class="card">
                <h2>Olá, ${nome}!</h2>
                <p>Solicitamos o preenchimento da avaliacao pratica do jovem <strong>${jovem}</strong>, vinculado a <strong>${empresa}</strong>.</p>
                <p><strong>Prazo sugerido:</strong> ${prazo}</p>
                ${observacoes ? `<p><strong>Observações:</strong> ${observacoes}</p>` : ""}
                <p style="text-align:center;">
                  <a class="cta" href="${link}">Responder avaliacao pratica</a>
                </p>
                <p class="muted">Link alternativo: ${link}</p>
                <p class="muted">Equipe CEFORT - ${SUPPORT_EMAIL}</p>
              </div>
            </div>
          </body></html>
        `,
        text:
          `Olá, ${nome}!\nSolicitamos o preenchimento da avaliacao pratica do jovem ${jovem}, vinculado a ${empresa}.\nPrazo sugerido: ${prazo}\n${observacoes ? `Observacoes: ${observacoes}\n` : ""}Responda pelo link: ${link}\nEquipe CEFORT (${SUPPORT_EMAIL}).`,
      };
    }
    default:
      throw new Error("Template invalido");
  }
}

async function logEmailAudit(params: {
  to: string;
  template: EmailTemplate;
  messageId: string | null;
  link?: string;
}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.rpc("log_audit", {
      p_entity_type: "emails",
      p_entity_id: crypto.randomUUID(),
      p_action_type: "create",
      p_old_data: null,
      p_new_data: {
        template: params.template,
        to: params.to,
      },
      p_metadata: {
        template: params.template,
        to: params.to,
        message_id: params.messageId,
        link_masked: maskLink(params.link),
      },
    });
  } catch (error) {
    console.error("send-email: failed to log audit", error);
  }
}

function maskLink(link?: string) {
  if (!link) return null;
  try {
    const url = new URL(link);
    const token = url.searchParams.get("token");
    if (token) {
      url.searchParams.set("token", `[masked:${token.slice(0, 4)}...${token.slice(-2)}]`);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
