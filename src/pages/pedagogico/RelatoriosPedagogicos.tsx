import { useEffect, useMemo, useState } from "react";
import { Download, GraduationCap, LineChart, School2, UsersRound } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface UnidadeOption {
  id: string;
  nome: string;
}

interface TurmaOption {
  id: string;
  nome: string;
}

interface CursoRow {
  id: string;
  nome: string;
  codigo: string;
  unidade_id: string | null;
  gov_vigencia_fim: string | null;
  gov_protocolo: string | null;
}

interface TurmaPlanejamentoRow {
  id: string;
  nome: string;
  codigo: string;
  unidade_id: string | null;
  curso_id: string | null;
  capacidade: number | null;
  analista_responsavel_id: string | null;
  unidade?: { nome: string | null } | null;
  curso?: { nome: string | null; codigo: string | null } | null;
}

interface DisciplinaRow {
  id: string;
  carga_horaria: number;
}

interface EmentaRow {
  id: string;
}

interface AvaliacaoPedagogicaRow {
  id: string;
  data_avaliacao: string;
  motivo_intervencao: string | null;
  jovem: {
    unidade_id: string | null;
    turma_id: string | null;
    unidade?: { nome: string | null } | null;
    turma?: { nome: string | null } | null;
  } | null;
}

interface ConselhoClasseRow {
  id: string;
  data_reuniao: string;
  status: "aberto" | "finalizado" | "arquivado";
  turma_id: string | null;
}

interface VinculoRow {
  id: string;
  created_at: string;
  status: "em_analise" | "aprovado" | "reprovado" | "encerrado";
}

const FILTER_ALL = "__all__";
const CHART_COLORS = ["#0f766e", "#2563eb", "#f59e0b", "#ef4444", "#7c3aed", "#14b8a6"];

function monthKey(value: string) {
  return format(new Date(value), "MM/yyyy", { locale: ptBR });
}

