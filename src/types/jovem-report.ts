/**
 * Tipos TypeScript para estrutura de relatório do Registro do Jovem
 * Preparado para exportação em PDF e relatórios institucionais
 */

import { Database } from "@/integrations/supabase/types";

type JovemStatus = Database["public"]["Enums"]["jovem_status"];

/**
 * Dados pessoais consolidados do jovem
 */
export interface JovemPersonalData {
  // Identificação
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  cpf: string | null;
  rg: string | null;
  sexo: string | null;
  raca: string | null;
  estado_civil: string | null;
  nacionalidade: string | null;
  naturalidade: string | null;

  // Contato
  email: string | null;
  telefone: string | null;
  celular: string | null;

  // Endereço
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;

  // Dados familiares
  nome_mae: string | null;
  nome_pai: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  responsavel_parentesco: string | null;

  // Dados institucionais
  matricula: string | null;
  data_admissao: string | null;
  data_desligamento: string | null;
  status: JovemStatus;
  foto_url: string | null;

  // Vínculos
  empresa: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string | null;
  } | null;
  turma: {
    id: string;
    nome: string;
    codigo: string;
    data_inicio: string | null;
    data_fim: string | null;
  } | null;
  unidade: {
    id: string;
    nome: string;
    endereco: string | null;
    telefone: string | null;
  } | null;

  // Observações gerais
  observacoes: string | null;

  // Metadados
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    nome_completo: string;
    cargo: string | null;
  } | null;
}

/**
 * Dados socioeconômicos consolidados
 */
export interface JovemSocioeconomicData {
  // Última avaliação socioeconômica
  ultima_avaliacao: {
    id: string;
    data_avaliacao: string;

    // Condição de saúde e PCD
    pcd_status: string | null;
    tipo_deficiencia: string | null;
    problemas_saude: string | null;

    // Composição familiar
    composicao_familiar: any | null;
    renda_familiar: number | null;
    quantidade_membros: number | null;

    // Condição de moradia
    moradia_tipo: string | null;
    situacao_moradia: string | null;
    possui_saneamento: boolean | null;
    possui_energia: boolean | null;

    // Rede socioassistencial
    nis: string | null;
    cadunico_status: string | null;
    cras: string | null;
    creas: string | null;
    beneficios_sociais: string | null;

    // Registros sociais (CMAS, CMDCA, etc.)
    registros_sociais: Array<{
      id: string;
      nome: string;
      sigla: string | null;
      descricao: string | null;
    }>;

    observacoes: string | null;

    responsavel: {
      id: string;
      nome_completo: string;
      cargo: string | null;
    } | null;

    created_at: string;
  } | null;

  // Histórico completo de avaliações socioeconômicas
  historico_avaliacoes: Array<{
    id: string;
    data_avaliacao: string;
    renda_familiar: number | null;
    quantidade_membros: number | null;
    pcd_status?: string | null;
    cadunico_status?: string | null;
    registros_sociais: Array<{
      nome: string;
      sigla: string | null;
    }>;
    created_at: string;
  }>;
}

/**
 * Intervenção registrada
 */
export interface IntervencaoData {
  id: string;
  data_atendimento: string;
  tipo:
    | "intervencao"
    | "avaliacao_pedagogica"
    | "avaliacao_socioeconomica"
    | "encaminhamento";

  // Dados específicos da intervenção
  descricao_demanda: string;
  relato_jovem: string | null;
  percepcao_profissional: string | null;
  plano_acao: string | null;
  conclusao: string | null;

  motivo_intervencao: string | null;
  motivo_intervencao_id: string | null;
  motivo_intervencao_nome: string | null;

  responsavel: {
    id: string;
    nome_completo: string;
    cargo: string | null;
  } | null;

  created_at: string;
  updated_at: string;
}

/**
 * Avaliação pedagógica
 */
export interface AvaliacaoPedagogicaData {
  id: string;
  data_avaliacao: string;

  motivo_intervencao: string;
  motivo_intervencao_id: string | null;
  motivo_intervencao_nome: string | null;

  descricao_conducao: string | null;
  estrategias_aplicadas: string | null;
  manifestacao_jovem: string | null;
  parecer_final: string | null;

  aproveitamento_escolar_id: string | null;
  aproveitamento_escolar_nome: string | null;

