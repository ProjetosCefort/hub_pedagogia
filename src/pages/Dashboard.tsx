import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  GraduationCap,
  ArrowRightLeft,
  Clock,
  AlertCircle,
  FileText,
  Heart,
  ChevronRight,
  User,
  CheckCircle2,
  CalendarDays,
  Users,
  Building2,
  FileWarning,
  BriefcaseBusiness,
  Layers3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePendencias } from "@/hooks/usePendencias";
import { usePermissions } from "@/hooks/usePermissions";
import { PendenciasBadge } from "@/components/jovens/PendenciasBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JovemAguardandoAnalise {
  id: string;
  nome_completo: string;
  data_inscricao: string;
  completion_percentage: number;
  pendencias: string[];
}

interface PendenciaPrioritaria {
  jovem_id: string;
  nome_completo: string;
  tipo: PendenciaCriticaTipo;
  label: string;
  url: string;
}

type PendenciaCriticaTipo =
  | "documento_vencido"
  | "documento_pendente"
  | "cadastro_incompleto_terceira_etapa"
  | "avaliacao_socioeconomica_faltando";

const DOCUMENTOS_OBRIGATORIOS: Array<
  "rg" | "cpf" | "comprovante_endereco" | "comprovante_escolaridade" | "carteira_trabalho"
> = [
  "rg",
  "cpf",
  "comprovante_endereco",
  "comprovante_escolaridade",
  "carteira_trabalho",
];

interface AtendimentoRecente {
  id: string;
  tipo:
    | "intervencao"
    | "atendimento_servico_social"
    | "avaliacao_pedagogica"
    | "avaliacao_socioeconomica"
    | "encaminhamento";
  jovem_nome: string;
  jovem_id: string;
  responsavel_nome: string;
  data: string;
  titulo: string;
}

interface AgendaResumoItem {
  id: string;
  titulo: string;
  tipo:
    | "intervencao"
    | "avaliacao_pedagogica"
    | "avaliacao_socioeconomica"
    | "encaminhamento";
  status: "agendado" | "realizado" | "cancelado";
  jovem_id: string | null;
  jovem_nome: string;
  publico_externo: boolean;
  publico_nome: string | null;
  agendado_para: string;
  responsavel_nome: string;
  setor: "psicossocial" | "servico_social";
}

type StatusBadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface DashboardSummary {
  jovensAtivos: number;
  documentosVencidos: number;
  pendentesPsicossocial: number;
  pendentesServicoSocial: number;
  jovensComEmpresa: number;
  contratosVencendo: number;
  avaliacoesPraticasAtrasadas: number;
}

interface EmpresaResumoItem {
  empresaId: string;
  empresaNome: string;
  totalJovens: number;
}

interface TurmaOcupacaoItem {
  turmaId: string;
  turmaNome: string;
  unidadeNome: string | null;
  totalJovens: number;
}

interface AnalistaCargaItem {
  responsavelId: string;
  responsavelNome: string;
  totalAgendamentos: number;
}

interface ContratoVencendoItem {
  jovemId: string;
  jovemNome: string;
  empresaNome: string | null;
  dataDesligamento: string;
}

