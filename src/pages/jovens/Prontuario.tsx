import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  User,
  Building2,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ClipboardList,
  GraduationCap,
  Heart,
  ArrowRightLeft,
  AlertCircle,
  BriefcaseBusiness,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePendencias } from "@/hooks/usePendencias";
import { usePermissions } from "@/hooks/usePermissions";
import { PendenciasBadge } from "@/components/jovens/PendenciasBadge";
import { StatusIndicator } from "@/components/jovens/StatusIndicator";
import { InternalNotes } from "@/components/jovens/InternalNotes";
import { JovemDocumentosTab } from "@/components/jovens/JovemDocumentosTab";
import { JovemTarefasTab } from "@/components/jovens/JovemTarefasTab";
import { FamilyCompositionManager } from "@/components/jovens/FamilyCompositionManager";
import { SocialAssistanceNetworkManager } from "@/components/jovens/SocialAssistanceNetworkManager";
import { formatDateOnly } from "@/lib/formatters";

interface Jovem {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  cpf: string | null;
  raca: string | null;
  email: string | null;
  celular: string | null;
  cidade: string | null;
  estado: string | null;
  matricula: string | null;
  status: string;
  data_admissao: string | null;
  foto_url: string | null;
  empresa: { nome_fantasia: string | null; razao_social: string } | null;
  turma: { nome: string; codigo: string } | null;
  unidade: { nome: string } | null;
}

interface InscricaoComplementar {
  id: string;
  pis_pasep: string | null;
  tem_ctps_digital: boolean | null;
  numero_ctps: string | null;
  unidade_preferencia: string | null;
  tamanho_uniforme: string | null;
  tamanho_calcado: string | null;
  renda_familiar: number | null;
  quantidade_membros: number | null;
  composicao_familiar: unknown;
  registros_sociais_ids: string[];
  tipo_moradia: string | null;
  situacao_moradia: string | null;
  possui_saneamento: boolean | null;
  possui_energia: boolean | null;
  possui_doenca_cronica: boolean | null;
  descricao_doenca: string | null;
  possui_deficiencia: boolean | null;
  descricao_deficiencia: string | null;
  acompanhamento_medico: boolean | null;
  descricao_acompanhamento: string | null;
  recebe_beneficio: boolean | null;
  descricao_beneficio: string | null;
  participa_programa_social: boolean | null;
  descricao_programa: string | null;
  observacoes: string | null;
  updated_at: string;
}

interface TimelineItem {
  id: string;
  tipo_evento:
    | "intervencao"
    | "servico_social"
    | "pedagogica"
    | "socioeconomica"
    | "encaminhamento"
    | "avaliacao_pratica"
    | "solicitacao_setorial";
  data_evento: string;
  created_at: string;
  titulo: string;
  resumo: string;
  responsavel_id: string | null;
  created_by: string | null;
  status_jovem: string;
  responsavelNome?: string;
  responsavelCargo?: string;
}

interface IntervencaoTimelineRow {
  id: string;
  setor: string | null;
  data_atendimento: string | null;
  created_at: string;
  motivo_intervencao: string | null;
  descricao_demanda: string | null;
  responsavel_id: string | null;
  created_by: string | null;
}

interface AvaliacaoPedagogicaTimelineRow {
  id: string;
  data_avaliacao: string | null;
  created_at: string;
  motivo_intervencao: string | null;
  parecer_final: string | null;
  responsavel_id: string | null;
  created_by: string | null;
}

interface AvaliacaoSocioeconomicaTimelineRow {
  id: string;
  data_avaliacao: string | null;
  created_at: string;
  pcd_status: string | null;
  renda_familiar: number | null;
  quantidade_membros: number | null;
  responsavel_id: string | null;
  created_by: string | null;
}

interface EncaminhamentoTimelineRow {
  id: string;
  data_encaminhamento: string | null;
  created_at: string;
  destino_instituicao: string | null;
  destino_nome: string | null;
  retorno_previsto: string | null;
  responsavel_id: string | null;
  created_by: string | null;
}

interface AvaliacaoPraticaTimelineRow {
  id: string;
  status: string;
  data_solicitacao: string;
  data_resposta: string | null;
  data_validacao: string | null;
  proxima_data_envio: string | null;
  avaliador_nome: string | null;
  parecer_empresa: string | null;
  parecer_interno: string | null;
  observacoes: string | null;
  created_at: string;
  created_by: string | null;
  responsavel_id: string | null;
  empresa: { nome_fantasia: string | null; razao_social: string | null } | null;
}

interface SolicitacaoTimelineRow {
  id: string;
  setor_origem: string;
  setor_destino: string;
  titulo: string;
  descricao: string;
  prioridade: string;
  status: string;
  prazo_resposta: string | null;
  devolutiva: string | null;
  solicitada_por: string | null;
  respondida_por: string | null;
  responded_at: string | null;
  created_at: string;
}

