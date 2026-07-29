import { supabase } from "@/integrations/supabase/client";

export const DOCUMENTOS_BUCKET = "documentos" as const;

export const DOCUMENTO_TIPOS = [
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "comprovante_endereco", label: "Comprovante de endereco" },
  { value: "comprovante_escolaridade", label: "Comprovante de escolaridade/matricula" },
  { value: "carteira_trabalho", label: "Carteira de trabalho" },
  { value: "laudo_pcd", label: "Laudo PCD" },
  { value: "outros", label: "Outros" },
] as const;

export type DocumentoTipo = (typeof DOCUMENTO_TIPOS)[number]["value"];

const SAFE_FILENAME_REGEX = /[^a-zA-Z0-9._-]/g;

export function sanitizeDocumentoFileName(originalName: string): string {
  const trimmed = originalName?.trim() || "documento";
  const parts = trimmed.split(".");
  if (parts.length < 2) {
    return trimmed.replace(SAFE_FILENAME_REGEX, "_");
  }

  const extension = parts.pop() as string;
  const base = parts.join(".") || "documento";
  const safeBase = base.replace(SAFE_FILENAME_REGEX, "_");
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, "");
  return `${safeBase}.${safeExtension || "dat"}`.toLowerCase();
}

export function buildDocumentoStoragePath(params: {
  jovemId: string;
  documentoId: string;
  fileName: string;
}): string {
  const safeName = sanitizeDocumentoFileName(params.fileName);
  return `documentos/${params.jovemId}/${params.documentoId}/${safeName}`;
}

export async function uploadDocumentoArquivo(params: {
  jovemId: string;
  documentoId: string;
  file: File;
}): Promise<{ storagePath: string }> {
  const storagePath = buildDocumentoStoragePath({
    jovemId: params.jovemId,
    documentoId: params.documentoId,
    fileName: params.file.name,
  });

  const { error } = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(
    storagePath,
    params.file,
    {
      upsert: false,
      contentType: params.file.type || undefined,
      cacheControl: "3600",
    },
  );

  if (error) {
    throw new Error(error.message || "Falha ao enviar arquivo");
  }

  return { storagePath };
}

export async function deleteDocumentoArquivo(storagePath: string) {
  if (!storagePath) return;
  await supabase.storage.from(DOCUMENTOS_BUCKET).remove([storagePath]);
}

export async function createDocumentoSignedUrl(
  storagePath: string,
  expiresInSeconds = 120,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Nao foi possivel gerar o link do documento");
  }

  return data.signedUrl;
}