interface AvaliacaoPraticaAtrasadaItem {
  id: string;
  jovemId: string;
  jovemNome: string;
  empresaNome: string | null;
  proximaDataEnvio: string;
  status: string;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>({
    jovensAtivos: 0,
    documentosVencidos: 0,
    pendentesPsicossocial: 0,
    pendentesServicoSocial: 0,
    jovensComEmpresa: 0,
    contratosVencendo: 0,
    avaliacoesPraticasAtrasadas: 0,
  });
  const [jovensPorEmpresa, setJovensPorEmpresa] = useState<EmpresaResumoItem[]>(
    [],
  );
  const [ocupacaoTurmas, setOcupacaoTurmas] = useState<TurmaOcupacaoItem[]>([]);
  const [cargaAnalistas, setCargaAnalistas] = useState<AnalistaCargaItem[]>([]);
  const [contratosVencendo, setContratosVencendo] = useState<ContratoVencendoItem[]>(
    [],
  );
  const [avaliacoesPraticasAtrasadas, setAvaliacoesPraticasAtrasadas] = useState<
    AvaliacaoPraticaAtrasadaItem[]
  >([]);
  const [jovensAguardandoAnalise, setJovensAguardandoAnalise] = useState<
    JovemAguardandoAnalise[]
  >([]);
  const [pendenciasPrioritarias, setPendenciasPrioritarias] = useState<
    PendenciaPrioritaria[]
  >([]);
  const [atendimentosRecentes, setAtendimentosRecentes] = useState<
    AtendimentoRecente[]
  >([]);
  const [agendaProximos, setAgendaProximos] = useState<AgendaResumoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPendenciaCritica, setFiltroPendenciaCritica] = useState<
    "todas" | PendenciaCriticaTipo
  >("todas");
  const { fetchPendenciasBatch } = usePendencias();
  const { hasPermission } = usePermissions();
  const canReadIntervencoesPsicossocial = hasPermission("intervencoes_psicossocial.read");
  const canReadAtendimentosServicoSocial = hasPermission("atendimentos_servico_social.read");

  useEffect(() => {
    fetchDashboardData();
  }, [canReadIntervencoesPsicossocial, canReadAtendimentosServicoSocial]);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // Buscar dados em paralelo, sem quebrar o dashboard inteiro se uma consulta falhar.
      const [
        summaryRes,
        jovensEmpresaRes,
        ocupacaoTurmasRes,
        cargaAnalistasRes,
        contratosVencendoRes,
        avaliacoesPraticasRes,
        jovensAnaliseRes,
        pendenciasRes,
        atendimentosRes,
        agendaRes,
      ] =
        await Promise.allSettled([
          fetchSummary(),
          fetchJovensPorEmpresa(),
          fetchOcupacaoTurmas(),
          fetchCargaAnalistas(),
          fetchContratosVencendo(),
          fetchAvaliacoesPraticasAtrasadas(),
          fetchJovensAguardandoAnalise(),
          fetchPendenciasPrioritarias(),
          fetchAtendimentosRecentes(),
          fetchAgendaProximos(),
        ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
      } else {
        console.error("Erro ao carregar resumo do dashboard:", summaryRes.reason);
        setSummary({
          jovensAtivos: 0,
          documentosVencidos: 0,
          pendentesPsicossocial: 0,
          pendentesServicoSocial: 0,
          jovensComEmpresa: 0,
          contratosVencendo: 0,
          avaliacoesPraticasAtrasadas: 0,
        });
      }

      if (jovensEmpresaRes.status === "fulfilled") {
        setJovensPorEmpresa(jovensEmpresaRes.value);
      } else {
        console.error(
          "Erro ao carregar distribuição de jovens por empresa:",
          jovensEmpresaRes.reason,
        );
        setJovensPorEmpresa([]);
      }

      if (ocupacaoTurmasRes.status === "fulfilled") {
        setOcupacaoTurmas(ocupacaoTurmasRes.value);
      } else {
        console.error(
          "Erro ao carregar ocupação por turma:",
          ocupacaoTurmasRes.reason,
        );
        setOcupacaoTurmas([]);
      }

      if (cargaAnalistasRes.status === "fulfilled") {
        setCargaAnalistas(cargaAnalistasRes.value);
      } else {
        console.error(
          "Erro ao carregar carga de analistas:",
          cargaAnalistasRes.reason,
        );
        setCargaAnalistas([]);
      }

      if (contratosVencendoRes.status === "fulfilled") {
        setContratosVencendo(contratosVencendoRes.value);
      } else {
        console.error(
          "Erro ao carregar contratos a vencer:",
          contratosVencendoRes.reason,
        );
        setContratosVencendo([]);
      }

      if (avaliacoesPraticasRes.status === "fulfilled") {
        setAvaliacoesPraticasAtrasadas(avaliacoesPraticasRes.value);
      } else {
        console.error(
          "Erro ao carregar avaliações práticas atrasadas:",
          avaliacoesPraticasRes.reason,
        );
        setAvaliacoesPraticasAtrasadas([]);
      }

      if (jovensAnaliseRes.status === "fulfilled") {
        setJovensAguardandoAnalise(jovensAnaliseRes.value);
      } else {
        console.error("Erro ao carregar jovens aguardando análise:", jovensAnaliseRes.reason);
        setJovensAguardandoAnalise([]);
      }

      if (pendenciasRes.status === "fulfilled") {
        setPendenciasPrioritarias(pendenciasRes.value);
      } else {
        console.error("Erro ao carregar pendências prioritárias:", pendenciasRes.reason);
        setPendenciasPrioritarias([]);
      }

      if (atendimentosRes.status === "fulfilled") {
        setAtendimentosRecentes(atendimentosRes.value);
      } else {
        console.error("Erro ao carregar atendimentos recentes:", atendimentosRes.reason);
        setAtendimentosRecentes([]);
      }

      if (agendaRes.status === "fulfilled") {
        setAgendaProximos(agendaRes.value);
      } else {
        console.error("Erro ao carregar agenda:", agendaRes.reason);
        setAgendaProximos([]);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(): Promise<DashboardSummary> {
    const today = new Date().toISOString().slice(0, 10);
    const [
      jovensAtivosRes,
      docsVencidosRes,
      psicossocialRes,
      servicoSocialRes,
      jovensComEmpresaRes,
      contratosVencendoRes,
      avaliacoesPraticasRes,
    ] = await Promise.all([
      supabase
        .from("jovens")
        .select("id", { count: "exact", head: true })
        .in("status", ["active_apprentice", "ativo"]),
      supabase
        .from("documentos_jovem")
        .select("id", { count: "exact", head: true })
        .eq("status_validacao", "aprovado")
        .not("validade_em", "is", null)
        .lte("validade_em", today),
      supabase
        .from("atendimentos_agendados")
        .select("id", { count: "exact", head: true })
        .eq("status", "agendado")
        .eq("setor", "psicossocial")
        .gte("agendado_para", new Date().toISOString()),
      supabase
        .from("atendimentos_agendados")
        .select("id", { count: "exact", head: true })
        .eq("status", "agendado")
        .eq("setor", "servico_social")
        .gte("agendado_para", new Date().toISOString()),
      supabase
        .from("jovens")
        .select("id", { count: "exact", head: true })
        .in("status", ["active_apprentice", "ativo"])
        .not("empresa_id", "is", null),
      supabase
        .from("jovens")
        .select("id", { count: "exact", head: true })
        .in("status", ["active_apprentice", "ativo"])
        .not("data_desligamento", "is", null)
        .gte("data_desligamento", new Date().toISOString().slice(0, 10))
        .lte(
          "data_desligamento",
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        ),
      supabase
        .from("avaliacoes_praticas" as any)
        .select("id", { count: "exact", head: true })
        .in("status", ["solicitada", "respondida", "atrasada"])
        .not("proxima_data_envio", "is", null)
        .lt("proxima_data_envio", new Date().toISOString().slice(0, 10)),
    ]);

    if (jovensAtivosRes.error) throw jovensAtivosRes.error;
    if (docsVencidosRes.error) throw docsVencidosRes.error;
    if (psicossocialRes.error) throw psicossocialRes.error;
    if (servicoSocialRes.error) throw servicoSocialRes.error;
    if (jovensComEmpresaRes.error) throw jovensComEmpresaRes.error;
    if (contratosVencendoRes.error) throw contratosVencendoRes.error;
    if (avaliacoesPraticasRes.error) throw avaliacoesPraticasRes.error;

    return {
      jovensAtivos: jovensAtivosRes.count ?? 0,
      documentosVencidos: docsVencidosRes.count ?? 0,
      pendentesPsicossocial: psicossocialRes.count ?? 0,
      pendentesServicoSocial: servicoSocialRes.count ?? 0,
      jovensComEmpresa: jovensComEmpresaRes.count ?? 0,
      contratosVencendo: contratosVencendoRes.count ?? 0,
      avaliacoesPraticasAtrasadas: avaliacoesPraticasRes.count ?? 0,
    };
  }

  async function fetchJovensPorEmpresa(): Promise<EmpresaResumoItem[]> {
    const { data, error } = await supabase
      .from("jovens")
      .select("empresa_id, empresa:empresas(id, nome_fantasia)")
      .in("status", ["active_apprentice", "ativo"])
      .not("empresa_id", "is", null);

    if (error) throw error;

    const grouped = new Map<string, EmpresaResumoItem>();

    (data || []).forEach((item: any) => {
      const empresaId = item.empresa_id as string | null;
      if (!empresaId) return;

      const empresaNome =
        item.empresa?.nome_fantasia?.trim() || "Empresa sem nome";
      const current = grouped.get(empresaId);

      if (current) {
        current.totalJovens += 1;
        return;
      }

      grouped.set(empresaId, {
        empresaId,
        empresaNome,
        totalJovens: 1,
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.totalJovens - a.totalJovens)
      .slice(0, 6);
  }

  async function fetchOcupacaoTurmas(): Promise<TurmaOcupacaoItem[]> {
    const { data, error } = await supabase
      .from("jovens")
      .select("turma_id, turma:turmas(id, nome, unidade:unidades(nome))")
      .in("status", ["active_apprentice", "ativo"])
      .not("turma_id", "is", null);

    if (error) throw error;

    const grouped = new Map<string, TurmaOcupacaoItem>();

    (data || []).forEach((item: any) => {
      const turmaId = item.turma_id as string | null;
      if (!turmaId) return;

      const turmaNome = item.turma?.nome?.trim() || "Turma sem nome";
      const unidadeNome = item.turma?.unidade?.nome || null;
      const current = grouped.get(turmaId);

      if (current) {
        current.totalJovens += 1;
        return;
      }

      grouped.set(turmaId, {
        turmaId,
        turmaNome,
        unidadeNome,
        totalJovens: 1,
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.totalJovens - a.totalJovens)
      .slice(0, 6);
  }

  async function fetchCargaAnalistas(): Promise<AnalistaCargaItem[]> {
    const { data, error } = await supabase
      .from("atendimentos_agendados")
      .select("responsavel_id, status, agendado_para")
      .eq("status", "agendado")
      .not("responsavel_id", "is", null)
      .gte("agendado_para", new Date().toISOString());

    if (error) throw error;

    const grouped = new Map<string, number>();
    const responsavelIds = new Set<string>();

    (data || []).forEach((item: any) => {
      const responsavelId = item.responsavel_id as string | null;
      if (!responsavelId) return;
      responsavelIds.add(responsavelId);
      grouped.set(responsavelId, (grouped.get(responsavelId) || 0) + 1);
    });

    if (responsavelIds.size === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nome_completo")
      .in("id", Array.from(responsavelIds));

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((profile: any) => {
      profileMap.set(profile.id, profile.nome_completo || "Usuário");
    });

    return Array.from(grouped.entries())
      .map(([responsavelId, totalAgendamentos]) => ({
        responsavelId,
        responsavelNome: profileMap.get(responsavelId) || "Usuário",
        totalAgendamentos,
      }))
      .sort((a, b) => b.totalAgendamentos - a.totalAgendamentos)
      .slice(0, 6);
  }

  async function fetchContratosVencendo(): Promise<ContratoVencendoItem[]> {
    const today = new Date().toISOString().slice(0, 10);
    const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from("jovens")
      .select(
        "id, nome_completo, data_desligamento, empresa:empresas(nome_fantasia)",
      )
      .in("status", ["active_apprentice", "ativo"])
      .not("data_desligamento", "is", null)
      .gte("data_desligamento", today)
      .lte("data_desligamento", next30Days)
      .order("data_desligamento", { ascending: true })
      .limit(6);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      jovemId: item.id,
      jovemNome: item.nome_completo || "Jovem sem nome",
      empresaNome: item.empresa?.nome_fantasia || null,
      dataDesligamento: item.data_desligamento,
    }));
  }

  async function fetchAvaliacoesPraticasAtrasadas(): Promise<
    AvaliacaoPraticaAtrasadaItem[]
  > {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("avaliacoes_praticas" as any)
      .select(
        "id, status, proxima_data_envio, jovem_id, jovem:jovens(id, nome_completo), empresa:empresas(nome_fantasia)",
      )
      .in("status", ["solicitada", "respondida", "atrasada"])
      .not("proxima_data_envio", "is", null)
      .lt("proxima_data_envio", today)
      .order("proxima_data_envio", { ascending: true })
      .limit(6);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      jovemId: item.jovem_id,
      jovemNome: item.jovem?.nome_completo || "Jovem sem nome",
      empresaNome: item.empresa?.nome_fantasia || null,
      proximaDataEnvio: item.proxima_data_envio,
      status: item.status,
    }));
  }

  async function fetchJovensAguardandoAnalise(): Promise<
    JovemAguardandoAnalise[]
  > {
    const { data: inscricoes, error } = await supabase
      .from("inscricoes_jovens_aprendizes")
      .select(
        `
        id,
        nome_completo,
        created_at,
        completion_percentage:calculate_inscricao_completion
      `,
      )
      .eq("status", "under_analysis")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!inscricoes || inscricoes.length === 0) return [];

    return inscricoes.map((inscricao) => ({
      id: inscricao.id,
      nome_completo: inscricao.nome_completo || "N/A",
      data_inscricao: inscricao.created_at,
      completion_percentage: inscricao.completion_percentage ?? 0,
      pendencias: [] as string[],
    }));
  }

  async function fetchPendenciasPrioritarias(): Promise<
    PendenciaPrioritaria[]
  > {
    const [{ data: jovens, error: jovensError }, { data: inscricoes, error: inscricoesError }] =
      await Promise.all([
        supabase.from("jovens").select("id, nome_completo").limit(200),
        supabase
          .from("inscricoes_jovens_aprendizes")
          .select("id, nome_completo, current_step, step3_completed_at, status, jovem_id")
          .limit(200),
      ]);

    if (jovensError) throw jovensError;
    if (inscricoesError) throw inscricoesError;

    const pendenciasPrioritarias: PendenciaPrioritaria[] = [];
    const jovensList = jovens || [];
    const jovemIds = jovensList.map((j) => j.id);

    if (jovemIds.length > 0) {
      const [pendenciasMap, docsRes] = await Promise.all([
        fetchPendenciasBatch(jovemIds),
        supabase
          .from("documentos_jovem")
          .select("jovem_id, tipo, status_validacao")
          .in("jovem_id", jovemIds)
          .in("tipo", DOCUMENTOS_OBRIGATORIOS),
      ]);

      if (docsRes.error) throw docsRes.error;
      const documentos = docsRes.data || [];

      const docsPorJovem = new Map<
        string,
        Array<{
          tipo: (typeof DOCUMENTOS_OBRIGATORIOS)[number];
          status_validacao: "pendente" | "aprovado" | "rejeitado";
        }>
      >();

      documentos.forEach((doc: any) => {
        const current = docsPorJovem.get(doc.jovem_id) || [];
        current.push({
          tipo: doc.tipo,
          status_validacao: doc.status_validacao,
        });
        docsPorJovem.set(doc.jovem_id, current);
      });

      jovensList.forEach((jovem) => {
        const pendencias = pendenciasMap[jovem.id] || [];
        const docs = docsPorJovem.get(jovem.id) || [];

        if (pendencias.includes("avaliacao_socioeconomica_faltando")) {
          pendenciasPrioritarias.push({
            jovem_id: jovem.id,
            nome_completo: jovem.nome_completo,
            tipo: "avaliacao_socioeconomica_faltando",
            label: "Sem avaliação socioeconômica",
            url: `/jovens/${jovem.id}`,
          });
        }

        const hasDocumentoVencido = pendencias.includes("documento_vencido");

        const hasDocumentoPendente = DOCUMENTOS_OBRIGATORIOS.some((tipo) => {
          const docDoTipo = docs.find((doc) => doc.tipo === tipo);
          return !docDoTipo || docDoTipo.status_validacao === "pendente";
        });

        if (hasDocumentoVencido) {
          pendenciasPrioritarias.push({
            jovem_id: jovem.id,
            nome_completo: jovem.nome_completo,
            tipo: "documento_vencido",
            label: "Documentos vencidos",
            url: `/jovens/${jovem.id}`,
          });
        }

        if (hasDocumentoPendente) {
          pendenciasPrioritarias.push({
            jovem_id: jovem.id,
            nome_completo: jovem.nome_completo,
            tipo: "documento_pendente",
            label: "Documento pendente",
            url: `/jovens/${jovem.id}`,
          });
        }
      });
    }

    (inscricoes || []).forEach((inscricao: any) => {
      const status = inscricao.status as string | null;
      const emFluxo =
        status === "draft" ||
        status === "completed" ||
        status === "talent_bank" ||
        status === "under_analysis";

      const incompleta =
        (inscricao.current_step ?? 1) < 3 || !inscricao.step3_completed_at;
      const jaVinculada = Boolean(inscricao.jovem_id);

      if (emFluxo && incompleta && !jaVinculada) {
        pendenciasPrioritarias.push({
          jovem_id: inscricao.id,
          nome_completo: inscricao.nome_completo || "N/A",
          tipo: "cadastro_incompleto_terceira_etapa",
          label: "Cadastro incompleto (não chegou até a terceira etapa)",
          url: `/jovens/gestao/analise/${inscricao.id}`,
        });
      }
    });

    return pendenciasPrioritarias.slice(0, 50);
  }

  async function fetchAtendimentosRecentes(): Promise<AtendimentoRecente[]> {
    const setoresIntervencoes = [
      canReadIntervencoesPsicossocial ? "psicossocial" : null,
      canReadAtendimentosServicoSocial ? "servico_social" : null,
    ].filter(Boolean) as Array<"psicossocial" | "servico_social">;

    const [
      intervencoesRes,
      avaliacoesPedagogicasRes,
      avaliacoesSocioRes,
      encaminhamentosRes,
    ] =
      await Promise.all([
        setoresIntervencoes.length > 0
          ? supabase
              .from("intervencoes")
              .select(
                `id, data_atendimento, descricao_demanda, setor, responsavel_id, created_by, jovem:jovens(id, nome_completo)`,
              )
              .in("setor", setoresIntervencoes)
              .order("data_atendimento", { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("avaliacoes_pedagogicas")
          .select(
            `id, data_avaliacao, motivo_intervencao, responsavel_id, created_by, jovem:jovens(id, nome_completo)`,
          )
          .order("data_avaliacao", { ascending: false })
          .limit(3),
        supabase
          .from("avaliacoes_socioeconomicas")
          .select(
            `id, data_avaliacao, responsavel_id, created_by, jovem:jovens(id, nome_completo)`,
          )
          .order("data_avaliacao", { ascending: false })
          .limit(2),
        supabase
          .from("encaminhamentos")
          .select(
            `id, data_encaminhamento, destino_instituicao, responsavel_id, created_by, jovem:jovens(id, nome_completo)`,
          )
          .order("data_encaminhamento", { ascending: false })
          .limit(2),
      ]);

    const intervencoes = intervencoesRes.data || [];
    const avaliacoesPedagogicas = avaliacoesPedagogicasRes.data || [];
    const avaliacoesSocio = avaliacoesSocioRes.data || [];
    const encaminhamentos = encaminhamentosRes.data || [];

    const userIds = new Set<string>();
    [
      ...intervencoes,
      ...avaliacoesPedagogicas,
      ...avaliacoesSocio,
      ...encaminhamentos,
    ].forEach(
      (item: any) => {
        if (item.responsavel_id) userIds.add(item.responsavel_id);
        if (item.created_by) userIds.add(item.created_by);
      },
    );

    const profilesMap = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", Array.from(userIds));

      profiles?.forEach((p) => {
        profilesMap.set(p.id, p.nome_completo);
      });
    }

    const atendimentos: AtendimentoRecente[] = [];

    intervencoes.forEach((item: any) => {
      const userId = item.responsavel_id || item.created_by;
      const isServicoSocial = item.setor === "servico_social";
      atendimentos.push({
        id: item.id,
        tipo: isServicoSocial ? "atendimento_servico_social" : "intervencao",
        jovem_nome: item.jovem?.nome_completo || "N/A",
        jovem_id: item.jovem?.id || "",
        responsavel_nome: userId
          ? profilesMap.get(userId) || "Sistema"
          : "Sistema",
        data: item.data_atendimento,
        titulo: item.descricao_demanda || (isServicoSocial ? "Atendimento Serviço Social" : "Intervenção"),
      });
    });

    avaliacoesPedagogicas.forEach((item: any) => {
      const userId = item.responsavel_id || item.created_by;
      atendimentos.push({
        id: item.id,
        tipo: "avaliacao_pedagogica",
        jovem_nome: item.jovem?.nome_completo || "N/A",
        jovem_id: item.jovem?.id || "",
        responsavel_nome: userId
          ? profilesMap.get(userId) || "Sistema"
          : "Sistema",
        data: item.data_avaliacao,
        titulo: item.motivo_intervencao || "Avaliação Pedagógica",
      });
    });

    avaliacoesSocio.forEach((item: any) => {
      const userId = item.responsavel_id || item.created_by;
      atendimentos.push({
        id: item.id,
        tipo: "avaliacao_socioeconomica",
        jovem_nome: item.jovem?.nome_completo || "N/A",
        jovem_id: item.jovem?.id || "",
        responsavel_nome: userId
          ? profilesMap.get(userId) || "Sistema"
          : "Sistema",
        data: item.data_avaliacao,
        titulo: "Avaliação Socioeconômica",
      });
    });
    encaminhamentos.forEach((item: any) => {
      const userId = item.responsavel_id || item.created_by;
      atendimentos.push({
        id: item.id,
        tipo: "encaminhamento",
        jovem_nome: item.jovem?.nome_completo || "N/A",
        jovem_id: item.jovem?.id || "",
        responsavel_nome: userId
          ? profilesMap.get(userId) || "Sistema"
          : "Sistema",
        data: item.data_encaminhamento,
        titulo: item.destino_instituicao || "Encaminhamento",
      });
    });

    return atendimentos
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10);
  }

  async function fetchAgendaProximos(): Promise<AgendaResumoItem[]> {
    const { data, error } = await supabase
      .from("atendimentos_agendados")
      .select(
        `
        id,
        titulo,
        tipo,
        status,
        agendado_para,
        responsavel_id,
        created_by,
        setor,
        jovem_id,
        publico_externo,
        publico_nome,
        jovem:jovens(id, nome_completo)
      `,
      )
      .gte("agendado_para", new Date().toISOString())
      .order("agendado_para", { ascending: true })
      .limit(5);

    if (error) throw error;
    const agenda = data || [];

    const userIds = new Set<string>();
    agenda.forEach((item: any) => {
      if (item.responsavel_id) userIds.add(item.responsavel_id);
      if (item.created_by) userIds.add(item.created_by);
    });

    const profilesMap = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", Array.from(userIds));

      profiles?.forEach((profile) => {
        profilesMap.set(profile.id, profile.nome_completo);
      });
    }

    return agenda.map((item: any) => ({
      id: item.id,
      titulo: item.titulo,
      tipo: item.tipo,
      status: item.status,
      setor: item.setor || (
        item.tipo === "avaliacao_socioeconomica" || item.tipo === "encaminhamento"
          ? "servico_social"
          : "psicossocial"
      ),
      agendado_para: item.agendado_para,
      jovem_id: item.jovem?.id || item.jovem_id || null,
      jovem_nome: item.publico_externo
        ? item.publico_nome || "Público externo"
        : item.jovem?.nome_completo || "Jovem removido",
      publico_externo: Boolean(item.publico_externo),
      publico_nome: item.publico_nome || null,
      responsavel_nome: item.responsavel_id
        ? profilesMap.get(item.responsavel_id) || "Sem responsável"
        : "Sem responsável",
    }));
  }

  function getTipoIcon(tipo: string) {
    switch (tipo) {
      case "intervencao":
        return ClipboardList;
      case "atendimento_servico_social":
        return Heart;
      case "avaliacao_pedagogica":
        return GraduationCap;
      case "avaliacao_socioeconomica":
        return Heart;
      case "encaminhamento":
        return ArrowRightLeft;
      default:
        return FileText;
    }
  }

  function getTipoLabel(tipo: string) {
    switch (tipo) {
      case "intervencao":
        return "Intervenção";
      case "atendimento_servico_social":
        return "Atendimento Serviço Social";
      case "avaliacao_pedagogica":
        return "Avaliação Pedagógica";
      case "avaliacao_socioeconomica":
        return "Avaliação Socioeconômica";
      case "encaminhamento":
        return "Encaminhamento";
      default:
        return tipo;
    }
  }

  function getAgendaStatusLabel(status: AgendaResumoItem["status"]) {
    switch (status) {
      case "agendado":
        return "Agendado";
      case "realizado":
        return "Realizado";
      case "cancelado":
        return "Cancelado";
      default:
        return status;
    }
  }

  function getAgendaStatusVariant(
    status: AgendaResumoItem["status"],
  ): StatusBadgeVariant {
    switch (status) {
      case "agendado":
        return "secondary";
      case "realizado":
        return "default";
      case "cancelado":
        return "destructive";
      default:
        return "outline";
    }
  }

  function getAgendaEditUrl(item: AgendaResumoItem) {
    const base =
      item.setor === "servico_social"
        ? "/servico-social/agenda"
        : "/psicossocial/agenda";
    return `${base}/${item.id}/editar`;
  }

  // Agrupar pendências por tipo para contadores
  const pendenciasPorTipo = {
    documento_vencido: pendenciasPrioritarias.filter(
      (p) => p.tipo === "documento_vencido",
    ).length,
    documento_pendente: pendenciasPrioritarias.filter(
      (p) => p.tipo === "documento_pendente",
    ).length,
    cadastro_incompleto_terceira_etapa: pendenciasPrioritarias.filter(
      (p) => p.tipo === "cadastro_incompleto_terceira_etapa",
    ).length,
    avaliacao_socioeconomica_faltando: pendenciasPrioritarias.filter(
      (p) => p.tipo === "avaliacao_socioeconomica_faltando",
    ).length,
  };

  const pendenciasCriticasFiltradas =
    filtroPendenciaCritica === "todas"
      ? pendenciasPrioritarias
      : pendenciasPrioritarias.filter((p) => p.tipo === filtroPendenciaCritica);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard Operacional</h1>
        <p className="page-description">
          Visão operacional para analistas pedagógicos e sociais
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Jovens ativos</p>
              <p className="text-3xl font-bold">{loading ? "—" : summary.jovensAtivos}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Com empresa vinculada</p>
              <p className="text-3xl font-bold">
                {loading ? "—" : summary.jovensComEmpresa}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-info" />
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Contratos a vencer</p>
              <p className="text-3xl font-bold">
                {loading ? "—" : summary.contratosVencendo}
              </p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Documentos vencidos</p>
              <p className="text-3xl font-bold">
                {loading ? "—" : summary.documentosVencidos}
              </p>
            </div>
            <FileWarning className="h-8 w-8 text-destructive" />
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Pendentes psicossocial</p>
              <p className="text-3xl font-bold">
                {loading ? "—" : summary.pendentesPsicossocial}
              </p>
            </div>
            <ClipboardList className="h-8 w-8 text-warning" />
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Pendentes serviço social</p>
              <p className="text-3xl font-bold">
                {loading ? "—" : summary.pendentesServicoSocial}
              </p>
            </div>
            <BriefcaseBusiness className="h-8 w-8 text-accent" />
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Avaliações práticas atrasadas</p>
              <p className="text-3xl font-bold">
                {loading ? "—" : summary.avaliacoesPraticasAtrasadas}
              </p>
            </div>
            <GraduationCap className="h-8 w-8 text-destructive" />
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Esquerda - Jovens Aguardando Análise */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers3 className="w-5 h-5 text-warning" />
                    Intervenções pendentes por setor
                  </CardTitle>
                  <CardDescription>
                    Atendimentos futuros ainda agendados e pendentes de execução
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Psicossocial</p>
                      <p className="text-xs text-muted-foreground">
                        Intervenções e avaliações pedagógicas agendadas
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-base">
                      {loading ? "—" : summary.pendentesPsicossocial}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Serviço Social</p>
                      <p className="text-xs text-muted-foreground">
                        Avaliações socioeconômicas e encaminhamentos agendados
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-base">
                      {loading ? "—" : summary.pendentesServicoSocial}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-destructive" />
                    Avaliações práticas atrasadas
                  </CardTitle>
                  <CardDescription>
                    Registros com próxima data de envio vencida e ainda pendentes
                  </CardDescription>
                </div>
                <Badge variant="destructive" className="text-lg">
                  {loading ? "—" : summary.avaliacoesPraticasAtrasadas}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : avaliacoesPraticasAtrasadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma avaliação prática atrasada.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {avaliacoesPraticasAtrasadas.map((avaliacao) => (
                    <Link
                      key={avaliacao.id}
                      to={`/jovens/${avaliacao.jovemId}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {avaliacao.jovemNome}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {avaliacao.empresaNome || "Empresa não informada"}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {format(new Date(avaliacao.proximaDataEnvio), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    Contratos a vencer
                  </CardTitle>
                  <CardDescription>
                    Jovens ativos com data final de vínculo prevista para os próximos 30 dias
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg">
                  {loading ? "—" : summary.contratosVencendo}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : contratosVencendo.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum contrato previsto para vencer nos próximos 30 dias.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contratosVencendo.map((contrato) => (
                    <Link
                      key={contrato.jovemId}
                      to={`/jovens/${contrato.jovemId}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {contrato.jovemNome}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {contrato.empresaNome || "Empresa não informada"}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {format(new Date(contrato.dataDesligamento), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-info" />
                    Jovens por empresa
                  </CardTitle>
                  <CardDescription>
                    Distribuição atual dos jovens ativos com empresa vinculada
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg">
                  {loading ? "—" : jovensPorEmpresa.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : jovensPorEmpresa.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum jovem ativo vinculado a empresa.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jovensPorEmpresa.map((empresa) => {
                    const percentage =
                      summary.jovensComEmpresa > 0
                        ? Math.round((empresa.totalJovens / summary.jovensComEmpresa) * 100)
                        : 0;

                    return (
                      <div key={empresa.empresaId} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium truncate">{empresa.empresaNome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{empresa.totalJovens} jovem(ns)</span>
                            <Badge variant="secondary">{percentage}%</Badge>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg">Ocupação por sala</CardTitle>
                <CardDescription>
                  Jovens ativos atualmente vinculados por turma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  </div>
                ) : ocupacaoTurmas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma turma com jovens ativos vinculados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ocupacaoTurmas.map((turma) => (
                      <div
                        key={turma.turmaId}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{turma.turmaNome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {turma.unidadeNome || "Unidade não informada"}
                          </p>
                        </div>
                        <Badge variant="secondary">{turma.totalJovens} jovem(ns)</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg">Ocupação por analista</CardTitle>
                <CardDescription>
                  Carga atual baseada em agendamentos futuros atribuídos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  </div>
                ) : cargaAnalistas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum agendamento futuro com responsável definido.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cargaAnalistas.map((analista) => (
                      <div
                        key={analista.responsavelId}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <p className="truncate text-sm font-medium">
                          {analista.responsavelNome}
                        </p>
                        <Badge variant="secondary">
                          {analista.totalAgendamentos} agendamento(s)
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Jovens Aguardando Análise */}
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    Jovens aguardando análise
                  </CardTitle>
                  <CardDescription>
                    Inscrições com status "Em Análise" que precisam de atenção
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg">
                  {loading ? "—" : jovensAguardandoAnalise.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : jovensAguardandoAnalise.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum jovem aguardando análise
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jovensAguardandoAnalise.map((jovem) => (
                    <div
                      key={jovem.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-medium text-sm truncate">
                            {jovem.nome_completo}
                          </p>
                          <PendenciasBadge
                            pendencias={jovem.pendencias}
                            compact={true}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Inscrição:{" "}
                            {format(
                              new Date(jovem.data_inscricao),
                              "dd/MM/yyyy",
                              {
                                locale: ptBR,
                              },
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            Cadastro: {jovem.completion_percentage}%
                          </span>
                        </div>
                        <Progress
                          value={jovem.completion_percentage}
                          className="mt-2 h-1.5"
                        />
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="ml-4"
                      >
                        <Link to={`/jovens/gestao?inscricao_id=${jovem.id}`}>
                          Analisar
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pendências Críticas */}
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    Pendências críticas
                  </CardTitle>
                  <CardDescription>
                    Jovens com pendências críticas que requerem ação
                  </CardDescription>
                </div>
                <Badge variant="destructive" className="text-lg">
                  {loading ? "—" : pendenciasCriticasFiltradas.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : pendenciasPrioritarias.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma pendência crítica
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Select
                      value={filtroPendenciaCritica}
                      onValueChange={(value) =>
                        setFiltroPendenciaCritica(
                          value as "todas" | PendenciaCriticaTipo,
                        )
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue placeholder="Filtrar por pendência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as pendências</SelectItem>
                        <SelectItem value="documento_vencido">
                          Documento vencido
                        </SelectItem>
                        <SelectItem value="documento_pendente">
                          Documento pendente
                        </SelectItem>
                        <SelectItem value="cadastro_incompleto_terceira_etapa">
                          Cadastro incompleto (não chegou até a terceira etapa)
                        </SelectItem>
                        <SelectItem value="avaliacao_socioeconomica_faltando">
                          Sem avaliação socioeconômica
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contadores por tipo */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="text-2xl font-bold">
                        {pendenciasPorTipo.documento_vencido}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Documento vencido
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="text-2xl font-bold">
                        {pendenciasPorTipo.documento_pendente}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Documento pendente
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="text-2xl font-bold">
                        {pendenciasPorTipo.cadastro_incompleto_terceira_etapa}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cadastro incompleto
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="text-2xl font-bold">
                        {pendenciasPorTipo.avaliacao_socioeconomica_faltando}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sem avaliação socioeconômica
                      </div>
                    </div>
                  </div>

                  {/* Lista de pendências */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {pendenciasCriticasFiltradas
                      .slice(0, 10)
                      .map((pendencia, idx) => (
                        <Link
                          key={`${pendencia.jovem_id}-${pendencia.tipo}-${idx}`}
                          to={pendencia.url}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {pendencia.nome_completo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pendencia.label}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                        </Link>
                      ))}
                    {pendenciasCriticasFiltradas.length === 0 && (
                      <div className="p-4 rounded-lg border border-border text-sm text-muted-foreground text-center">
                        Nenhuma pendência encontrada para o filtro selecionado.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          {/* Agenda Próximos */}
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    Agenda (próximos 5)
                  </CardTitle>
                  <CardDescription>
                    Compromissos agendados para os próximos dias
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/psicossocial/agenda">Ver agenda</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground">
                    Carregando agenda...
                  </p>
                </div>
              ) : agendaProximos.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum atendimento agendado.
                  </p>
                  <Button size="sm" asChild>
                    <Link to="/psicossocial/agenda/nova">Agendar atendimento</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {agendaProximos.map((item) => (
                    <Link
                      key={item.id}
                      to={getAgendaEditUrl(item)}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {`${format(
                            new Date(item.agendado_para),
                            "dd/MM HH:mm",
                            { locale: ptBR },
                          )} · ${item.titulo}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.jovem_nome} • {getTipoLabel(item.tipo)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Responsável: {item.responsavel_nome}
                        </p>
                      </div>
                      <Badge variant={getAgendaStatusVariant(item.status)}>
                        {getAgendaStatusLabel(item.status)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atendimentos Recentes */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-info" />
                Atendimentos recentes
              </CardTitle>
              <CardDescription>
                Últimas 10 intervenções ou avaliações registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : atendimentosRecentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum atendimento recente
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atendimentosRecentes.map((atendimento) => {
                    const Icon = getTipoIcon(atendimento.tipo);
                    return (
                      <Link
                        key={`${atendimento.tipo}-${atendimento.id}`}
                        to={`/jovens/${atendimento.jovem_id}`}
                        className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded bg-info/10 mt-0.5">
                            <Icon className="w-4 h-4 text-info" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {atendimento.jovem_nome}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {getTipoLabel(atendimento.tipo)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span className="truncate">
                                {atendimento.responsavel_nome}
                              </span>
                              <span>•</span>
                              <span>
                                {format(
                                  new Date(atendimento.data),
                                  "dd/MM/yyyy",
                                  { locale: ptBR },
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Ações rápidas</CardTitle>
              <CardDescription>
                Acesso rápido às principais funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link to="/intervencoes/nova">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Nova intervenção
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link to="/avaliacoes-pedagogicas/nova">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Nova avaliação pedagógica
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link to="/avaliacoes-socioeconomicas/nova">
                    <Heart className="w-4 h-4 mr-2" />
                    Nova avaliação socioeconômica
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link to="/encaminhamentos/novo">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Novo encaminhamento
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
