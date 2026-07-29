import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logAudit } from "@/hooks/useAuditLog";

export type Empresa = Tables<"empresas">;

export interface EmpresaFormValues {
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  responsavel_nome?: string | null;
  responsavel_telefone?: string | null;
}

export interface EmpresaListParams {
  search?: string;
  hasCnpj?: "all" | "with" | "without";
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function useEmpresas() {
  const fetchEmpresas = useCallback(
    async ({
      search = "",
      hasCnpj = "all",
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    }: EmpresaListParams) => {
      let query = supabase
        .from("empresas")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search.trim()) {
        const term = search.trim();
        const orFilter = [
          `razao_social.ilike.%${term}%`,
          `nome_fantasia.ilike.%${term}%`,
          `cnpj.ilike.%${term}%`,
        ].join(",");
        query = query.or(orFilter);
      }

      if (hasCnpj === "with") {
        query = query.not("cnpj", "is", null).neq("cnpj", "");
      } else if (hasCnpj === "without") {
        query = query.or("cnpj.is.null,cnpj.eq.\"\"");
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return {
        items: (data ?? []) as Empresa[],
        total: count ?? 0,
      };
    },
    [],
  );

  const createEmpresa = useCallback(async (values: EmpresaFormValues) => {
    const normalized = normalizeEmpresaPayload(values);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("empresas")
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
      entityType: "empresas",
      entityId: data.id,
      actionType: "create",
      newData: data,
    });

    return data as Empresa;
  }, []);

  const updateEmpresa = useCallback(
    async (id: string, values: EmpresaFormValues, previous?: Empresa | null) => {
      const normalized = normalizeEmpresaPayload(values);
      const { data, error } = await supabase
        .from("empresas")
        .update(normalized)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await logAudit({
        entityType: "empresas",
        entityId: id,
        actionType: "update",
        oldData: previous ?? null,
        newData: data,
      });

      return data as Empresa;
    },
    [],
  );

  const deleteEmpresa = useCallback(async (empresa: Empresa) => {
    const { error } = await supabase.from("empresas").delete().eq("id", empresa.id);

    if (error) {
      throw new Error(error.message);
    }

    await logAudit({
      entityType: "empresas",
      entityId: empresa.id,
      actionType: "delete",
      oldData: empresa,
      newData: null,
    });
  }, []);

  return {
    fetchEmpresas,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
  };
}

function normalizeEmpresaPayload(values: EmpresaFormValues) {
  return {
    razao_social: values.razao_social.trim(),
    nome_fantasia: values.nome_fantasia?.trim() || null,
    cnpj: values.cnpj?.trim() || null,
    endereco: values.endereco?.trim() || null,
    telefone: values.telefone?.trim() || null,
    email: values.email?.trim() || null,
    responsavel_nome: values.responsavel_nome?.trim() || null,
    responsavel_telefone: values.responsavel_telefone?.trim() || null,
  };
}
