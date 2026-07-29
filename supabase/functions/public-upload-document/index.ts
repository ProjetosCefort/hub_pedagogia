import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = new Set([
  "rg",
  "cpf",
  "comprovante_endereco",
  "comprovante_escolaridade",
  "carteira_trabalho",
  "laudo_pcd",
  "outros",
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(originalName: string): string {
  const name = (originalName || "documento").trim();
  const parts = name.split(".");
  if (parts.length < 2) return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  const extension = (parts.pop() || "dat").replace(/[^a-zA-Z0-9]/g, "");
  const base = parts.join(".").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${base || "documento"}.${extension || "dat"}`.toLowerCase();
}

function mapInscricaoStatusToJovemStatus(status: string | null): string {
  switch (status) {
    case "draft":
    case "completed":
    case "under_analysis":
    case "approved":
    case "active_apprentice":
      return status;
    case "talent_bank":
      return "under_analysis";
    default:
      return "under_analysis";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return json({ success: false, error: "Token ausente." }, 401);
    }

    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      return json({ success: false, error: "Servidor sem configuracao de JWT." }, 500);
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    let jovemId = typeof payload?.jovem_id === "string" ? payload.jovem_id : null;
    const inscricaoId = typeof payload?.inscricao_id === "string" ? payload.inscricao_id : null;
    const isPublicAccess = payload?.public_access === true;
    if (!jovemId || !isPublicAccess) {
      return json({ success: false, error: "Token invalido." }, 401);
    }

    const formData = await req.formData();
    const tipo = String(formData.get("tipo") || "").trim();
    const fileEntries = formData.getAll("file");
    const files = fileEntries.filter((entry): entry is File => entry instanceof File);

    if (!ALLOWED_TYPES.has(tipo)) {
      return json({ success: false, error: "Tipo de documento invalido." }, 400);
    }

    if (files.length === 0 || files.length !== fileEntries.length) {
      return json({ success: false, error: "Arquivo nao informado." }, 400);
    }

    const oversizedFile = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      return json({
        success: false,
        error: `Arquivo "${oversizedFile.name}" excede o limite de 10 MB.`,
      }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let { data: jovem, error: jovemError } = await supabase
      .from("jovens")
      .select("id")
      .eq("id", jovemId)
      .maybeSingle();
    if (jovemError) {
      return json({ success: false, error: "Falha ao validar acesso." }, 500);
    }
    if (!jovem && inscricaoId) {
      const { data: inscricao, error: inscricaoError } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("id, jovem_id, nome_completo, data_nascimento, cpf, email, contato_1, status")
        .eq("id", inscricaoId)
        .maybeSingle();

      if (inscricaoError || !inscricao) {
        return json({ success: false, error: "Sessao expirada. Acesse novamente." }, 401);
      }

      if (inscricao.jovem_id) {
        jovemId = inscricao.jovem_id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("jovens")
          .insert({
            nome_completo: inscricao.nome_completo,
            data_nascimento: inscricao.data_nascimento,
            cpf: inscricao.cpf,
            email: inscricao.email,
            celular: inscricao.contato_1,
            status: mapInscricaoStatusToJovemStatus(inscricao.status),
          })
          .select("id")
          .single();

        if (insertError || !inserted?.id) {
          return json({ success: false, error: "Falha ao preparar cadastro para upload." }, 500);
        }

        jovemId = inserted.id;

        await supabase
          .from("inscricoes_jovens_aprendizes")
          .update({ jovem_id: jovemId, updated_at: new Date().toISOString() })
          .eq("id", inscricao.id);
      }

      const jovemRes = await supabase
        .from("jovens")
        .select("id")
        .eq("id", jovemId)
        .maybeSingle();

      jovem = jovemRes.data;
      jovemError = jovemRes.error;
    }

    if (jovemError) {
      return json({ success: false, error: "Falha ao validar acesso." }, 500);
    }
    if (!jovem || !jovemId) {
      return json({ success: false, error: "Sessao expirada. Acesse novamente." }, 401);
    }

    const tipoParaSalvar = tipo;
    const uploadedPaths: string[] = [];
    const insertedIds: string[] = [];
    const documentos: Array<{ id: string; nome_arquivo: string; tipo_salvo: string }> = [];

    try {
      for (const file of files) {
        const documentoId = crypto.randomUUID();
        const safeName = sanitizeFileName(file.name);
        const storagePath = `public/jovem/${jovemId}/${documentoId}/${safeName}`;
        const bytes = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("documentos")
          .upload(storagePath, bytes, {
            upsert: false,
            contentType: file.type || undefined,
            cacheControl: "3600",
          });

        if (uploadError) {
          throw new Error(uploadError.message || "Falha no upload.");
        }

        uploadedPaths.push(storagePath);

        const { error: insertError } = await supabase.from("documentos_jovem").insert({
          id: documentoId,
          jovem_id: jovemId,
          tipo: tipoParaSalvar,
          nome_arquivo: file.name,
          storage_path: storagePath,
          mime_type: file.type || null,
          tamanho_bytes: file.size,
          status_validacao: "pendente",
          enviado_por: null,
        });

        if (insertError) {
          throw new Error(insertError.message || "Falha ao registrar documento.");
        }

        insertedIds.push(documentoId);
        documentos.push({
          id: documentoId,
          nome_arquivo: file.name,
          tipo_salvo: tipoParaSalvar,
        });
      }
    } catch (error: any) {
      if (insertedIds.length > 0) {
        await supabase.from("documentos_jovem").delete().in("id", insertedIds);
      }
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("documentos").remove(uploadedPaths);
      }

      return json({
        success: false,
        error: error?.message || "Falha ao enviar documentos.",
      }, 500);
    }

    return json({
      success: true,
      documento_id: documentos[0]?.id ?? null,
      documento_ids: documentos.map((documento) => documento.id),
      documentos,
      tipo_salvo: tipoParaSalvar,
    }, 200);
  } catch (error: any) {
    console.error("public-upload-document:", error);
    return json({ success: false, error: "Erro inesperado no upload." }, 500);
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
