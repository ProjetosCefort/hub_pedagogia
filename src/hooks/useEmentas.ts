import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logAudit } from "@/hooks/useAuditLog";
import { generateCadastroCodigo } from "@/lib/codigo";

export type Ementa = Tables<"ementas"> & {
  cbo_tipo?: "ocupacao" | "arco_ocupacional" | "multiplas_ocupacoes" | null;
  cbos?: string[] | null;
  disciplinas?: Array<{
    id: string;
    ordem: number;
    disciplina: {
      id: string;
      nome: string;
      codigo: string;
      tipo_modulo: string;
      carga_horaria: number;
      numero_encontros: number;
      descricao: string | null;
    } | null;
  }>;
};

export interface EmentaFormValues {
  codigo: string;
  titulo: string;
  descricao?: string | null;
  carga_horaria_pratica: number | null;
  cbo_tipo: "ocupacao" | "arco_ocupacional" | "multiplas_ocupacoes";
  cbos: string[];
  disciplinaIds: string[];
}

export interface EmentasListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function useEmentas() {
  const fetchEmentas = useCallback(
    async ({ search = "", page = 1, pageSize = DEFAULT_PAGE_SIZE }: EmentasListParams) => {
      let query = supabase
        .from("ementas")
        .select(
          `
            *,
            disciplinas:ementa_disciplinas(
              id,
              ordem,
              disciplina:disciplinas(
                id,
                nome,
                codigo,
                tipo_modulo,
                carga_horaria,
                numero_encontros,
                descricao
              )
            )
          `,
          { count: "exact" },
        )
        .order("titulo", { ascending: true });

      if (search.trim()) {
        const term = search.trim();
        query = query.or([`codigo.ilike.%${term}%`, `titulo.ilike.%${term}%`, `descricao.ilike.%${term}%`].join(","));
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as unknown as Ementa[],
        total: count ?? 0,
      };
    },
    [],
  );

  const listAllEmentas = useCallback(async () => {
    const { data, error } = await supabase
      .from("ementas")
      .select("id, titulo, codigo")
      .order("titulo", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as Array<{ id: string; titulo: string; codigo: string }>;
  }, []);

  const createEmenta = useCallback(async (values: EmentaFormValues) => {
    const normalized = normalizeEmentaPayload(values);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("ementas")
      .insert({
        codigo: normalized.codigo,
        titulo: normalized.titulo,
        descricao: normalized.descricao,
        carga_horaria_pratica: normalized.carga_horaria_pratica,
        cbo_tipo: normalized.cbo_tipo,
        cbos: normalized.cbos,
        created_by: user?.id ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    if (normalized.disciplinaIds.length > 0) {
      const { error: relationError } = await supabase.from("ementa_disciplinas").insert(
        normalized.disciplinaIds.map((disciplinaId, index) => ({
          ementa_id: data.id,
          disciplina_id: disciplinaId,
          ordem: index + 1,
        })),
      );
      if (relationError) throw new Error(relationError.message);
    }

    await logAudit({
      entityType: "ementas",
      entityId: data.id,
      actionType: "create",
      newData: { ...data, disciplinaIds: normalized.disciplinaIds },
    });

    return data as Tables<"ementas">;
  }, []);

  const updateEmenta = useCallback(async (id: string, values: EmentaFormValues, previous?: Ementa | null) => {
    const normalized = normalizeEmentaPayload(values);
    const { data, error } = await supabase
      .from("ementas")
      .update({
        codigo: normalized.codigo,
        titulo: normalized.titulo,
        descricao: normalized.descricao,
        carga_horaria_pratica: normalized.carga_horaria_pratica,
        cbo_tipo: normalized.cbo_tipo,
        cbos: normalized.cbos,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const { error: deleteError } = await supabase
      .from("ementa_disciplinas")
      .delete()
      .eq("ementa_id", id);

    if (deleteError) throw new Error(deleteError.message);

    if (normalized.disciplinaIds.length > 0) {
      const { error: relationError } = await supabase.from("ementa_disciplinas").insert(
        normalized.disciplinaIds.map((disciplinaId, index) => ({
          ementa_id: id,
          disciplina_id: disciplinaId,
          ordem: index + 1,
        })),
      );
      if (relationError) throw new Error(relationError.message);
    }

    await logAudit({
      entityType: "ementas",
      entityId: id,
      actionType: "update",
      oldData: previous ?? null,
      newData: { ...data, disciplinaIds: normalized.disciplinaIds },
    });

    return data as Tables<"ementas">;
  }, []);

  const deleteEmenta = useCallback(async (ementa: Ementa) => {
    const { error } = await supabase.from("ementas").delete().eq("id", ementa.id);
    if (error) throw new Error(error.message);

    await logAudit({
      entityType: "ementas",
      entityId: ementa.id,
      actionType: "delete",
      oldData: ementa,
      newData: null,
    });
  }, []);

  return {
    fetchEmentas,
    listAllEmentas,
    createEmenta,
    updateEmenta,
    deleteEmenta,
  };
}

function normalizeEmentaPayload(values: EmentaFormValues) {
  return {
    codigo: values.codigo.trim() || generateCadastroCodigo("EME", values.titulo),
    titulo: values.titulo.trim(),
    descricao: values.descricao?.trim() || null,
    carga_horaria_pratica: values.carga_horaria_pratica ?? 0,
    cbo_tipo: values.cbo_tipo,
    cbos:
      values.cbo_tipo === "ocupacao"
        ? values.cbos.slice(0, 1).map((item) => item.trim()).filter(Boolean)
        : values.cbos.map((item) => item.trim()).filter(Boolean),
    disciplinaIds: values.disciplinaIds,
  };
}
