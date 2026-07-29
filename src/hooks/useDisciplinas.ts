import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logAudit } from "@/hooks/useAuditLog";
import { generateCadastroCodigo } from "@/lib/codigo";

export type Disciplina = Tables<"disciplinas">;

export interface DisciplinaFormValues {
  codigo: string;
  nome: string;
  tipo_modulo: string;
  carga_horaria: number | null;
  numero_encontros: number | null;
  descricao?: string | null;
}

export interface DisciplinasListParams {
  search?: string;
  tipoModulo?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function useDisciplinas() {
  const fetchDisciplinas = useCallback(
    async ({
      search = "",
      tipoModulo = "all",
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    }: DisciplinasListParams) => {
      let query = supabase
        .from("disciplinas")
        .select("*", { count: "exact" })
        .order("nome", { ascending: true });

      if (search.trim()) {
        const term = search.trim();
        query = query.or(
          [`codigo.ilike.%${term}%`, `nome.ilike.%${term}%`, `descricao.ilike.%${term}%`].join(","),
        );
      }

      if (tipoModulo && tipoModulo !== "all") {
        query = query.eq("tipo_modulo", tipoModulo);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as Disciplina[],
        total: count ?? 0,
      };
    },
    [],
  );

  const listAllDisciplinas = useCallback(async () => {
    const { data, error } = await supabase
      .from("disciplinas")
      .select("id, nome, codigo, tipo_modulo, carga_horaria, numero_encontros")
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as Array<{
      id: string;
      nome: string;
      codigo: string;
      tipo_modulo: string;
      carga_horaria: number;
      numero_encontros: number;
    }>;
  }, []);

  const createDisciplina = useCallback(async (values: DisciplinaFormValues) => {
    const normalized = normalizeDisciplinaPayload(values);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("disciplinas")
      .insert({
        ...normalized,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await logAudit({
      entityType: "disciplinas",
      entityId: data.id,
      actionType: "create",
      newData: data,
    });

    return data as Disciplina;
  }, []);

  const updateDisciplina = useCallback(async (id: string, values: DisciplinaFormValues, previous?: Disciplina | null) => {
    const normalized = normalizeDisciplinaPayload(values);
    const { data, error } = await supabase
      .from("disciplinas")
      .update(normalized)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await logAudit({
      entityType: "disciplinas",
      entityId: id,
      actionType: "update",
      oldData: previous ?? null,
      newData: data,
    });

    return data as Disciplina;
  }, []);

  const deleteDisciplina = useCallback(async (disciplina: Disciplina) => {
    const { error } = await supabase.from("disciplinas").delete().eq("id", disciplina.id);
    if (error) throw new Error(error.message);

    await logAudit({
      entityType: "disciplinas",
      entityId: disciplina.id,
      actionType: "delete",
      oldData: disciplina,
      newData: null,
    });
  }, []);

  return {
    fetchDisciplinas,
    listAllDisciplinas,
    createDisciplina,
    updateDisciplina,
    deleteDisciplina,
  };
}

function normalizeDisciplinaPayload(values: DisciplinaFormValues) {
  return {
    codigo: values.codigo.trim() || generateCadastroCodigo("DIS", values.nome),
    nome: values.nome.trim(),
    tipo_modulo: values.tipo_modulo.trim(),
    carga_horaria: values.carga_horaria ?? 0,
    numero_encontros: values.numero_encontros ?? 0,
    descricao: values.descricao?.trim() || null,
  };
}
