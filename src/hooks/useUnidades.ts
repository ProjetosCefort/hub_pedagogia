import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logAudit } from "@/hooks/useAuditLog";

export type Unidade = Tables<"unidades">;

export interface UnidadeFormValues {
  nome: string;
  endereco?: string | null;
  telefone?: string | null;
}

export interface UnidadeListParams {
  search?: string;
  hasTelefone?: "all" | "with" | "without";
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function useUnidades() {
  const fetchUnidades = useCallback(
    async ({
      search = "",
      hasTelefone = "all",
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    }: UnidadeListParams) => {
      let query = supabase
        .from("unidades")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search.trim()) {
        const term = search.trim();
        const orFilter = [
          `nome.ilike.%${term}%`,
          `endereco.ilike.%${term}%`,
        ].join(",");
        query = query.or(orFilter);
      }

      if (hasTelefone === "with") {
        query = query.not("telefone", "is", null).neq("telefone", "");
      } else if (hasTelefone === "without") {
        query = query.or("telefone.is.null,telefone.eq.\"\"");
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return {
        items: (data ?? []) as Unidade[],
        total: count ?? 0,
      };
    },
    [],
  );

  const listAllUnidades = useCallback(async () => {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Pick<Unidade, "id" | "nome">[];
  }, []);

  const createUnidade = useCallback(async (values: UnidadeFormValues) => {
    const normalized = normalizeUnidadePayload(values);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("unidades")
      .insert({
        ...normalized,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await logAudit({
      entityType: "unidades",
      entityId: data.id,
      actionType: "create",
      newData: data,
    });

    return data as Unidade;
  }, []);

  const updateUnidade = useCallback(
    async (id: string, values: UnidadeFormValues, previous?: Unidade | null) => {
      const normalized = normalizeUnidadePayload(values);
      const { data, error } = await supabase
        .from("unidades")
        .update(normalized)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await logAudit({
        entityType: "unidades",
        entityId: id,
        actionType: "update",
        oldData: previous ?? null,
        newData: data,
      });

      return data as Unidade;
    },
    [],
  );

  const deleteUnidade = useCallback(async (unidade: Unidade) => {
    const { error } = await supabase.from("unidades").delete().eq("id", unidade.id);

    if (error) {
      throw new Error(error.message);
    }

    await logAudit({
      entityType: "unidades",
      entityId: unidade.id,
      actionType: "delete",
      oldData: unidade,
      newData: null,
    });
  }, []);

  return {
    fetchUnidades,
    listAllUnidades,
    createUnidade,
    updateUnidade,
    deleteUnidade,
  };
}

function normalizeUnidadePayload(values: UnidadeFormValues) {
  return {
    nome: values.nome.trim(),
    endereco: values.endereco?.trim() || null,
    telefone: values.telefone?.trim() || null,
  };
}
