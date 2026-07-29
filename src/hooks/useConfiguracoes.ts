import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

// =====================================================
// TIPOS
// =====================================================

export interface MotivoIntervencao {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  setor: "psicossocial" | "servico_social";
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface MotivoAvaliacaoPedagogica {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface AproveitamentoEscolar {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface RegistroSocial {
  id: string;
  nome: string;
  sigla: string | null;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ModeloEncaminhamento {
  id: string;
  nome: string;
  instituicao_destino: string | null;
  area_destino: string | null;
  corpo_template: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ModeloDocumento {
  id: string;
  nome: string;
  tipo: "certificado" | "comprovante_matricula" | "advertencia" | "outros";
  descricao: string | null;
  corpo_template: string | null;
  fonte_familia: string;
  fonte_tamanho: number;
  negrito: boolean;
  alinhamento: "left" | "center" | "right" | "justify";
  logo_url: string | null;
  imagem_url: string | null;
  imagem_posicao: "top" | "bottom";
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ModeloDocumentoQueryResult {
  items: ModeloDocumento[];
  available: boolean;
}

export interface Parametro {
  id: string;
  chave: string;
  valor: string | null;
  tipo: string;
  categoria: string | null;
  nome_exibicao: string;
  descricao: string | null;
  opcoes_select: string | null;
  editavel: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HOOKS - MOTIVOS DE INTERVENÇÃO
// =====================================================

export function useMotivosIntervencao(
  apenasAtivos = true,
  setor?: "psicossocial" | "servico_social",
) {
  return useQuery({
    queryKey: ["config_motivos_intervencao", apenasAtivos, setor],
    queryFn: async () => {
      let query = supabase
        .from("config_motivos_intervencao")
        .select("*")
        .order("ordem", { ascending: true });
      
      if (apenasAtivos) {
        query = query.eq("ativo", true);
      }

      if (setor) {
        query = query.eq("setor", setor);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MotivoIntervencao[];
    },
  });
}

export function useMutateMotivoIntervencao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: Partial<MotivoIntervencao>) => {
      const { data: result, error } = await supabase
        .from("config_motivos_intervencao")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_motivos_intervencao"] });
      toast({ title: "Motivo criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar motivo", description: error.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MotivoIntervencao> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("config_motivos_intervencao")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_motivos_intervencao"] });
      toast({ title: "Motivo atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar motivo", description: error.message, variant: "destructive" });
    },
  });

  return { create, update };
}

// =====================================================
// HOOKS - APROVEITAMENTO ESCOLAR
// =====================================================

export function useAproveitamentoEscolar(apenasAtivos = true) {
  return useQuery({
    queryKey: ["config_aproveitamento_escolar", apenasAtivos],
    queryFn: async () => {
      let query = supabase
        .from("config_aproveitamento_escolar")
        .select("*")
        .order("ordem", { ascending: true });
      
      if (apenasAtivos) {
        query = query.eq("ativo", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AproveitamentoEscolar[];
    },
  });
}

export function useMutateAproveitamentoEscolar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: Partial<AproveitamentoEscolar>) => {
      const { data: result, error } = await supabase
        .from("config_aproveitamento_escolar")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_aproveitamento_escolar"] });
      toast({ title: "Tipo criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar tipo", description: error.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AproveitamentoEscolar> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("config_aproveitamento_escolar")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_aproveitamento_escolar"] });
      toast({ title: "Tipo atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar tipo", description: error.message, variant: "destructive" });
    },
  });

  return { create, update };
}

// =====================================================
// HOOKS - REGISTROS SOCIAIS
// =====================================================

export function useRegistrosSociais(apenasAtivos = true) {
  return useQuery({
    queryKey: ["config_registros_sociais", apenasAtivos],
    queryFn: async () => {
      let query = supabase
        .from("config_registros_sociais")
        .select("*")
        .order("ordem", { ascending: true });
      
      if (apenasAtivos) {
        query = query.eq("ativo", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RegistroSocial[];
    },
  });
}

export function useMutateRegistroSocial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: Partial<RegistroSocial>) => {
      const { data: result, error } = await supabase
        .from("config_registros_sociais")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_registros_sociais"] });
      toast({ title: "Registro criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar registro", description: error.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RegistroSocial> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("config_registros_sociais")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_registros_sociais"] });
      toast({ title: "Registro atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar registro", description: error.message, variant: "destructive" });
    },
  });

  return { create, update };
}

// =====================================================
// HOOKS - MODELOS DE ENCAMINHAMENTO
// =====================================================

export function useModelosEncaminhamento(apenasAtivos = true) {
  return useQuery({
    queryKey: ["config_modelos_encaminhamento", apenasAtivos],
    queryFn: async () => {
      let query = supabase
        .from("config_modelos_encaminhamento")
        .select("*")
        .order("ordem", { ascending: true });
      
      if (apenasAtivos) {
        query = query.eq("ativo", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ModeloEncaminhamento[];
    },
  });
}

export function useMutateModeloEncaminhamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: Partial<ModeloEncaminhamento>) => {
      const { data: result, error } = await supabase
        .from("config_modelos_encaminhamento")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_modelos_encaminhamento"] });
      toast({ title: "Modelo criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar modelo", description: error.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ModeloEncaminhamento> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("config_modelos_encaminhamento")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_modelos_encaminhamento"] });
      toast({ title: "Modelo atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar modelo", description: error.message, variant: "destructive" });
    },
  });

  return { create, update };
}

// =====================================================
// HOOKS - MOTIVOS DE AVALIAÇÃO PEDAGÓGICA
// =====================================================

export function useMotivosAvaliacaoPedagogica(apenasAtivos = true) {
  return useQuery({
    queryKey: ["config_motivos_avaliacao_pedagogica", apenasAtivos],
    queryFn: async () => {
      let query = supabase
        .from("config_motivos_avaliacao_pedagogica" as any)
        .select("*")
        .order("ordem", { ascending: true });

      if (apenasAtivos) {
        query = query.eq("ativo", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MotivoAvaliacaoPedagogica[];
    },
  });
}

export function useMutateMotivoAvaliacaoPedagogica() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: Partial<MotivoAvaliacaoPedagogica>) => {
      const { data: result, error } = await supabase
        .from("config_motivos_avaliacao_pedagogica" as any)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["config_motivos_avaliacao_pedagogica"],
      });
      toast({ title: "Tipo de abordagem criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar tipo de abordagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<MotivoAvaliacaoPedagogica> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("config_motivos_avaliacao_pedagogica" as any)
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["config_motivos_avaliacao_pedagogica"],
      });
      toast({ title: "Tipo de abordagem atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar tipo de abordagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async ({
      id,
      nome,
    }: {
      id: string;
      nome: string;
    }) => {
      const { count, error: countError } = await supabase
        .from("avaliacoes_pedagogicas")
        .select("id", { count: "exact", head: true })
        .eq("motivo_intervencao", nome);

      if (countError) throw countError;

      if ((count || 0) > 0) {
        throw new Error(
          "Não é possível excluir este tipo porque ele já está vinculado a avaliações pedagógicas.",
        );
      }

      const { error } = await supabase
        .from("config_motivos_avaliacao_pedagogica" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["config_motivos_avaliacao_pedagogica"],
      });
      toast({ title: "Tipo de abordagem excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Não foi possível excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { create, update, remove };
}

// =====================================================
// HOOKS - MODELOS DE DOCUMENTOS
// =====================================================

export function useModelosDocumentos(apenasAtivos = true, enabled = true) {
  return useQuery({
    queryKey: ["config_modelos_documentos", apenasAtivos],
    enabled,
    queryFn: async (): Promise<ModeloDocumentoQueryResult> => {
      let query = supabase
        .from("config_modelos_documentos")
        .select("*")
        .order("ordem", { ascending: true });

      if (apenasAtivos) {
        query = query.eq("ativo", true);
      }

      const { data, error } = await query;
      if (error) {
        if ((error as any).code === "PGRST205") {
          return { items: [], available: false };
        }
        throw error;
      }
      return { items: (data as ModeloDocumento[]) || [], available: true };
    },
  });
}

export function useMutateModeloDocumento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: Partial<ModeloDocumento>) => {
      const { data: result, error } = await supabase
        .from("config_modelos_documentos")
        .insert(data)
        .select()
        .single();
      if (error) {
        if ((error as any).code === "PGRST205") {
          throw new Error("Recurso indisponível: tabela de modelos de documentos não existe neste ambiente.");
        }
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_modelos_documentos"] });
      toast({ title: "Modelo de documento criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar modelo de documento", description: error.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ModeloDocumento> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("config_modelos_documentos")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if ((error as any).code === "PGRST205") {
          throw new Error("Recurso indisponível: tabela de modelos de documentos não existe neste ambiente.");
        }
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_modelos_documentos"] });
      toast({ title: "Modelo de documento atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar modelo de documento", description: error.message, variant: "destructive" });
    },
  });

  return { create, update };
}

// =====================================================
// HOOKS - PARÂMETROS
// =====================================================

export function useParametros(categoria?: string) {
  return useQuery({
    queryKey: ["config_parametros", categoria],
    queryFn: async () => {
      let query = supabase
        .from("config_parametros")
        .select("*")
        .order("categoria", { ascending: true })
        .order("nome_exibicao", { ascending: true });
      
      if (categoria) {
        query = query.eq("categoria", categoria);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Parametro[];
    },
  });
}

export function useParametro(chave: string) {
  return useQuery({
    queryKey: ["config_parametro", chave],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_parametros")
        .select("*")
        .eq("chave", chave)
        .single();
      if (error) throw error;
      return data as Parametro;
    },
    enabled: !!chave,
  });
}

export function useMutateParametro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const update = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: string }) => {
      const { data: result, error } = await supabase
        .from("config_parametros")
        .update({ valor })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_parametros"] });
      queryClient.invalidateQueries({ queryKey: ["config_parametro"] });
      toast({ title: "Parâmetro atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar parâmetro", description: error.message, variant: "destructive" });
    },
  });

  return { update };
}

// =====================================================
// UTILITÁRIOS
// =====================================================

// Agrupa parâmetros por categoria
export function agruparParametrosPorCategoria(parametros: Parametro[]) {
  return parametros.reduce((acc, param) => {
    const categoria = param.categoria || "Geral";
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(param);
    return acc;
  }, {} as Record<string, Parametro[]>);
}
