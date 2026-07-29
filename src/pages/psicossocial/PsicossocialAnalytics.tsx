import { useEffect, useMemo, useState } from "react";
import { Download, HeartPulse, LineChart, Trophy } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart as ReLineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface InterventionRow {
  id: string;
  data_atendimento: string;
  tipo: string;
  motivo_intervencao: string | null;
  responsavel_id: string | null;
}

interface AgendaRow {
  id: string;
  agendado_para: string;
  status: "agendado" | "realizado" | "cancelado";
  tipo: string;
  responsavel_id: string | null;
}

interface ReportRow {
  referencia: string;
  total_intervencoes: number;
  total_agendamentos: number;
  total_realizados: number;
  total_cancelados: number;
}

const COLORS = ["#0f766e", "#f59e0b", "#ef4444", "#2563eb", "#7c3aed", "#14b8a6"];

function monthKey(dateString: string) {
  return format(new Date(dateString), "MM/yyyy", { locale: ptBR });
}

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    intervencao: "Intervenção",
    individual: "Individual",
    coletiva: "Coletiva",
    acompanhamento_requerido: "Acompanhamento requerido",
  };

  return labels[value] || value;
}

function statusLabel(value: AgendaRow["status"]) {
  const labels: Record<AgendaRow["status"], string> = {
    agendado: "Agendado",
    realizado: "Realizado",
    cancelado: "Cancelado",
  };

  return labels[value];
}

