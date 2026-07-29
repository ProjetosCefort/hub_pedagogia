import { supabase } from "@/integrations/supabase/client";

type EmailTemplate =
  | "inscricao_confirmacao"
  | "recuperar_acesso"
  | "documentos_upload_link"
  | "documentos_renovacao"
  | "documento_validacao"
  | "agendamento_jovem"
  | "avaliacao_pratica_empresa";

interface SendEmailPayload {
  to: string;
  template: EmailTemplate;
  payload: Record<string, string>;
}

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? "contato@cefort.org.br";
const FALLBACK_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL ?? "https://hub.cefort.org";

export async function sendConfirmationEmail(email: string, token: string): Promise<boolean> {
  const link = `${getBaseUrl()}/inscricao?token=${encodeURIComponent(token)}`;
  return triggerEmail({
    to: email,
    template: "inscricao_confirmacao",
    payload: {
      link,
      support: SUPPORT_EMAIL,
    },
  });
}

export async function sendAccessRecoveryEmail(email: string, token: string): Promise<boolean> {
  const link = `${getBaseUrl()}/inscricao?token=${encodeURIComponent(token)}`;
  return triggerEmail({
    to: email,
    template: "recuperar_acesso",
    payload: {
      link,
      support: SUPPORT_EMAIL,
    },
  });
}

export async function sendDocumentsUploadLinkEmail(params: {
  email: string;
  nome: string;
  link: string;
  documentos: string;
}): Promise<boolean> {
  return triggerEmail({
    to: params.email,
    template: "documentos_upload_link",
    payload: {
      nome: params.nome,
      link: params.link,
      documentos: params.documentos,
      support: SUPPORT_EMAIL,
    },
  });
}

export async function sendDocumentsRenewalEmail(params: {
  email: string;
  nome: string;
  link: string;
  tipoDocumento: string;
}): Promise<boolean> {
  return triggerEmail({
    to: params.email,
    template: "documentos_renovacao",
    payload: {
      nome: params.nome,
      link: params.link,
      tipo_documento: params.tipoDocumento,
      support: SUPPORT_EMAIL,
    },
  });
}

export async function sendDocumentValidationEmail(params: {
  email: string;
  nome: string;
  tipoDocumento: string;
  status: "aprovado" | "rejeitado";
  observacao?: string;
}): Promise<boolean> {
  return triggerEmail({
    to: params.email,
    template: "documento_validacao",
    payload: {
      nome: params.nome,
      tipo_documento: params.tipoDocumento,
      status: params.status,
      observacao: params.observacao || "",
      support: SUPPORT_EMAIL,
    },
  });
}

export async function sendScheduleEmail(params: {
  email: string;
  nome: string;
  titulo: string;
  dataHora: string;
  setor: string;
  modalidade: string;
  localOuLink?: string;
  descricao?: string;
}): Promise<boolean> {
  return triggerEmail({
    to: params.email,
    template: "agendamento_jovem",
    payload: {
      nome: params.nome,
      titulo: params.titulo,
      data_hora: params.dataHora,
      setor: params.setor,
      modalidade: params.modalidade,
      local_ou_link: params.localOuLink || "",
      descricao: params.descricao || "",
      support: SUPPORT_EMAIL,
    },
  });
}

export async function sendPracticalEvaluationEmail(params: {
  email: string;
  nome: string;
  jovem: string;
  empresa: string;
  link: string;
  prazo?: string;
  observacoes?: string;
}): Promise<boolean> {
  return triggerEmail({
    to: params.email,
    template: "avaliacao_pratica_empresa",
    payload: {
      nome: params.nome,
      jovem: params.jovem,
      empresa: params.empresa,
      link: params.link,
      prazo: params.prazo || "",
      observacoes: params.observacoes || "",
      support: SUPPORT_EMAIL,
    },
  });
}

async function triggerEmail(request: SendEmailPayload): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: request,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.success) {
      throw new Error(data?.error || "Falha ao enviar e-mail");
    }

    return true;
  } catch (error) {
    console.error("Falha ao enviar e-mail:", error);
    return false;
  }
}

function getBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_APP_URL.replace(/\/$/, "");
}
