import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";

export type GovStatus = "cadastrado" | "ajuste" | "aprovado" | "inativo";

export interface GovValidacao {
  id: string;
  nome: string;
  protocolo: string;
  numero_curso_mte: string | null;
  unidade_id: string;
  ementa_id: string;
  alerta_antecedencia_dias: number;
  vigencia_atual: string | null;
  vigencia_final: string | null;
  status: GovStatus;
  created_at: string;
  updated_at: string;
  unidade?: { id: string; nome: string | null } | null;
  ementa?: { id: string; titulo: string | null; codigo: string | null } | null;
}

export interface GovValidacaoAprovadaOption {
  id: string;
  nome: string;
  protocolo: string;
  status: GovStatus;
  unidade_id: string;
  vigencia_final: string | null;
  ementa: {
    id: string;
    titulo: string | null;
    codigo: string | null;
    carga_horaria_teorica: number;
    carga_horaria_pratica: number;
    cbo_tipo: "ocupacao" | "arco_ocupacional" | "multiplas_ocupacoes";
    cbos: string[];
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
      } | null;
    }>;
  } | null;
}

export interface GovValidacaoFormValues {
  nome: string;
  protocolo: string;
  numero_curso_mte?: string | null;
  unidade_id: string;
  ementa_id: string;
  alerta_antecedencia_dias?: number | null;
  vigencia_atual?: string | null;
  vigencia_final?: string | null;
  status: GovStatus;
}

export interface GovValidacoesListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function useGovValidacoes() {
  const fetchGovValidacoes = useCallback(
    async ({
      search = "",
      status = "all",
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    }: GovValidacoesListParams) => {
      let query = supabase
        .from("gov_validacoes")
        .select(
          `
            *,
            unidade:unidades(id,nome),
            ementa:ementas(id,titulo,codigo)
          `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      if (search.trim()) {
        const term = search.trim();
        query = query.or(
          [`nome.ilike.%${term}%`, `protocolo.ilike.%${term}%`, `numero_curso_mte.ilike.%${term}%`].join(","),
        );
      }

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as GovValidacao[],
        total: count ?? 0,
      };
    },
    [],
  );

  const listAllGovValidacoes = useCallback(async () => {
    const { data, error } = await supabase
      .from("gov_validacoes")
      .select("id, nome, protocolo, status")
      .neq("status", "inativo")
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as Array<{
      id: string;
      nome: string;
      protocolo: string;
      status: GovStatus;
    }>;
  }, []);

  const listApprovedGovValidacoes = useCallback(async () => {
    const { data, error } = await supabase
      .from("gov_validacoes")
      .select(
        `
          id,
          nome,
          protocolo,
          status,
          unidade_id,
          vigencia_final,
          ementa:ementas(
            id,
            titulo,
            codigo,
            carga_horaria_teorica,
            carga_horaria_pratica,
            cbo_tipo,
            cbos,
            disciplinas:ementa_disciplinas(
              id,
              ordem,
              disciplina:disciplinas(
                id,
                nome,
                codigo,
                tipo_modulo,
                carga_horaria,
                numero_encontros
              )
            )
          )
        `,
      )
      .eq("status", "aprovado")
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as unknown as GovValidacaoAprovadaOption[];
  }, []);

  const createGovValidacao = useCallback(async (values: GovValidacaoFormValues) => {
    const normalized = normalizeGovPayload(values);
    validateGov(normalized);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("gov_validacoes")
      .insert({
        ...normalized,
        created_by: user?.id ?? null,
      })
      .select(
        `
          *,
          unidade:unidades(id,nome),
          ementa:ementas(id,titulo,codigo)
        `,
      )
      .single();

    if (error) throw new Error(error.message);

    await logAudit({
      entityType: "gov_validacoes",
      entityId: data.id,
      actionType: "create",
      newData: data,
    });

    return data as GovValidacao;
  }, []);

  const updateGovValidacao = useCallback(
    async (id: string, values: GovValidacaoFormValues, previous?: GovValidacao | null) => {
      const normalized = normalizeGovPayload(values);
      validateGov(normalized);

      const { data, error } = await supabase
        .from("gov_validacoes")
        .update(normalized)
        .eq("id", id)
        .select(
          `
            *,
            unidade:unidades(id,nome),
            ementa:ementas(id,titulo,codigo)
          `,
        )
        .single();

      if (error) throw new Error(error.message);

      await logAudit({
        entityType: "gov_validacoes",
        entityId: id,
        actionType: "update",
        oldData: previous ?? null,
        newData: data,
      });

      return data as GovValidacao;
    },
    [],
  );

  const deleteGovValidacao = useCallback(async (record: GovValidacao) => {
    const { error } = await supabase
      .from("gov_validacoes")
      .delete()
      .eq("id", record.id);

    if (error) throw new Error(error.message);

    await logAudit({
      entityType: "gov_validacoes",
      entityId: record.id,
      actionType: "delete",
      oldData: record,
      newData: null,
    });
  }, []);

  return {
    fetchGovValidacoes,
    listAllGovValidacoes,
    listApprovedGovValidacoes,
    createGovValidacao,
    updateGovValidacao,
    deleteGovValidacao,
  };
}

function normalizeGovPayload(values: GovValidacaoFormValues): GovValidacaoFormValues {
  return {
    nome: values.nome.trim(),
    protocolo: values.protocolo.trim(),
    numero_curso_mte: values.numero_curso_mte?.trim() || null,
    unidade_id: values.unidade_id,
    ementa_id: values.ementa_id,
    alerta_antecedencia_dias:
      values.alerta_antecedencia_dias === null ||
      values.alerta_antecedencia_dias === undefined ||
      Number.isNaN(values.alerta_antecedencia_dias)
        ? 90
        : values.alerta_antecedencia_dias,
    vigencia_atual: values.vigencia_atual || null,
    vigencia_final: values.vigencia_final || null,
    status: values.status,
  };
}

function validateGov(values: GovValidacaoFormValues) {
  if (!values.nome) throw new Error("Nome é obrigatório.");
  if (!values.protocolo) throw new Error("Protocolo é obrigatório.");
  if (!values.unidade_id) throw new Error("Unidade é obrigatória.");
  if (!values.ementa_id) throw new Error("Ementa é obrigatória.");

  if (values.status === "aprovado") {
    if (!values.numero_curso_mte) {
      throw new Error("Número do curso (MTE) é obrigatório para status aprovado.");
    }
    if (!values.vigencia_atual) {
      throw new Error("Vigência atual é obrigatória para status aprovado.");
    }
    if (!values.vigencia_final) {
      throw new Error("Vigência final é obrigatória para status aprovado.");
    }
  }
}