interface VagaVinculoItem {
  id: string;
  vaga_ref: string;
  status: "em_analise" | "aprovado" | "reprovado" | "encerrado";
  observacoes: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  completed: "Completo",
  under_analysis: "Em análise",
  pending_documents: "Documentos pendentes",
  approved: "Aprovado",
  rejected: "Rejeitado",
  active_apprentice: "Aprendiz ativo",
  inactive: "Inativo",
  terminated: "Desligado",
  completed_program: "Programa concluído",
};

const typeLabels: Record<
  string,
  {
    label: string;
    icon: typeof ClipboardList;
    color: string;
    badgeColor: string;
  }
> = {
  intervencao: {
    label: "Intervenção",
    icon: ClipboardList,
    color: "text-info",
    badgeColor: "bg-info/10 text-info border-info/20",
  },
  servico_social: {
    label: "Atendimento Serviço Social",
    icon: Heart,
    color: "text-primary",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
  pedagogica: {
    label: "Avaliação Pedagógica",
    icon: GraduationCap,
    color: "text-accent",
    badgeColor: "bg-accent/10 text-accent border-accent/20",
  },
  socioeconomica: {
    label: "Avaliação Socioeconômica",
    icon: Heart,
    color: "text-warning",
    badgeColor: "bg-warning/10 text-warning border-warning/20",
  },
  encaminhamento: {
    label: "Encaminhamento",
    icon: ArrowRightLeft,
    color: "text-primary",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
  avaliacao_pratica: {
    label: "Avaliação Prática",
    icon: ClipboardList,
    color: "text-info",
    badgeColor: "bg-info/10 text-info border-info/20",
  },
  solicitacao_setorial: {
    label: "Solicitação entre setores",
    icon: ArrowRightLeft,
    color: "text-warning",
    badgeColor: "bg-warning/10 text-warning border-warning/20",
  },
};

export default function Prontuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jovem, setJovem] = useState<Jovem | null>(null);
  const [inscricaoComplementar, setInscricaoComplementar] =
    useState<InscricaoComplementar | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [vagaVinculos, setVagaVinculos] = useState<VagaVinculoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendencias, setPendencias] = useState<string[]>([]);
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const { fetchPendencias } = usePendencias();
  const { hasPermission } = usePermissions();

  const canReadIntervencoesPsicossocial = hasPermission("intervencoes_psicossocial.read");
  const canWriteIntervencoesPsicossocial = hasPermission("intervencoes_psicossocial.write");
  const canReadAtendimentosServicoSocial = hasPermission("atendimentos_servico_social.read");
  const canWriteAtendimentosServicoSocial = hasPermission("atendimentos_servico_social.write");
  const canReadPedagogica = hasPermission("avaliacoes_pedagogicas.read");
  const canWritePedagogica = hasPermission("avaliacoes_pedagogicas.write");
  const canReadSocioeconomica = hasPermission("avaliacoes_socioeconomicas.read");
  const canWriteSocioeconomica = hasPermission("avaliacoes_socioeconomicas.write");
  const canReadEncaminhamentos = hasPermission("encaminhamentos.read");
  const canWriteEncaminhamentos = hasPermission("encaminhamentos.write");
  const canReadVagas = hasPermission("jovem_vagas.read");
  const canEditJovem = hasPermission("jovens.write");
  const canViewDocumentos = canEditJovem;
  const canViewTarefas =
    canEditJovem ||
    canWriteIntervencoesPsicossocial ||
    canWriteAtendimentosServicoSocial ||
    canWritePedagogica ||
    canWriteSocioeconomica ||
    canWriteEncaminhamentos;
  const canViewSolicitacoes =
    canEditJovem ||
    canWriteIntervencoesPsicossocial ||
    canWriteAtendimentosServicoSocial ||
    canWritePedagogica ||
    canWriteSocioeconomica ||
    canReadIntervencoesPsicossocial ||
    canReadAtendimentosServicoSocial ||
    canReadPedagogica ||
    canReadSocioeconomica;
  const canViewAvaliacoesPraticas =
    canEditJovem ||
    canWriteIntervencoesPsicossocial ||
    canReadIntervencoesPsicossocial;
  const canViewObservacoesInternas =
    canEditJovem ||
    canWriteIntervencoesPsicossocial ||
    canWriteAtendimentosServicoSocial ||
    canWritePedagogica ||
    canWriteSocioeconomica;
  const canViewDadosCadastrais =
    canEditJovem || canReadSocioeconomica || canReadAtendimentosServicoSocial;
  const canViewTimeline =
    canReadIntervencoesPsicossocial ||
    canReadAtendimentosServicoSocial ||
    canReadPedagogica ||
    canReadSocioeconomica ||
    canReadEncaminhamentos ||
    canViewAvaliacoesPraticas ||
    canViewSolicitacoes;

  useEffect(() => {
    if (id) {
      fetchJovem();
      if (canViewTimeline) fetchTimeline();
      if (canReadVagas) fetchVagaVinculos();
      fetchPendencias(id).then(setPendencias);
    }
  }, [
    id,
    filterTipo,
    fetchPendencias,
    canViewTimeline,
    canReadIntervencoesPsicossocial,
    canReadAtendimentosServicoSocial,
    canViewAvaliacoesPraticas,
    canViewSolicitacoes,
    canReadVagas,
  ]);

  const handleDocumentsChanged = useCallback(() => {
    if (!id) return;
    fetchPendencias(id).then(setPendencias);
  }, [id, fetchPendencias]);

  async function fetchJovem() {
    const { data } = await supabase
      .from("jovens")
      .select(
        `
        *,
        empresa:empresas(nome_fantasia, razao_social),
        turma:turmas(nome, codigo),
        unidade:unidades(nome)
      `,
      )
      .eq("id", id)
      .maybeSingle();

    setJovem(data);
    if (data && canViewDadosCadastrais) {
      fetchInscricaoComplementar(data as Jovem);
    } else {
      setInscricaoComplementar(null);
    }
    setLoading(false);
  }

  async function fetchInscricaoComplementar(jovemData: Jovem) {
    if (!id) return;

    const selectFields = `
      id,
      pis_pasep,
      tem_ctps_digital,
      numero_ctps,
      unidade_preferencia,
      tamanho_uniforme,
      tamanho_calcado,
      renda_familiar,
      quantidade_membros,
      composicao_familiar,
      registros_sociais_ids,
      tipo_moradia,
      situacao_moradia,
      possui_saneamento,
      possui_energia,
      possui_doenca_cronica,
      descricao_doenca,
      possui_deficiencia,
      descricao_deficiencia,
      acompanhamento_medico,
      descricao_acompanhamento,
      recebe_beneficio,
      descricao_beneficio,
      participa_programa_social,
      descricao_programa,
      observacoes,
      updated_at
    `;

    const byJovem = await supabase
      .from("inscricoes_jovens_aprendizes")
      .select(selectFields)
      .eq("jovem_id", id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!byJovem.error && byJovem.data) {
      setInscricaoComplementar(byJovem.data as InscricaoComplementar);
      return;
    }

    const identityFilters = [
      jovemData.cpf ? `cpf.eq.${jovemData.cpf}` : "",
      jovemData.email ? `email.eq.${jovemData.email}` : "",
    ].filter(Boolean);

    if (identityFilters.length === 0) {
      setInscricaoComplementar(null);
      return;
    }

    const byIdentity = await supabase
      .from("inscricoes_jovens_aprendizes")
      .select(selectFields)
      .or(identityFilters.join(","))
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byIdentity.error) {
      console.error("Erro ao buscar informações complementares:", byIdentity.error);
      setInscricaoComplementar(null);
      return;
    }

    setInscricaoComplementar(
      byIdentity.data ? (byIdentity.data as InscricaoComplementar) : null,
    );
  }

  async function fetchTimeline() {
    if (!id) return;

    const tipoEvento = filterTipo === "all" ? null : filterTipo;
    const shouldInclude = (tipo: TimelineItem["tipo_evento"]) =>
      !tipoEvento || tipoEvento === tipo;
    const shouldQueryIntervencoes =
      (canReadIntervencoesPsicossocial && shouldInclude("intervencao")) ||
      (canReadAtendimentosServicoSocial && shouldInclude("servico_social"));
    const setoresIntervencoes = [
      canReadIntervencoesPsicossocial ? "psicossocial" : null,
      canReadAtendimentosServicoSocial ? "servico_social" : null,
    ].filter(Boolean) as Array<"psicossocial" | "servico_social">;

    const [
      intervencoesRes,
      pedagogicasRes,
      socioeconomicasRes,
      encaminhamentosRes,
      avaliacoesPraticasRes,
      solicitacoesRes,
    ] = await Promise.all([
      shouldQueryIntervencoes
        ? supabase
            .from("intervencoes")
            .select(
              "id, data_atendimento, created_at, motivo_intervencao, descricao_demanda, setor, responsavel_id, created_by",
            )
            .eq("jovem_id", id)
            .in("setor", setoresIntervencoes)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      shouldInclude("pedagogica")
        ? supabase
            .from("avaliacoes_pedagogicas")
            .select(
              "id, data_avaliacao, created_at, motivo_intervencao, parecer_final, responsavel_id, created_by",
            )
            .eq("jovem_id", id)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      shouldInclude("socioeconomica")
        ? supabase
            .from("avaliacoes_socioeconomicas")
            .select(
              "id, data_avaliacao, created_at, pcd_status, renda_familiar, quantidade_membros, responsavel_id, created_by",
            )
            .eq("jovem_id", id)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      shouldInclude("encaminhamento")
        ? supabase
            .from("encaminhamentos")
            .select(
              "id, data_encaminhamento, created_at, destino_instituicao, destino_nome, retorno_previsto, responsavel_id, created_by",
            )
            .eq("jovem_id", id)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      canViewAvaliacoesPraticas && shouldInclude("avaliacao_pratica")
        ? supabase
            .from("avaliacoes_praticas" as any)
            .select(
              "id, status, data_solicitacao, data_resposta, data_validacao, proxima_data_envio, avaliador_nome, parecer_empresa, parecer_interno, observacoes, created_at, created_by, responsavel_id, empresa:empresas(nome_fantasia, razao_social)",
            )
            .eq("jovem_id", id)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      canViewSolicitacoes && shouldInclude("solicitacao_setorial")
        ? supabase
            .from("solicitacoes_setoriais" as any)
            .select(
              "id, setor_origem, setor_destino, titulo, descricao, prioridade, status, prazo_resposta, devolutiva, solicitada_por, respondida_por, responded_at, created_at",
            )
            .eq("jovem_id", id)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (intervencoesRes.error) {
      console.error("Erro ao buscar intervenções da timeline:", intervencoesRes.error);
    }
    if (pedagogicasRes.error) {
      console.error("Erro ao buscar avaliações pedagógicas da timeline:", pedagogicasRes.error);
    }
    if (socioeconomicasRes.error) {
      console.error("Erro ao buscar avaliações socioeconômicas da timeline:", socioeconomicasRes.error);
    }
    if (encaminhamentosRes.error) {
      console.error("Erro ao buscar encaminhamentos da timeline:", encaminhamentosRes.error);
    }
    if (avaliacoesPraticasRes.error) {
      console.error("Erro ao buscar avaliações práticas da timeline:", avaliacoesPraticasRes.error);
    }
    if (solicitacoesRes.error) {
      console.error("Erro ao buscar solicitações setoriais da timeline:", solicitacoesRes.error);
    }

    const timelineData: TimelineItem[] = [];

    const intervencoes = (intervencoesRes.data || []) as IntervencaoTimelineRow[];
    const pedagogicas = (pedagogicasRes.data || []) as AvaliacaoPedagogicaTimelineRow[];
    const socioeconomicas = (
      socioeconomicasRes.data || []
    ) as AvaliacaoSocioeconomicaTimelineRow[];
    const encaminhamentos = (
      encaminhamentosRes.data || []
    ) as EncaminhamentoTimelineRow[];
    const avaliacoesPraticas = (
      avaliacoesPraticasRes.data || []
    ) as AvaliacaoPraticaTimelineRow[];
    const solicitacoes = (solicitacoesRes.data || []) as SolicitacaoTimelineRow[];

    intervencoes.forEach((item) => {
      const tipoEvento =
        item.setor === "servico_social" ? "servico_social" : "intervencao";

      if (!shouldInclude(tipoEvento)) return;

      timelineData.push({
        id: item.id,
        tipo_evento: tipoEvento,
        data_evento: item.data_atendimento || item.created_at,
        created_at: item.created_at,
        titulo:
          tipoEvento === "servico_social"
            ? "Atendimento Serviço Social"
            : "Intervenção",
        resumo: [item.motivo_intervencao, item.descricao_demanda]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 200),
        responsavel_id: item.responsavel_id || null,
        created_by: item.created_by || null,
        status_jovem: jovem?.status || "",
      });
    });

    pedagogicas.forEach((item) => {
      timelineData.push({
        id: item.id,
        tipo_evento: "pedagogica",
        data_evento: item.data_avaliacao || item.created_at,
        created_at: item.created_at,
        titulo: "Avaliação Pedagógica",
        resumo: [item.motivo_intervencao, item.parecer_final]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 200),
        responsavel_id: item.responsavel_id || null,
        created_by: item.created_by || null,
        status_jovem: jovem?.status || "",
      });
    });

    socioeconomicas.forEach((item) => {
      timelineData.push({
        id: item.id,
        tipo_evento: "socioeconomica",
        data_evento: item.data_avaliacao || item.created_at,
        created_at: item.created_at,
        titulo: "Avaliação Socioeconômica",
        resumo: [
          item.pcd_status ? `PCD: ${item.pcd_status}` : null,
          item.renda_familiar != null ? `Renda: R$ ${item.renda_familiar}` : null,
          item.quantidade_membros != null
            ? `Membros: ${item.quantidade_membros}`
            : null,
        ]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 200),
        responsavel_id: item.responsavel_id || null,
        created_by: item.created_by || null,
        status_jovem: jovem?.status || "",
      });
    });

    encaminhamentos.forEach((item) => {
      timelineData.push({
        id: item.id,
        tipo_evento: "encaminhamento",
        data_evento: item.data_encaminhamento || item.created_at,
        created_at: item.created_at,
        titulo: "Encaminhamento",
        resumo: [
          [item.destino_instituicao, item.destino_nome].filter(Boolean).join(" - "),
          item.retorno_previsto ? `Retorno: ${item.retorno_previsto}` : null,
        ]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 200),
        responsavel_id: item.responsavel_id || null,
        created_by: item.created_by || null,
        status_jovem: jovem?.status || "",
      });
    });

    avaliacoesPraticas.forEach((item) => {
      const empresa =
        item.empresa?.nome_fantasia || item.empresa?.razao_social || "Empresa não informada";
      const dataEvento = item.data_validacao || item.data_resposta || item.data_solicitacao || item.created_at;
      timelineData.push({
        id: item.id,
        tipo_evento: "avaliacao_pratica",
        data_evento: dataEvento,
        created_at: item.created_at,
        titulo: "Avaliação Prática",
        resumo: [
          `Empresa: ${empresa}`,
          `Status: ${formatPracticalStatus(item.status)}`,
          item.avaliador_nome ? `Avaliador: ${item.avaliador_nome}` : null,
          item.parecer_empresa || item.parecer_interno || item.observacoes,
        ]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 200),
        responsavel_id: item.responsavel_id || null,
        created_by: item.created_by || null,
        status_jovem: jovem?.status || "",
      });
    });

    solicitacoes.forEach((item) => {
      timelineData.push({
        id: item.id,
        tipo_evento: "solicitacao_setorial",
        data_evento: item.responded_at || item.created_at,
        created_at: item.created_at,
        titulo: item.titulo || "Solicitação entre setores",
        resumo: [
          `${setorLabel(item.setor_origem)} → ${setorLabel(item.setor_destino)}`,
          `Prioridade: ${item.prioridade}`,
          `Status: ${formatSolicitacaoStatus(item.status)}`,
          item.devolutiva || item.descricao,
        ]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 200),
        responsavel_id: item.solicitada_por || null,
        created_by: item.respondida_por || null,
        status_jovem: jovem?.status || "",
      });
    });

    if (timelineData.length === 0) {
      setTimeline([]);
      return;
    }

    // Coletar todos os user IDs únicos para buscar profiles
    const userIds = new Set<string>();
    timelineData.forEach((item) => {
      if (item.responsavel_id) userIds.add(item.responsavel_id);
      if (item.created_by) userIds.add(item.created_by);
    });

    // Buscar todos os profiles de uma vez (otimização)
    const profilesMap = new Map<
      string,
      { nome_completo: string; cargo: string | null }
    >();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_completo, cargo")
        .in("id", Array.from(userIds));

      profiles?.forEach((p) => {
        profilesMap.set(p.id, {
          nome_completo: p.nome_completo,
          cargo: p.cargo,
        });
      });
    }

    // Enriquecer timeline com dados dos profiles
    const enrichedTimeline: TimelineItem[] = timelineData
      .sort(
        (a, b) =>
          new Date(b.data_evento || b.created_at).getTime() -
          new Date(a.data_evento || a.created_at).getTime(),
      )
      .map((item) => {
        const userId = item.responsavel_id || item.created_by;
        const profile = userId ? profilesMap.get(userId) : null;

        return {
          ...item,
          responsavelNome: profile?.nome_completo || "Sistema",
          responsavelCargo: profile?.cargo || null,
        };
      });

    setTimeline(enrichedTimeline);
  }

  async function fetchVagaVinculos() {
    if (!id) return;

    const { data, error } = await supabase
      .from("jovem_vaga_vinculos")
      .select("id, vaga_ref, status, observacoes, created_at")
      .eq("jovem_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code !== "42501") {
        console.error("Erro ao buscar vínculos de vaga:", error);
      }
      setVagaVinculos([]);
      return;
    }

    setVagaVinculos((data as VagaVinculoItem[]) ?? []);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse-soft text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!jovem) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Jovem aprendiz não encontrado</p>
        <Button asChild variant="link">
          <Link to="/jovens">Voltar para lista de jovens aprendizes</Link>
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-16 h-16 border-2 border-primary/20">
            <AvatarImage src={jovem.foto_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {getInitials(jovem.nome_completo)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="page-title">{jovem.nome_completo}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <StatusIndicator
                status={jovem.status as any}
                pendencias={pendencias}
                compact={false}
              />
              <Badge
                variant="outline"
                className={`badge-status-${jovem.status}`}
              >
                {statusLabels[jovem.status]}
              </Badge>
              {jovem.matricula && (
                <span className="text-sm text-muted-foreground">
                  Matrícula: {jovem.matricula}
                </span>
              )}
            </div>
          </div>
        </div>
        {canEditJovem && (
          <Button asChild>
            <Link to={`/jovens/${id}/editar`}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="prontuario" className="space-y-6">
        <TabsList>
          <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
          {canViewDocumentos && (
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          )}
          {canViewTarefas && <TabsTrigger value="tarefas">Tarefas</TabsTrigger>}
          {canViewObservacoesInternas && (
            <TabsTrigger value="observacoes-internas">
              Observações Internas
            </TabsTrigger>
          )}
          {canViewDadosCadastrais && (
            <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="prontuario" className="space-y-6">
          {/* Quick Info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {jovem.empresa && (
              <Card className="card-elevated">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="text-sm font-medium">
                      {jovem.empresa.nome_fantasia ||
                        jovem.empresa.razao_social}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {jovem.turma && (
              <Card className="card-elevated">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <BookOpen className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Turma</p>
                    <p className="text-sm font-medium">{jovem.turma.nome}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {jovem.data_admissao && (
              <Card className="card-elevated">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Calendar className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Admissão</p>
                    <p className="text-sm font-medium">
                      {format(new Date(jovem.data_admissao), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {(jovem.cidade || jovem.estado) && (
              <Card className="card-elevated">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <MapPin className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Localização</p>
                    <p className="text-sm font-medium">
                      {[jovem.cidade, jovem.estado].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pendências */}
          {pendencias.length > 0 && (
            <Card className="card-elevated border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Itens Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PendenciasBadge pendencias={pendencias} compact={false} />
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {(canWriteIntervencoesPsicossocial ||
            canWriteAtendimentosServicoSocial ||
            canWritePedagogica ||
            canWriteSocioeconomica ||
            canWriteEncaminhamentos ||
            canReadIntervencoesPsicossocial ||
            canReadAtendimentosServicoSocial ||
            canReadPedagogica ||
            canReadSocioeconomica ||
            canReadEncaminhamentos ||
            canReadVagas) && (
            <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Novos Registros e Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {canWriteIntervencoesPsicossocial && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/intervencoes/nova?jovem_id=${id}`}>
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Nova intervenção
                    </Link>
                  </Button>
                )}
                {canWriteAtendimentosServicoSocial && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/servico-social/atendimentos/nova?jovem_id=${id}`}>
                      <Heart className="w-4 h-4 mr-2" />
                      Novo atendimento social
                    </Link>
                  </Button>
                )}
                {canWritePedagogica && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/avaliacoes-pedagogicas/nova?jovem_id=${id}`}>
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Nova avaliação pedagógica
                    </Link>
                  </Button>
                )}
                {canWriteSocioeconomica && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/avaliacoes-socioeconomicas/nova?jovem_id=${id}`}>
                      <Heart className="w-4 h-4 mr-2" />
                      Nova avaliação socioeconômica
                    </Link>
                  </Button>
                )}
                {canWriteEncaminhamentos && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/encaminhamentos/novo?jovem_id=${id}`}>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Novo encaminhamento
                    </Link>
                  </Button>
                )}
                {canReadVagas && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/vagas-vinculos/novo?jovem_id=${id}`}>
                      <BriefcaseBusiness className="w-4 h-4 mr-2" />
                      Vínculo de vaga
                    </Link>
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {canReadIntervencoesPsicossocial && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/intervencoes?jovem_id=${id}`}>
                      Histórico de intervenções
                    </Link>
                  </Button>
                )}
                {canReadAtendimentosServicoSocial && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/servico-social/atendimentos?jovem_id=${id}`}>
                      Histórico Serviço Social
                    </Link>
                  </Button>
                )}
                {canReadPedagogica && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/avaliacoes-pedagogicas?jovem_id=${id}`}>
                      Histórico pedagógico
                    </Link>
                  </Button>
                )}
                {canReadSocioeconomica && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/avaliacoes-socioeconomicas?jovem_id=${id}`}>
                      Histórico socioeconômico
                    </Link>
                  </Button>
                )}
                {canReadEncaminhamentos && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/encaminhamentos?jovem_id=${id}`}>
                      Histórico de encaminhamentos
                    </Link>
                  </Button>
                )}
                {canReadVagas && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/vagas-vinculos">Histórico de vínculos</Link>
                  </Button>
                )}
              </div>
              {!canWriteIntervencoesPsicossocial &&
                !canWriteAtendimentosServicoSocial &&
                !canWritePedagogica &&
                !canWriteSocioeconomica &&
                !canWriteEncaminhamentos && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Você não possui permissão para criar novos registros neste prontuário.
                  </p>
                )}
            </CardContent>
            </Card>
          )}

          {canReadVagas ? (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BriefcaseBusiness className="w-4 h-4" />
                  Vínculos de Vaga
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vagaVinculos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum vínculo de vaga registrado para este jovem aprendiz.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {vagaVinculos.map((item) => (
                      <div key={item.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.vaga_ref}</p>
                          <Badge
                            variant={
                              item.status === "reprovado"
                                ? "destructive"
                                : item.status === "aprovado"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {item.status === "em_analise"
                              ? "Em análise para vaga"
                              : item.status === "aprovado"
                                ? "Aprovado"
                                : item.status === "reprovado"
                                  ? "Reprovado"
                                  : "Encerrado"}
                          </Badge>
                        </div>
                        {item.observacoes ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.observacoes}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <AccessDeniedCard message="Você não possui permissão para visualizar vínculos de vaga." />
          )}

          {/* Timeline */}
          {canViewTimeline ? (
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Linha do Tempo</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={filterTipo === "all" ? "default" : "outline"}
                      onClick={() => setFilterTipo("all")}
                    >
                      Todos
                    </Button>
                    {canReadIntervencoesPsicossocial && (
                      <Button
                        size="sm"
                        variant={filterTipo === "intervencao" ? "default" : "outline"}
                        onClick={() => setFilterTipo("intervencao")}
                      >
                        Intervenções
                      </Button>
                    )}
                    {canReadAtendimentosServicoSocial && (
                      <Button
                        size="sm"
                        variant={filterTipo === "servico_social" ? "default" : "outline"}
                        onClick={() => setFilterTipo("servico_social")}
                      >
                        Serviço Social
                      </Button>
                    )}
                    {canReadPedagogica && (
                      <Button
                        size="sm"
                        variant={filterTipo === "pedagogica" ? "default" : "outline"}
                        onClick={() => setFilterTipo("pedagogica")}
                      >
                        Avaliações Pedagógicas
                      </Button>
                    )}
                    {canReadSocioeconomica && (
                      <Button
                        size="sm"
                        variant={filterTipo === "socioeconomica" ? "default" : "outline"}
                        onClick={() => setFilterTipo("socioeconomica")}
                      >
                        Avaliações Socioeconomicas
                      </Button>
                    )}
                    {canReadEncaminhamentos && (
                      <Button
                        size="sm"
                        variant={filterTipo === "encaminhamento" ? "default" : "outline"}
                        onClick={() => setFilterTipo("encaminhamento")}
                      >
                        Encaminhamentos
                      </Button>
                    )}
                    {canViewAvaliacoesPraticas && (
                      <Button
                        size="sm"
                        variant={filterTipo === "avaliacao_pratica" ? "default" : "outline"}
                        onClick={() => setFilterTipo("avaliacao_pratica")}
                      >
                        Avaliações Práticas
                      </Button>
                    )}
                    {canViewSolicitacoes && (
                      <Button
                        size="sm"
                        variant={filterTipo === "solicitacao_setorial" ? "default" : "outline"}
                        onClick={() => setFilterTipo("solicitacao_setorial")}
                      >
                        Solicitações
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum registro encontrado
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filterTipo !== "all"
                        ? "Tente ajustar os filtros"
                        : "Adicione intervenções, atendimentos, avaliações, encaminhamentos ou solicitações"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {timeline.map((item) => {
                      const config = typeLabels[item.tipo_evento];
                      const Icon = config.icon;
                      return (
                        <div
                          key={`${item.tipo_evento}-${item.id}`}
                          className={`timeline-item timeline-${item.tipo_evento === "pedagogica" ? "pedagogica" : item.tipo_evento === "socioeconomica" ? "socioeconomica" : item.tipo_evento}`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`p-1.5 rounded-md bg-muted ${config.color}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${config.badgeColor}`}
                                  >
                                    {config.label}
                                  </Badge>
                                  {item.status_jovem && (
                                    <Badge
                                      variant="outline"
                                      className={`text-xs badge-status-${item.status_jovem}`}
                                    >
                                      {statusLabels[item.status_jovem]}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(
                                      new Date(item.data_evento),
                                      "dd/MM/yyyy",
                                      { locale: ptBR },
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                                    {format(new Date(item.created_at), "HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {item.titulo}
                              </p>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {item.resumo}
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                {(item.tipo_evento === "pedagogica" ||
                                  item.tipo_evento === "socioeconomica") && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto text-xs px-0"
                                    asChild
                                  >
                                    <Link
                                      to={
                                        item.tipo_evento === "pedagogica"
                                          ? `/avaliacoes-pedagogicas/${item.id}/imprimir`
                                          : `/avaliacoes-socioeconomicas/${item.id}/imprimir`
                                      }
                                    >
                                      <Printer className="w-3 h-3 mr-1" />
                                      Imprimir avaliação
                                    </Link>
                                  </Button>
                                )}
                                {item.tipo_evento === "socioeconomica" &&
                                  canWriteSocioeconomica && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto text-xs px-0"
                                      asChild
                                    >
                                      <Link
                                        to={`/avaliacoes-socioeconomicas/${item.id}/editar`}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Editar preenchimento
                                      </Link>
                                    </Button>
                                  )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {item.responsavelNome || "Sistema"}
                                </span>
                                {item.responsavelCargo && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs py-0 px-1.5 h-5"
                                  >
                                    {item.responsavelCargo}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <AccessDeniedCard message="Você não possui permissão para visualizar o histórico deste prontuário." />
          )}
        </TabsContent>

        {canViewDocumentos && (
          <TabsContent value="documentos" className="space-y-6">
            <JovemDocumentosTab
              jovemId={id!}
              onDocumentsChange={handleDocumentsChanged}
            />
          </TabsContent>
        )}

        {canViewTarefas && (
          <TabsContent value="tarefas" className="space-y-6">
            <JovemTarefasTab jovemId={id!} />
          </TabsContent>
        )}

        {canViewObservacoesInternas && (
          <TabsContent value="observacoes-internas" className="space-y-6">
            <InternalNotes jovemId={id!} />
          </TabsContent>
        )}

        {canViewDadosCadastrais && (
          <TabsContent value="dados" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Nome completo" value={jovem.nome_completo} />
                  <InfoRow
                    label="Data de nascimento"
                    value={formatDateOnly(jovem.data_nascimento) || null}
                  />
                  <InfoRow label="CPF" value={jovem.cpf} />
                  <InfoRow label="Raça/Cor" value={jovem.raca} />
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow
                    label="E-mail"
                    value={jovem.email}
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <InfoRow
                    label="Celular"
                    value={jovem.celular}
                    icon={<Phone className="w-4 h-4" />}
                  />
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BriefcaseBusiness className="w-4 h-4" />
                    Informações Complementares
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow
                    label="PIS/PASEP"
                    value={inscricaoComplementar?.pis_pasep}
                  />
                  <InfoRow
                    label="Carteira de Trabalho Digital"
                    value={formatBoolean(inscricaoComplementar?.tem_ctps_digital)}
                  />
                  <InfoRow
                    label="Número da CTPS"
                    value={inscricaoComplementar?.numero_ctps}
                  />
                  <InfoRow
                    label="Unidade de preferência"
                    value={inscricaoComplementar?.unidade_preferencia}
                  />
                  <InfoRow
                    label="Tamanho do uniforme"
                    value={inscricaoComplementar?.tamanho_uniforme}
                  />
                  <InfoRow
                    label="Tamanho do calçado"
                    value={inscricaoComplementar?.tamanho_calcado}
                  />
                </CardContent>
              </Card>

              <Card className="card-elevated lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Pesquisa Socioeconômica do Cadastro
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  <InfoRow
                    label="Renda familiar"
                    value={formatCurrency(inscricaoComplementar?.renda_familiar)}
                  />
                  <InfoRow
                    label="Quantidade de membros"
                    value={formatNumber(inscricaoComplementar?.quantidade_membros)}
                  />
                  <InfoRow
                    label="Tipo de moradia"
                    value={inscricaoComplementar?.tipo_moradia}
                  />
                  <InfoRow
                    label="Situação da moradia"
                    value={inscricaoComplementar?.situacao_moradia}
                  />
                  <InfoRow
                    label="Possui saneamento"
                    value={formatBoolean(inscricaoComplementar?.possui_saneamento)}
                  />
                  <InfoRow
                    label="Possui energia"
                    value={formatBoolean(inscricaoComplementar?.possui_energia)}
                  />
                  <InfoRow
                    label="Doença crônica"
                    value={
                      formatBooleanWithDetail(
                        inscricaoComplementar?.possui_doenca_cronica,
                        inscricaoComplementar?.descricao_doenca,
                      )
                    }
                  />
                  <InfoRow
                    label="Deficiência"
                    value={
                      formatBooleanWithDetail(
                        inscricaoComplementar?.possui_deficiencia,
                        inscricaoComplementar?.descricao_deficiencia,
                      )
                    }
                  />
                  <InfoRow
                    label="Acompanhamento médico"
                    value={
                      formatBooleanWithDetail(
                        inscricaoComplementar?.acompanhamento_medico,
                        inscricaoComplementar?.descricao_acompanhamento,
                      )
                    }
                  />
                  <InfoRow
                    label="Benefício social"
                    value={
                      formatBooleanWithDetail(
                        inscricaoComplementar?.recebe_beneficio,
                        inscricaoComplementar?.descricao_beneficio,
                      )
                    }
                  />
                  <InfoRow
                    label="Programa social"
                    value={
                      formatBooleanWithDetail(
                        inscricaoComplementar?.participa_programa_social,
                        inscricaoComplementar?.descricao_programa,
                      )
                    }
                  />
                  <InfoRow
                    label="Atualizado em"
                    value={
                      inscricaoComplementar?.updated_at
                        ? format(
                            new Date(inscricaoComplementar.updated_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR },
                          )
                        : null
                    }
                  />
                  <div className="sm:col-span-2">
                    <InfoRow
                      label="Observações"
                      value={inscricaoComplementar?.observacoes}
                    />
                  </div>
                  <div className="sm:col-span-2 pt-3">
                    <FamilyCompositionManager
                      inscricaoId={inscricaoComplementar?.id ?? null}
                      value={inscricaoComplementar?.composicao_familiar}
                      canEdit={canEditJovem || canWriteSocioeconomica}
                      onSaved={(composicao_familiar) =>
                        setInscricaoComplementar((current) =>
                          current ? { ...current, composicao_familiar } : current,
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2 pt-3">
                    <SocialAssistanceNetworkManager
                      inscricaoId={inscricaoComplementar?.id ?? null}
                      selectedIds={inscricaoComplementar?.registros_sociais_ids ?? []}
                      canEdit={canEditJovem || canWriteSocioeconomica}
                      onSaved={(registros_sociais_ids) =>
                        setInscricaoComplementar((current) =>
                          current ? { ...current, registros_sociais_ids } : current,
                        )
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AccessDeniedCard({ message }: { message: string }) {
  return (
    <Card className="card-elevated border-amber-500/30">
      <CardContent className="py-6 text-sm text-muted-foreground text-center">
        {message}
      </CardContent>
    </Card>
  );
}

function setorLabel(setor: string) {
  switch (setor) {
    case "pedagogico":
      return "Pedagógico";
    case "psicossocial":
      return "Psicossocial";
    case "servico_social":
      return "Serviço Social";
    default:
      return setor;
  }
}

function formatPracticalStatus(status: string) {
  switch (status) {
    case "solicitada":
      return "Solicitada";
    case "respondida":
      return "Respondida";
    case "validada":
      return "Validada";
    case "atrasada":
      return "Atrasada";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
}

function formatSolicitacaoStatus(status: string) {
  switch (status) {
    case "aberta":
      return "Aberta";
    case "em_andamento":
      return "Em andamento";
    case "respondida":
      return "Respondida";
    case "concluida":
      return "Concluída";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  return value ? "Sim" : "Não";
}

function formatBooleanWithDetail(
  value: boolean | null | undefined,
  detail: string | null | undefined,
) {
  const label = formatBoolean(value);
  if (!label) return detail || null;
  return detail ? `${label} - ${detail}` : label;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}