  assinatura_profissional: string | null;
  assinatura_jovem: string | null;

  responsavel: {
    id: string;
    nome_completo: string;
    cargo: string | null;
  } | null;

  created_at: string;
  updated_at: string;
}

export interface TimelineEventData {
  id: string;
  tipo_evento:
    | "intervencao"
    | "pedagogica"
    | "socioeconomica"
    | "encaminhamento";
  data_evento: string;
  created_at: string;
  titulo: string;
  resumo: string;
  responsavel: {
    id: string;
    nome_completo: string;
    cargo: string | null;
  } | null;
  status_jovem: string | null;
}

export interface PedagogicalHistoryData {
  avaliacoes: Array<{
    id: string;
    data: string;
    motivo: string | null;
    aproveitamento: string | null;
    parecer_final: string | null;
    dificuldades: string[];
    plano_acao: string | null;
    responsavel: string | null;
  }>;
  conselhos_classe: Array<{
    id: string;
    data_reuniao: string;
    periodo: string | null;
    turma: string | null;
    descricao: string | null;
    dificuldades: string[];
    plano_acao: string | null;
    parecer_turma: string | null;
  }>;
}

/**
 * Encaminhamento
 */
export interface EncaminhamentoData {
  id: string;
  data_encaminhamento: string;

  destino_nome: string | null;
  destino_instituicao: string | null;
  destino_cargo: string | null;
  destino_contato: string | null;
  descricao_encaminhamento: string | null;
  retorno_previsto: string | null;

  modelo_encaminhamento_id: string | null;
  modelo_encaminhamento_nome: string | null;

  responsavel: {
    id: string;
    nome_completo: string;
    cargo: string | null;
  } | null;

  created_at: string;
}

/**
 * Histórico de transições de status
 */
export interface StatusHistoryData {
  id: string;
  previous_status: JovemStatus | null;
  new_status: JovemStatus;
  changed_at: string;
  reason: string | null;

  changed_by: {
    id: string;
    nome_completo: string;
    cargo: string | null;
  };
}

/**
 * Relatório completo do Registro do Jovem
 */
export interface JovemReport {
  // Metadados do relatório
  metadata: {
    generated_at: string;
    generated_by: {
      id: string;
      nome_completo: string;
      cargo: string | null;
    } | null;
    report_version: string;
    jovem_id: string;
  };

  // Dados pessoais
  personal_data: JovemPersonalData;

  // Dados socioeconômicos
  socioeconomic_data: JovemSocioeconomicData;

  // Intervenções
  intervencoes: IntervencaoData[];

  // Avaliações pedagógicas
  avaliacoes_pedagogicas: AvaliacaoPedagogicaData[];

  // Encaminhamentos
  encaminhamentos: EncaminhamentoData[];

  // Histórico de status
  status_history: StatusHistoryData[];

  // Linha do tempo do prontuário
  timeline: TimelineEventData[];

  // Evolução e histórico pedagógico consolidado
  pedagogical_history: PedagogicalHistoryData;

  // Histórico de frequência e faltas
  attendance_history: {
    available: boolean;
    message: string;
    records: Array<{
      data: string;
      status: string;
      observacoes: string | null;
      responsavel: string | null;
    }>;
  };

  // Estatísticas consolidadas
  statistics: {
    total_intervencoes: number;
    total_avaliacoes_pedagogicas: number;
    total_avaliacoes_socioeconomicas: number;
    total_encaminhamentos: number;
    dias_ativo: number | null;
    primeira_intervencao: string | null;
    ultima_intervencao: string | null;
  };
}

/**
 * Opções para geração de relatório
 */
export interface JovemReportOptions {
  // Incluir histórico completo ou apenas dados atuais
  include_full_history?: boolean;

  // Filtrar por período
  date_from?: string;
  date_to?: string;

  // Incluir apenas tipos específicos de eventos
  include_intervencoes?: boolean;
  include_avaliacoes_pedagogicas?: boolean;
  include_avaliacoes_socioeconomicas?: boolean;
  include_encaminhamentos?: boolean;
  include_status_history?: boolean;
  include_timeline?: boolean;
  include_pedagogical_history?: boolean;

  // Formato de saída
  format?: "json" | "structured";
}