export default function PsicossocialAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<"30" | "90" | "180">("90");
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAnalytics();
  }, [periodFilter]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const fromDate = subDays(new Date(), Number(periodFilter)).toISOString();

      const [{ data: interventionsData, error: interventionsError }, { data: agendaData, error: agendaError }] =
        await Promise.all([
          supabase
            .from("intervencoes")
            .select("id, data_atendimento, tipo, motivo_intervencao, responsavel_id")
            .eq("setor", "psicossocial")
            .gte("data_atendimento", fromDate)
            .order("data_atendimento", { ascending: false }),
          supabase
            .from("atendimentos_agendados")
            .select("id, agendado_para, status, tipo, responsavel_id")
            .eq("setor", "psicossocial")
            .gte("agendado_para", fromDate)
            .order("agendado_para", { ascending: false }),
        ]);

      if (interventionsError) throw interventionsError;
      if (agendaError) throw agendaError;

      const mergedUserIds = Array.from(
        new Set(
          [...(interventionsData || []), ...(agendaData || [])]
            .map((item: any) => item.responsavel_id)
            .filter(Boolean),
        ),
      ) as string[];

      let nextProfilesMap: Record<string, string> = {};
      if (mergedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", mergedUserIds);

        nextProfilesMap = Object.fromEntries(
          (profiles || []).map((profile) => [profile.id, profile.nome_completo || "Responsavel"]),
        );
      }

      setProfilesMap(nextProfilesMap);
      setInterventions((interventionsData || []) as InterventionRow[]);
      setAgendaItems((agendaData || []) as AgendaRow[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar analitico",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const interventionsByMonth = useMemo(() => {
    const grouped = new Map<string, number>();
    interventions.forEach((item) => {
      const key = monthKey(item.data_atendimento);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([mes, total]) => ({ mes, total }));
  }, [interventions]);

  const interventionsByType = useMemo(() => {
    const grouped = new Map<string, number>();
    interventions.forEach((item) => {
      const key = typeLabel(item.tipo || "intervencao");
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);
  }, [interventions]);

  const interventionsByReason = useMemo(() => {
    const grouped = new Map<string, number>();
    interventions.forEach((item) => {
      const key = item.motivo_intervencao || "Sem motivo informado";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([motivo, total]) => ({ motivo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [interventions]);

  const analystRanking = useMemo(() => {
    const grouped = new Map<string, { nome: string; intervencoes: number; agendados: number; realizados: number }>();

    interventions.forEach((item) => {
      const id = item.responsavel_id || "sem-responsavel";
      const nome = profilesMap[item.responsavel_id || ""] || "Sem responsavel";
      const current = grouped.get(id) || { nome, intervencoes: 0, agendados: 0, realizados: 0 };
      current.intervencoes += 1;
      grouped.set(id, current);
    });

    agendaItems.forEach((item) => {
      const id = item.responsavel_id || "sem-responsavel";
      const nome = profilesMap[item.responsavel_id || ""] || "Sem responsavel";
      const current = grouped.get(id) || { nome, intervencoes: 0, agendados: 0, realizados: 0 };
      if (item.status === "agendado") current.agendados += 1;
      if (item.status === "realizado") current.realizados += 1;
      grouped.set(id, current);
    });

    return Array.from(grouped.values()).sort((a, b) => b.intervencoes - a.intervencoes);
  }, [agendaItems, interventions, profilesMap]);

  const agendaStatus = useMemo(() => {
    const grouped = new Map<string, number>();
    agendaItems.forEach((item) => {
      const key = statusLabel(item.status);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([status, total]) => ({ status, total }));
  }, [agendaItems]);

  const reportByPeriod = useMemo<ReportRow[]>(() => {
    const grouped = new Map<string, ReportRow>();

    interventions.forEach((item) => {
      const key = monthKey(item.data_atendimento);
      const current = grouped.get(key) || {
        referencia: key,
        total_intervencoes: 0,
        total_agendamentos: 0,
        total_realizados: 0,
        total_cancelados: 0,
      };
      current.total_intervencoes += 1;
      grouped.set(key, current);
    });

    agendaItems.forEach((item) => {
      const key = monthKey(item.agendado_para);
      const current = grouped.get(key) || {
        referencia: key,
        total_intervencoes: 0,
        total_agendamentos: 0,
        total_realizados: 0,
        total_cancelados: 0,
      };
      current.total_agendamentos += 1;
      if (item.status === "realizado") current.total_realizados += 1;
      if (item.status === "cancelado") current.total_cancelados += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const [monthA, yearA] = a.referencia.split("/");
      const [monthB, yearB] = b.referencia.split("/");
      return new Date(Number(yearA), Number(monthA) - 1).getTime() - new Date(Number(yearB), Number(monthB) - 1).getTime();
    });
  }, [agendaItems, interventions]);

  const reportByType = useMemo(() => {
    const grouped = new Map<string, { tipo: string; total: number }>();

    interventions.forEach((item) => {
      const key = typeLabel(item.tipo || "intervencao");
      const current = grouped.get(key) || { tipo: key, total: 0 };
      current.total += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [interventions]);

  const operationalIndicators = useMemo(() => {
    const realizados = agendaItems.filter((item) => item.status === "realizado").length;
    const cancelados = agendaItems.filter((item) => item.status === "cancelado").length;
    const agendados = agendaItems.filter((item) => item.status === "agendado").length;
    const completionRate = agendaItems.length > 0 ? Math.round((realizados / agendaItems.length) * 100) : 0;

    return [
      { indicador: "Taxa de realização da agenda", valor: `${completionRate}%` },
      { indicador: "Agendamentos em aberto", valor: String(agendados) },
      { indicador: "Agendamentos cancelados", valor: String(cancelados) },
      { indicador: "Motivos recorrentes monitorados", valor: String(interventionsByReason.length) },
      { indicador: "Intervenções por analista", valor: analystRanking.length > 0 ? (interventions.length / analystRanking.length).toFixed(1) : "0" },
    ];
  }, [agendaItems, analystRanking.length, interventions.length, interventionsByReason.length]);

  function handleExportExcel() {
    const rows = analystRanking.map((item) => ({
      responsavel: item.nome,
      intervencoes: item.intervencoes,
      agendados: item.agendados,
      realizados: item.realizados,
    }));

    downloadExcel("analitico-psicossocial.xls", rows, [
      { header: "Responsavel", accessor: (row) => row.responsavel },
      { header: "Intervencoes", accessor: (row) => row.intervencoes },
      { header: "Agendados", accessor: (row) => row.agendados },
      { header: "Realizados", accessor: (row) => row.realizados },
    ]);
  }

  function handleExportByPeriod() {
    downloadExcel("relatorio-psicossocial-por-periodo.xls", reportByPeriod, [
      { header: "Período", accessor: (row) => row.referencia },
      { header: "Intervenções", accessor: (row) => row.total_intervencoes },
      { header: "Agendamentos", accessor: (row) => row.total_agendamentos },
      { header: "Realizados", accessor: (row) => row.total_realizados },
      { header: "Cancelados", accessor: (row) => row.total_cancelados },
    ]);
  }

  function handleExportByType() {
    downloadExcel("relatorio-psicossocial-por-tipo.xls", reportByType, [
      { header: "Tipo", accessor: (row) => row.tipo },
      { header: "Quantidade", accessor: (row) => row.total },
    ]);
  }

  function handleExportIndicators() {
    downloadExcel("indicadores-gerenciais-psicossocial.xls", operationalIndicators, [
      { header: "Indicador", accessor: (row) => row.indicador },
      { header: "Valor", accessor: (row) => row.valor },
    ]);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Analitico psicossocial</h1>
          <p className="page-description">
            Graficos, rankings e indicadores gerenciais do acompanhamento psicossocial.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as typeof periodFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Ultimos 30 dias</SelectItem>
              <SelectItem value="90">Ultimos 90 dias</SelectItem>
              <SelectItem value="180">Ultimos 180 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de intervencoes</CardDescription>
            <CardTitle className="text-2xl">{interventions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Agendamentos no periodo</CardDescription>
            <CardTitle className="text-2xl">{agendaItems.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Motivos monitorados</CardDescription>
            <CardTitle className="text-2xl">{interventionsByReason.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Analistas no ranking</CardDescription>
            <CardTitle className="text-2xl">{analystRanking.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4" />
              Intervencoes por periodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando dados...</div>
            ) : (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ total: { label: "Intervencoes", color: "#0f766e" } }}
              >
                <ReLineChart data={interventionsByMonth}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={3} dot={{ fill: "var(--color-total)" }} />
                </ReLineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4" />
              Motivos mais recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando dados...</div>
            ) : (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ total: { label: "Ocorrencias", color: "#2563eb" } }}
              >
                <BarChart data={interventionsByReason} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="motivo" width={120} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              Ranking de analistas
            </CardTitle>
            <CardDescription>Volume de intervencoes e andamento da agenda no periodo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando dados...</div>
            ) : analystRanking.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Sem registros para o periodo.</div>
            ) : (
              analystRanking.map((item, index) => (
                <div key={`${item.nome}-${index}`} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{index + 1}. {item.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.intervencoes} intervencoes, {item.agendados} agendados, {item.realizados} realizados
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Score operacional</p>
                      <p className="text-lg font-semibold text-foreground">
                        {item.intervencoes + item.realizados}
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
            <CardTitle className="text-base">Agenda por status e tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando dados...</div>
            ) : (
              <>
                <ChartContainer
                  className="h-[220px] w-full"
                  config={{
                    agendado: { label: "Agendado", color: "#f59e0b" },
                    realizado: { label: "Realizado", color: "#0f766e" },
                    cancelado: { label: "Cancelado", color: "#ef4444" },
                  }}
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                    <Pie data={agendaStatus} dataKey="total" nameKey="status" outerRadius={80}>
                      {agendaStatus.map((entry, index) => (
                        <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                  </PieChart>
                </ChartContainer>

                <div className="space-y-2">
                  {interventionsByType.map((item) => (
                    <div key={item.tipo} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span>{item.tipo}</span>
                      <span className="font-semibold">{item.total}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="card-elevated">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Relatório de intervenções por período</CardTitle>
              <CardDescription>Consolidado mensal de intervenções e andamento da agenda.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportByPeriod} disabled={reportByPeriod.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportByPeriod.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">Sem dados para o período selecionado.</div>
            ) : (
              reportByPeriod.map((item) => (
                <div key={item.referencia} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Período</p>
                    <p className="font-medium">{item.referencia}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Intervenções</p>
                    <p className="font-medium">{item.total_intervencoes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Agendamentos</p>
                    <p className="font-medium">{item.total_agendamentos}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Realizados</p>
                    <p className="font-medium">{item.total_realizados}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cancelados</p>
                    <p className="font-medium">{item.total_cancelados}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Relatório de intervenções por tipo</CardTitle>
              <CardDescription>Distribuição operacional dos tipos registrados no módulo.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportByType} disabled={reportByType.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportByType.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">Sem intervenções registradas no período.</div>
            ) : (
              reportByType.map((item) => (
                <div key={item.tipo} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">{item.tipo}</p>
                    <p className="text-sm text-muted-foreground">Total consolidado no período filtrado</p>
                  </div>
                  <p className="text-lg font-semibold">{item.total}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Indicadores gerenciais do setor</CardTitle>
            <CardDescription>Métricas rápidas para acompanhamento da operação psicossocial.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportIndicators} disabled={operationalIndicators.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {operationalIndicators.map((item) => (
            <div key={item.indicador} className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{item.indicador}</p>
              <p className="mt-2 text-2xl font-semibold">{item.valor}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