export default function RelatoriosPedagogicos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<"30" | "90" | "180" | "365">("180");
  const [unidadeFilter, setUnidadeFilter] = useState<string>(FILTER_ALL);
  const [turmaFilter, setTurmaFilter] = useState<string>(FILTER_ALL);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPedagogicaRow[]>([]);
  const [conselhos, setConselhos] = useState<ConselhoClasseRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoRow[]>([]);
  const [cursos, setCursos] = useState<CursoRow[]>([]);
  const [turmasPlanejamento, setTurmasPlanejamento] = useState<TurmaPlanejamentoRow[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaRow[]>([]);
  const [ementas, setEmentas] = useState<EmentaRow[]>([]);
  const [analistasMap, setAnalistasMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAnalytics();
  }, [periodFilter]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const fromDate = subDays(new Date(), Number(periodFilter)).toISOString();

      const [
        { data: unidadesData, error: unidadesError },
        { data: turmasData, error: turmasError },
        { data: avaliacoesData, error: avaliacoesError },
        { data: conselhosData, error: conselhosError },
        { data: vinculosData, error: vinculosError },
        { data: cursosData, error: cursosError },
        { data: turmasPlanejamentoData, error: turmasPlanejamentoError },
        { data: disciplinasData, error: disciplinasError },
        { data: ementasData, error: ementasError },
      ] = await Promise.all([
        supabase.from("unidades").select("id, nome").order("nome"),
        supabase.from("turmas").select("id, nome").order("nome"),
        supabase
          .from("avaliacoes_pedagogicas")
          .select(
            `
              id,
              data_avaliacao,
              motivo_intervencao,
              jovem:jovens(
                unidade_id,
                turma_id,
                unidade:unidades(nome),
                turma:turmas(nome)
              )
            `,
          )
          .gte("data_avaliacao", fromDate)
          .order("data_avaliacao", { ascending: false }),
        supabase
          .from("conselho_classe" as any)
          .select("id, data_reuniao, status, turma_id")
          .gte("data_reuniao", fromDate)
          .order("data_reuniao", { ascending: false }),
        supabase
          .from("jovem_vaga_vinculos" as any)
          .select("id, created_at, status")
          .gte("created_at", fromDate)
          .order("created_at", { ascending: false }),
        supabase
          .from("cursos")
          .select("id, nome, codigo, unidade_id, gov_vigencia_fim, gov_protocolo")
          .order("nome", { ascending: true }),
        supabase
          .from("turmas")
          .select(
            `
              id,
              nome,
              codigo,
              unidade_id,
              curso_id,
              capacidade,
              analista_responsavel_id,
              unidade:unidades(nome),
              curso:cursos(nome, codigo)
            `,
          )
          .order("nome", { ascending: true }),
        supabase.from("disciplinas").select("id, carga_horaria"),
        supabase.from("ementas").select("id"),
      ]);

      if (unidadesError) throw unidadesError;
      if (turmasError) throw turmasError;
      if (avaliacoesError) throw avaliacoesError;
      if (conselhosError) throw conselhosError;
      if (vinculosError) throw vinculosError;
      if (cursosError) throw cursosError;
      if (turmasPlanejamentoError) throw turmasPlanejamentoError;
      if (disciplinasError) throw disciplinasError;
      if (ementasError) throw ementasError;

      const responsavelIds = Array.from(
        new Set(
          (turmasPlanejamentoData || [])
            .map((item: any) => item.analista_responsavel_id)
            .filter(Boolean),
        ),
      ) as string[];

      const nextAnalistasMap: Record<string, string> = {};
      if (responsavelIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", responsavelIds);

        (profiles || []).forEach((profile) => {
          nextAnalistasMap[profile.id] = profile.nome_completo || "Analista";
        });
      }

      setUnidades((unidadesData || []) as UnidadeOption[]);
      setTurmas((turmasData || []) as TurmaOption[]);
      setAvaliacoes((avaliacoesData || []) as unknown as AvaliacaoPedagogicaRow[]);
      setConselhos((conselhosData || []) as ConselhoClasseRow[]);
      setVinculos((vinculosData || []) as VinculoRow[]);
      setCursos((cursosData || []) as CursoRow[]);
      setTurmasPlanejamento((turmasPlanejamentoData || []) as unknown as TurmaPlanejamentoRow[]);
      setDisciplinas((disciplinasData || []) as DisciplinaRow[]);
      setEmentas((ementasData || []) as EmentaRow[]);
      setAnalistasMap(nextAnalistasMap);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatórios pedagógicos",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredAvaliacoes = useMemo(() => {
    return avaliacoes.filter((item) => {
      const matchesUnidade =
        unidadeFilter === FILTER_ALL || item.jovem?.unidade_id === unidadeFilter;
      const matchesTurma =
        turmaFilter === FILTER_ALL || item.jovem?.turma_id === turmaFilter;
      return matchesUnidade && matchesTurma;
    });
  }, [avaliacoes, turmaFilter, unidadeFilter]);

  const filteredConselhos = useMemo(() => {
    return conselhos.filter((item) => turmaFilter === FILTER_ALL || item.turma_id === turmaFilter);
  }, [conselhos, turmaFilter]);

  const avaliacoesPorMes = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredAvaliacoes.forEach((item) => {
      const key = monthKey(item.data_avaliacao);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([mes, total]) => ({ mes, total }));
  }, [filteredAvaliacoes]);

  const avaliacoesPorTurma = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredAvaliacoes.forEach((item) => {
      const key = item.jovem?.turma?.nome || "Sem turma";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([turma, total]) => ({ turma, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredAvaliacoes]);

  const avaliacoesPorUnidade = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredAvaliacoes.forEach((item) => {
      const key = item.jovem?.unidade?.nome || "Sem unidade";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredAvaliacoes]);

  const conselhosPorStatus = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredConselhos.forEach((item) => {
      grouped.set(item.status, (grouped.get(item.status) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([status, total]) => ({ status, total }));
  }, [filteredConselhos]);

  const vinculosPorStatus = useMemo(() => {
    const grouped = new Map<string, number>();
    vinculos.forEach((item) => {
      grouped.set(item.status, (grouped.get(item.status) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([status, total]) => ({ status, total }));
  }, [vinculos]);

  const turmasPlanejamentoFiltradas = useMemo(() => {
    return turmasPlanejamento.filter((item) => {
      const matchesUnidade =
        unidadeFilter === FILTER_ALL || item.unidade_id === unidadeFilter;
      const matchesTurma = turmaFilter === FILTER_ALL || item.id === turmaFilter;
      return matchesUnidade && matchesTurma;
    });
  }, [turmasPlanejamento, turmaFilter, unidadeFilter]);

  const ocupacaoPorSala = useMemo(() => {
    return turmasPlanejamentoFiltradas
      .map((item) => {
        const ocupacaoAtual = avaliacoes.filter((avaliacao) => avaliacao.jovem?.turma_id === item.id).length;
        const capacidade = item.capacidade || 0;
        const taxa = capacidade > 0 ? Math.round((ocupacaoAtual / capacidade) * 100) : null;
        return {
          sala: item.nome,
          curso: item.curso?.nome || "Sem curso",
          capacidade,
          ocupacaoAtual,
          taxa,
        };
      })
      .sort((a, b) => b.ocupacaoAtual - a.ocupacaoAtual);
  }, [avaliacoes, turmasPlanejamentoFiltradas]);

  const ocupacaoPorAnalista = useMemo(() => {
    const grouped = new Map<string, { nome: string; turmas: number; capacidadeTotal: number }>();

    turmasPlanejamentoFiltradas.forEach((item) => {
      const id = item.analista_responsavel_id || "sem-analista";
      const nome = item.analista_responsavel_id
        ? analistasMap[item.analista_responsavel_id] || "Analista"
        : "Sem analista";
      const current = grouped.get(id) || { nome, turmas: 0, capacidadeTotal: 0 };
      current.turmas += 1;
      current.capacidadeTotal += item.capacidade || 0;
      grouped.set(id, current);
    });

    return Array.from(grouped.values()).sort((a, b) => b.turmas - a.turmas);
  }, [analistasMap, turmasPlanejamentoFiltradas]);

  const consolidadoPlanejamento = useMemo(() => {
    const cursosComGov = cursos.filter((item) => item.gov_protocolo || item.gov_vigencia_fim).length;
    const cursosVencendo = cursos.filter((item) => {
      if (!item.gov_vigencia_fim) return false;
      const diffDays = Math.ceil(
        (new Date(item.gov_vigencia_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays <= 90;
    }).length;

    const cargaHorariaBanco = disciplinas.reduce((sum, item) => sum + item.carga_horaria, 0);

    return {
      cursos: cursos.length,
      cursosComGov,
      cursosVencendo,
      turmas: turmasPlanejamentoFiltradas.length,
      ementas: ementas.length,
      disciplinas: disciplinas.length,
      cargaHorariaBanco,
    };
  }, [cursos, disciplinas, ementas.length, turmasPlanejamentoFiltradas.length]);

  const statusLabels: Record<string, string> = {
    aberto: "Aberto",
    finalizado: "Finalizado",
    arquivado: "Arquivado",
    em_analise: "Em análise",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    encerrado: "Encerrado",
  };

  function handleExportExcel() {
    const rows = turmasPlanejamentoFiltradas.map((item) => ({
      unidade: item.unidade?.nome || "Sem unidade",
      turma: item.nome,
      curso: item.curso?.nome || "Sem curso",
      capacidade: item.capacidade || 0,
      analista: item.analista_responsavel_id
        ? analistasMap[item.analista_responsavel_id] || "Analista"
        : "Sem analista",
    }));

    downloadExcel("relatorios-pedagogicos.xls", rows, [
      { header: "Unidade", accessor: (row) => row.unidade },
      { header: "Turma", accessor: (row) => row.turma },
      { header: "Curso", accessor: (row) => row.curso },
      { header: "Capacidade", accessor: (row) => row.capacidade },
      { header: "Analista", accessor: (row) => row.analista },
    ]);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Relatórios pedagógicos</h1>
          <p className="page-description">
            Indicadores consolidados de avaliações, conselhos de classe e vínculos pedagógicos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as typeof periodFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
              <SelectItem value="365">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportExcel} disabled={filteredAvaliacoes.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros do módulo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidade</span>
            <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Todas as unidades</SelectItem>
                {unidades.map((unidade) => (
                  <SelectItem key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Turma</span>
            <Select value={turmaFilter} onValueChange={setTurmaFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Todas as turmas</SelectItem>
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avaliações pedagógicas</CardDescription>
            <CardTitle className="text-2xl">{filteredAvaliacoes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conselhos de classe</CardDescription>
            <CardTitle className="text-2xl">{filteredConselhos.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vínculos de vaga</CardDescription>
            <CardTitle className="text-2xl">{vinculos.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Turmas com movimento</CardDescription>
            <CardTitle className="text-2xl">{avaliacoesPorTurma.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cursos cadastrados</CardDescription>
            <CardTitle className="text-2xl">{consolidadoPlanejamento.cursos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Turmas planejadas</CardDescription>
            <CardTitle className="text-2xl">{consolidadoPlanejamento.turmas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ementas ativas</CardDescription>
            <CardTitle className="text-2xl">{consolidadoPlanejamento.ementas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Disciplinas no banco</CardDescription>
            <CardTitle className="text-2xl">{consolidadoPlanejamento.disciplinas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4" />
              Avaliações por período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando dados...</div>
            ) : avaliacoesPorMes.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Sem avaliações no período filtrado.</div>
            ) : (
              <ChartContainer className="h-[280px] w-full" config={{ total: { label: "Avaliações", color: "#0f766e" } }}>
                <BarChart data={avaliacoesPorMes}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <School2 className="h-4 w-4" />
              Distribuição por unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando dados...</div>
            ) : avaliacoesPorUnidade.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Sem unidades com avaliações no período.</div>
            ) : (
              <ChartContainer className="h-[280px] w-full" config={{ value: { label: "Avaliações", color: "#2563eb" } }}>
                <PieChart>
                  <Pie data={avaliacoesPorUnidade} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88}>
                    {avaliacoesPorUnidade.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" />
              Turmas com maior volume
            </CardTitle>
            <CardDescription>Top turmas considerando avaliações pedagógicas registradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando dados...</div>
            ) : avaliacoesPorTurma.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Sem turmas com registros no período.</div>
            ) : (
              avaliacoesPorTurma.map((item, index) => (
                <div key={`${item.turma}-${index}`} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{index + 1}. {item.turma}</p>
                      <p className="text-sm text-muted-foreground">Avaliações registradas no período filtrado</p>
                    </div>
                    <p className="text-2xl font-semibold">{item.total}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="h-4 w-4" />
              Conselho de classe e vínculos
            </CardTitle>
            <CardDescription>Status operacionais do pedagógico no período selecionado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-medium">Conselho de classe</p>
              <div className="space-y-2">
                {conselhosPorStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem conselhos no período.</p>
                ) : (
                  conselhosPorStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-sm">{statusLabels[item.status] || item.status}</span>
                      <span className="font-semibold">{item.total}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">Vínculos de vaga</p>
              <div className="space-y-2">
                {vinculosPorStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem vínculos no período.</p>
                ) : (
                  vinculosPorStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-sm">{statusLabels[item.status] || item.status}</span>
                      <span className="font-semibold">{item.total}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <School2 className="h-4 w-4" />
              Ocupação por sala
            </CardTitle>
            <CardDescription>Capacidade planejada versus uso observado na base pedagógica.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ocupacaoPorSala.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Sem turmas para o filtro selecionado.</div>
            ) : (
              ocupacaoPorSala.map((item) => (
                <div key={item.sala} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.sala}</p>
                      <p className="text-sm text-muted-foreground">{item.curso}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{item.ocupacaoAtual} ocupação(ões)</p>
                      <p className="text-muted-foreground">
                        Capacidade {item.capacidade || 0}
                        {item.taxa !== null ? ` · ${item.taxa}%` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="h-4 w-4" />
              Ocupação por analista
            </CardTitle>
            <CardDescription>Distribuição de turmas e capacidade total por responsável.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ocupacaoPorAnalista.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Sem analistas vinculados para o filtro atual.</div>
            ) : (
              ocupacaoPorAnalista.map((item, index) => (
                <div key={`${item.nome}-${index}`} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.nome}</p>
                      <p className="text-sm text-muted-foreground">{item.turmas} turma(s) vinculada(s)</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{item.capacidadeTotal} vagas</p>
                      <p className="text-muted-foreground">Capacidade total</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" />
            Consolidado do planejamento pedagógico
          </CardTitle>
          <CardDescription>Visão executiva do ecossistema de cursos, ementas, disciplinas e validações.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Cursos com controle GOV</p>
            <p className="mt-2 text-2xl font-semibold">{consolidadoPlanejamento.cursosComGov}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Cursos vencendo em até 90 dias</p>
            <p className="mt-2 text-2xl font-semibold">{consolidadoPlanejamento.cursosVencendo}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Carga horária total no banco</p>
            <p className="mt-2 text-2xl font-semibold">{consolidadoPlanejamento.cargaHorariaBanco}h</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
