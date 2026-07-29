import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logAudit } from "@/hooks/useAuditLog";
import { generateCadastroCodigo } from "@/lib/codigo";

export type Turma = Tables<"turmas"> & {
  curso?: { id: string; nome: string | null; codigo: string | null } | null;
  unidade?: { id: string; nome: string | null } | null;
};

export interface TurmaFormValues {
  analista_responsavel_id?: string | null;
  ativo?: boolean;
  capacidade?: number | null;
  codigo: string;
  curso_id?: string | null;
  nome: string;
  unidade_id?: string | null;
  data_inicio?: string | null;
}

export interface TurmasListParams {
  search?: string;
  unidadeId?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function useTurmas() {
  const fetchTurmas = useCallback(
    async ({
      search = "",
      unidadeId,
      status = "all",
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    }: TurmasListParams) => {
      let query = supabase
        .from("turmas")
        .select("id,codigo,nome,unidade_id,curso_id,data_inicio,data_fim,ativo,created_at,capacidade,analista_responsavel_id,unidade:unidades(id,nome),curso:cursos(id,nome,codigo)", {
          count: "exact",
        })
        .order("data_inicio", { ascending: false, nullsFirst: false });

      if (search.trim()) {
        const term = search.trim();
        const orFilter = [`codigo.ilike.%${term}%`, `nome.ilike.%${term}%`].join(",");
        query = query.or(orFilter);
      }

      if (unidadeId && unidadeId !== "all") {
        query = query.eq("unidade_id", unidadeId);
      }

      if (status === "active") {
        query = query.eq("ativo", true);
      } else if (status === "inactive") {
        query = query.eq("ativo", false);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return {
        items: (data ?? []) as unknown as Turma[],
        total: count ?? 0,
      };
    },
    [],
  );

  const createTurma = useCallback(async (values: TurmaFormValues) => {
    const normalized = normalizeTurmaPayload(values);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("turmas")
      .insert({
        ...normalized,
        created_by: user?.id ?? null,
      })
      .select("id,codigo,nome,unidade_id,curso_id,data_inicio,data_fim,ativo,created_at,capacidade,analista_responsavel_id,unidade:unidades(id,nome),curso:cursos(id,nome,codigo)")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await logAudit({
      entityType: "turmas",
      entityId: data.id,
      actionType: "create",
      newData: data,
    });

    return data as unknown as Turma;
  }, []);

  const updateTurma = useCallback(
    async (id: string, values: TurmaFormValues, previous?: Turma | null) => {
      const normalized = normalizeTurmaPayload(values);
      const { data, error } = await supabase
        .from("turmas")
        .update(normalized)
        .eq("id", id)
        .select("id,codigo,nome,unidade_id,curso_id,data_inicio,data_fim,ativo,created_at,capacidade,analista_responsavel_id,unidade:unidades(id,nome),curso:cursos(id,nome,codigo)")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await logAudit({
        entityType: "turmas",
        entityId: id,
        actionType: "update",
        oldData: previous ?? null,
        newData: data,
      });

      return data as unknown as Turma;
    },
    [],
  );

  const deleteTurma = useCallback(async (turma: Turma) => {
    const { error } = await supabase.from("turmas").delete().eq("id", turma.id);

    if (error) {
      throw new Error(error.message);
    }

    await logAudit({
      entityType: "turmas",
      entityId: turma.id,
      actionType: "delete",
      oldData: turma,
      newData: null,
    });
  }, []);

  return {
    fetchTurmas,
    createTurma,
    updateTurma,
    deleteTurma,
  };
}

function normalizeTurmaPayload(values: TurmaFormValues) {
  return {
    analista_responsavel_id: values.analista_responsavel_id || null,
    ativo: values.ativo ?? true,
    capacidade:
      values.capacidade === null || values.capacidade === undefined || Number.isNaN(values.capacidade)
        ? null
        : values.capacidade,
    codigo: values.codigo.trim() || generateCadastroCodigo("TUR", values.nome),
    curso_id: values.curso_id || null,
    nome: values.nome.trim(),
    unidade_id: values.unidade_id || null,
    data_inicio: values.data_inicio ? values.data_inicio : null,
  };
}
