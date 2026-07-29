import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logAudit } from "@/hooks/useAuditLog";
import { generateCadastroCodigo } from "@/lib/codigo";

export interface CursoDisciplinaVisual {
  id: string;
  nome: string;
  codigo: string;
  tipo_modulo: string;
  carga_horaria: number;
  numero_encontros: number;
}

export interface CursoEmentaVisual {
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
    disciplina: CursoDisciplinaVisual | null;
  }>;
}

export interface CursoUnidadeVinculo {
  id: string;
  unidade_id: string;
  gov_validacao_id: string | null;
  unidade?: { id: string; nome: string | null } | null;
  gov_validacao?: {
    id: string;
    nome: string | null;
    protocolo: string | null;
    status: string | null;
    vigencia_final: string | null;
    unidade_id: string | null;
    ementa?: CursoEmentaVisual | null;
  } | null;
}

export type Curso = Tables<"cursos"> & {
  unidades?: CursoUnidadeVinculo[];
};

export interface CursoFormValues {
  codigo: string;
  nome: string;
  descricao?: string | null;
  unidadeVinculos: Array<{
    unidade_id: string;
    gov_validacao_id: string;
  }>;
}

export interface CursosListParams {
  search?: string;
  unidadeId?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

const cursoSelect = `
  id,
  codigo,
  nome,
  descricao,
  unidade_id,
  ementa_id,
  gov_validacao_id,
  created_at,
  updated_at,
  unidades:curso_unidades(
    id,
    unidade_id,
    gov_validacao_id,
    unidade:unidades(id,nome),
    gov_validacao:gov_validacoes(
      id,
      nome,
      protocolo,
      status,
      vigencia_final,
      unidade_id,
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
    )
  )
`;

const cursoSelectWithUnidadeFilter = cursoSelect.replace(
  "unidades:curso_unidades(",
  "unidades:curso_unidades!inner(",
);

export function useCursos() {
  const fetchCursoById = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("cursos")
      .select(cursoSelect)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as Curso;
  }, []);

  const fetchCursos = useCallback(
    async ({
      search = "",
      unidadeId,
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
    }: CursosListParams) => {
      const hasUnidadeFilter = Boolean(unidadeId && unidadeId !== "all");
      let query = supabase
        .from("cursos")
        .select(hasUnidadeFilter ? cursoSelectWithUnidadeFilter : cursoSelect, {
          count: "exact",
        })
        .order("nome", { ascending: true });

      if (search.trim()) {
        const term = search.trim();
        query = query.or(
          [`codigo.ilike.%${term}%`, `nome.ilike.%${term}%`, `descricao.ilike.%${term}%`].join(","),
        );
      }

      if (hasUnidadeFilter) {
        query = query.eq("curso_unidades.unidade_id", unidadeId);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as unknown as Curso[],
        total: count ?? 0,
      };
    },
    [],
  );

  const listAllCursos = useCallback(async () => {
    const { data, error } = await supabase
      .from("cursos")
      .select("id, nome, codigo")
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as Array<{ id: string; nome: string; codigo: string }>;
  }, []);

  const listCursosByUnidade = useCallback(async (unidadeId?: string | null) => {
    if (!unidadeId) return [];

    const { data, error } = await supabase
      .from("curso_unidades")
      .select(
        `
          curso:cursos(id,nome,codigo),
          gov_validacao:gov_validacoes(status)
        `,
      )
      .eq("unidade_id", unidadeId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    return ((data ?? []) as unknown as Array<{
      curso: { id: string; nome: string; codigo: string } | null;
      gov_validacao: { status: string | null } | null;
    }>)
      .filter((item) => item.curso && item.gov_validacao?.status === "aprovado")
      .map((item) => item.curso!)
      .filter((curso) => {
        if (seen.has(curso.id)) return false;
        seen.add(curso.id);
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, []);

  const createCurso = useCallback(
    async (values: CursoFormValues) => {
      const normalized = normalizeCursoPayload(values);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("cursos")
        .insert({
          ...normalized.curso,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      await replaceCursoUnidades(data.id, normalized.unidadeVinculos, user?.id ?? null);
      const curso = await fetchCursoById(data.id);

      await logAudit({
        entityType: "cursos",
        entityId: data.id,
        actionType: "create",
        newData: curso,
      });

      return curso;
    },
    [fetchCursoById],
  );

  const updateCurso = useCallback(
    async (id: string, values: CursoFormValues, previous?: Curso | null) => {
      const normalized = normalizeCursoPayload(values);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("cursos")
        .update(normalized.curso)
        .eq("id", id);

      if (error) throw new Error(error.message);

      await replaceCursoUnidades(id, normalized.unidadeVinculos, user?.id ?? null);
      const curso = await fetchCursoById(id);

      await logAudit({
        entityType: "cursos",
        entityId: id,
        actionType: "update",
        oldData: previous ?? null,
        newData: curso,
      });

      return curso;
    },
    [fetchCursoById],
  );

  const deleteCurso = useCallback(async (curso: Curso) => {
    const { error } = await supabase.from("cursos").delete().eq("id", curso.id);
    if (error) throw new Error(error.message);

    await logAudit({
      entityType: "cursos",
      entityId: curso.id,
      actionType: "delete",
      oldData: curso,
      newData: null,
    });
  }, []);

  return {
    fetchCursos,
    listAllCursos,
    listCursosByUnidade,
    createCurso,
    updateCurso,
    deleteCurso,
  };
}

async function replaceCursoUnidades(
  cursoId: string,
  unidadeVinculos: CursoFormValues["unidadeVinculos"],
  userId: string | null,
) {
  const { error: deleteError } = await supabase
    .from("curso_unidades")
    .delete()
    .eq("curso_id", cursoId);

  if (deleteError) throw new Error(deleteError.message);

  if (unidadeVinculos.length === 0) return;

  const { error: insertError } = await supabase.from("curso_unidades").insert(
    unidadeVinculos.map((vinculo) => ({
      curso_id: cursoId,
      unidade_id: vinculo.unidade_id,
      gov_validacao_id: vinculo.gov_validacao_id,
      created_by: userId,
    })),
  );

  if (insertError) throw new Error(insertError.message);
}

function normalizeCursoPayload(values: CursoFormValues) {
  const unidadeVinculos = values.unidadeVinculos
    .map((item) => ({
      unidade_id: item.unidade_id.trim(),
      gov_validacao_id: item.gov_validacao_id.trim(),
    }))
    .filter((item) => item.unidade_id);

  const uniqueUnits = new Set<string>();
  unidadeVinculos.forEach((item) => {
    if (uniqueUnits.has(item.unidade_id)) {
      throw new Error("Cada unidade pode ser vinculada apenas uma vez.");
    }
    uniqueUnits.add(item.unidade_id);
    if (!item.gov_validacao_id) {
      throw new Error("Selecione uma validação GOV aprovada para cada unidade vinculada.");
    }
  });

  const firstVinculo = unidadeVinculos[0] ?? null;

  return {
    curso: {
      codigo: values.codigo.trim() || generateCadastroCodigo("CUR", values.nome),
      ementa_id: null,
      gov_notificar_antes_dias: 90,
      gov_protocolo: null,
      gov_repetir_notificacao_quinzenal: false,
      gov_vigencia_fim: null,
      gov_vigencia_inicio: null,
      gov_validacao_id: firstVinculo?.gov_validacao_id ?? null,
      nome: values.nome.trim(),
      descricao: values.descricao?.trim() || null,
      unidade_id: firstVinculo?.unidade_id ?? null,
    },
    unidadeVinculos,
  };
}
