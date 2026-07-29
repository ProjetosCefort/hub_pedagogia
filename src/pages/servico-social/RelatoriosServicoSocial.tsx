import { useEffect, useMemo, useState } from "react";
import { Download, Heart, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VulnerabilityRow {
  id: string;
  data_avaliacao: string;
  renda_familiar: number | null;
  quantidade_membros: number | null;
  cadunico_status: string | null;
  beneficios_sociais: string | null;
  pcd_status: string | null;
  jovem: {
    id: string;
    nome_completo: string;
    status: string;
    unidade?: { nome: string | null } | null;
  } | null;
}

interface EncaminhamentoRow {
  id: string;
  data_encaminhamento: string;
  destino_instituicao: string | null;
  destino_nome: string | null;
  tipo_rede: string | null;
}

interface ProjetoRow {
  id: string;
  nome: string;
  status: string;
  setor: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
}

interface AtendimentoRow {
  id: string;
  agendado_para: string;
  tipo: string;
  status: string;
  publico_externo?: boolean | null;
  publico_nome?: string | null;
  jovem?: { nome_completo: string | null } | null;
}

const cadunicoLabels: Record<string, string> = {
  atualizado: "Atualizado",
  desatualizado: "Desatualizado",
  nao_inscrito: "Não inscrito",
  pendente: "Pendente",
};

const pcdLabels: Record<string, string> = {
  pcd: "PCD",
  nao_pcd: "Não PCD",
  em_analise: "Em análise",
};

const tipoAtendimentoLabels: Record<string, string> = {
  avaliacao_socioeconomica: "Avaliação Socioeconômica",
  encaminhamento: "Encaminhamento",
  intervencao: "Intervenção",
  avaliacao_pedagogica: "Avaliação Pedagógica",
};

const statusProjetoLabels: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusAtendimentoLabels: Record<string, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCode(value: string | null, labels: Record<string, string>) {
  if (!value) return "-";
  return labels[value] || value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

function vulnerabilityScore(row: VulnerabilityRow) {
  let score = 0;
  if ((row.renda_familiar || 0) > 0 && (row.renda_familiar || 0) <= 1000) score += 2;
  if ((row.quantidade_membros || 0) >= 4) score += 1;
  if (row.cadunico_status === "desatualizado" || row.cadunico_status === "pendente") score += 1;
  if (row.cadunico_status === "nao_inscrito") score += 2;
  if (row.pcd_status === "pcd") score += 1;
  if (row.beneficios_sociais && row.beneficios_sociais.trim().length > 0) score += 1;
  return score;
}

function groupCount<T>(rows: T[], getKey: (row: T) => string) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row) || "Não informado";
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });
  return Array.from(grouped.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"));
}

function SimpleBarChart({ data }: { data: Array<{ label: string; total: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.total));

  if (data.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Nenhum dado no período.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="font-medium">{item.total}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.max(8, (item.total / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RelatoriosServicoSocial() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityRow[]>([]);
  const [encaminhamentos, setEncaminhamentos] = useState<EncaminhamentoRow[]>([]);
  const [projetos, setProjetos] = useState<ProjetoRow[]>([]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRow[]>([]);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const startIso = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null;
      const endIso = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null;

      let vulnerabilityQuery = supabase
        .from("avaliacoes_socioeconomicas")
        .select(
          `
            id,
            data_avaliacao,
            renda_familiar,
            quantidade_membros,
            cadunico_status,
            beneficios_sociais,
            pcd_status,
            jovem:jovens!inner(
              id,
              nome_completo,
              status,
              unidade:unidades(nome)
            )
          `,
        )
        .order("data_avaliacao", { ascending: false });

      let encaminhamentosQuery = supabase
        .from("encaminhamentos")
        .select("id, data_encaminhamento, destino_instituicao, destino_nome, tipo_rede")
        .order("data_encaminhamento", { ascending: false });

      let atendimentosQuery = supabase
        .from("atendimentos_agendados")
        .select("id, agendado_para, tipo, status, publico_externo, publico_nome, jovem:jovens(nome_completo)")
        .eq("setor", "servico_social")
        .order("agendado_para", { ascending: false });

      if (startIso) {
        vulnerabilityQuery = vulnerabilityQuery.gte("data_avaliacao", startIso);
        encaminhamentosQuery = encaminhamentosQuery.gte("data_encaminhamento", startIso);
        atendimentosQuery = atendimentosQuery.gte("agendado_para", startIso);
      }

      if (endIso) {
        vulnerabilityQuery = vulnerabilityQuery.lte("data_avaliacao", endIso);
        encaminhamentosQuery = encaminhamentosQuery.lte("data_encaminhamento", endIso);
        atendimentosQuery = atendimentosQuery.lte("agendado_para", endIso);
      }

      const [vulnerabilityRes, encaminhamentosRes, projetosRes, atendimentosRes] =
        await Promise.all([
          vulnerabilityQuery,
          encaminhamentosQuery,
          supabase
            .from("projetos" as any)
            .select("id, nome, status, setor, data_inicio, data_fim, created_at")
            .eq("setor", "servico_social")
            .order("created_at", { ascending: false }),
          atendimentosQuery,
        ]);

      if (vulnerabilityRes.error) throw vulnerabilityRes.error;
      if (encaminhamentosRes.error) throw encaminhamentosRes.error;
      if (projetosRes.error) throw projetosRes.error;
      if (atendimentosRes.error) throw atendimentosRes.error;

      const periodStart = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const periodEnd = endDate ? new Date(`${endDate}T23:59:59`) : null;
      const projetosNoPeriodo = ((projetosRes.data as ProjetoRow[]) || []).filter((projeto) => {
        const date = new Date(`${projeto.data_inicio || projeto.created_at}`);
        if (periodStart && date < periodStart) return false;
        if (periodEnd && date > periodEnd) return false;
        return true;
      });

      setVulnerabilities((vulnerabilityRes.data || []) as unknown as VulnerabilityRow[]);
      setEncaminhamentos((encaminhamentosRes.data || []) as EncaminhamentoRow[]);
      setProjetos(projetosNoPeriodo);
      setAtendimentos((atendimentosRes.data || []) as unknown as AtendimentoRow[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatórios",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const highVulnerability = useMemo(() => {
    const latestByJovem = new Map<string, VulnerabilityRow>();

    vulnerabilities.forEach((row) => {
      const jovemId = row.jovem?.id;
      if (!jovemId) return;
      if (!latestByJovem.has(jovemId)) {
        latestByJovem.set(jovemId, row);
      }
    });

    return Array.from(latestByJovem.values())
      .map((row) => ({ ...row, score: vulnerabilityScore(row) }))
      .filter((row) => row.score >= 3)
      .sort((a, b) => b.score - a.score);
  }, [vulnerabilities]);

  const encaminhamentosChart = useMemo(
    () => groupCount(encaminhamentos, (item) => item.tipo_rede || item.destino_instituicao || "Não informado"),
    [encaminhamentos],
  );
  const projetosChart = useMemo(
    () => groupCount(projetos, (item) => statusProjetoLabels[item.status] || item.status),
    [projetos],
  );
  const atendimentosChart = useMemo(
    () => groupCount(atendimentos, (item) => tipoAtendimentoLabels[item.tipo] || item.tipo),
    [atendimentos],
  );

  function exportHighVulnerability() {
    const rows = highVulnerability.map((row) => ({
      jovem: row.jovem?.nome_completo || "-",
      unidade: row.jovem?.unidade?.nome || "-",
      score: row.score,
      renda: formatCurrency(row.renda_familiar),
      membros: row.quantidade_membros || 0,
      cadunico: formatCode(row.cadunico_status, cadunicoLabels),
      pcd: formatCode(row.pcd_status, pcdLabels),
      data: formatDate(row.data_avaliacao),
    }));

    downloadExcel("relatorio-alta-vulnerabilidade.xls", rows, [
      { header: "Jovem", accessor: (row) => row.jovem },
      { header: "Unidade", accessor: (row) => row.unidade },
      { header: "Score", accessor: (row) => row.score },
      { header: "Renda familiar", accessor: (row) => row.renda },
      { header: "Membros", accessor: (row) => row.membros },
      { header: "CadÚnico", accessor: (row) => row.cadunico },
      { header: "PCD", accessor: (row) => row.pcd },
      { header: "Data avaliação", accessor: (row) => row.data },
    ]);
  }

  function exportEncaminhamentos() {
    downloadExcel(
      "encaminhamentos-por-periodo.xls",
      encaminhamentos.map((item) => ({
        data: formatDate(item.data_encaminhamento),
        tipo: item.tipo_rede || "-",
        destino: item.destino_instituicao || "-",
        setor: item.destino_nome || "-",
      })),
      [
        { header: "Data", accessor: (row) => row.data },
        { header: "Tipo de rede", accessor: (row) => row.tipo },
        { header: "Destino", accessor: (row) => row.destino },
        { header: "Setor/serviço", accessor: (row) => row.setor },
      ],
    );
  }

  function exportProjetos() {
    downloadExcel(
      "projetos-por-periodo.xls",
      projetos.map((item) => ({
        nome: item.nome,
        status: statusProjetoLabels[item.status] || item.status,
        inicio: formatDate(item.data_inicio || item.created_at),
        fim: formatDate(item.data_fim),
      })),
      [
        { header: "Projeto", accessor: (row) => row.nome },
        { header: "Status", accessor: (row) => row.status },
        { header: "Data início", accessor: (row) => row.inicio },
        { header: "Data fim", accessor: (row) => row.fim },
      ],
    );
  }

  function exportAtendimentos() {
    downloadExcel(
      "atendimentos-por-periodo.xls",
      atendimentos.map((item) => ({
        data: formatDate(item.agendado_para),
        tipo: tipoAtendimentoLabels[item.tipo] || item.tipo,
        status: statusAtendimentoLabels[item.status] || item.status,
        publico: item.publico_externo ? item.publico_nome || "Público externo" : item.jovem?.nome_completo || "-",
      })),
      [
        { header: "Data", accessor: (row) => row.data },
        { header: "Tipo", accessor: (row) => row.tipo },
        { header: "Status", accessor: (row) => row.status },
        { header: "Público", accessor: (row) => row.publico },
      ],
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Relatórios do Serviço Social</h1>
          <p className="page-description">
            Indicadores por período com gráficos e exportação.
          </p>
        </div>
      </div>

      <Card className="filters-panel">
        <CardHeader>
          <CardTitle className="text-lg">Período</CardTitle>
          <CardDescription>Selecione o intervalo usado nos relatórios abaixo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <Label htmlFor="data-inicial">Data inicial</Label>
            <Input id="data-inicial" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="data-final">Data final</Label>
            <Input id="data-final" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button type="button" onClick={fetchReports} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Encaminhamentos" value={encaminhamentos.length} />
        <SummaryCard title="Projetos" value={projetos.length} />
        <SummaryCard title="Atendimentos" value={atendimentos.length} />
        <SummaryCard title="Alta vulnerabilidade" value={highVulnerability.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportChartCard
          title="Encaminhamentos por período"
          description="Agrupado por tipo de rede ou destino."
          data={encaminhamentosChart}
          onExport={exportEncaminhamentos}
        />
        <ReportChartCard
          title="Projetos por período"
          description="Agrupado por status do projeto."
          data={projetosChart}
          onExport={exportProjetos}
        />
        <ReportChartCard
          title="Atendimentos por período"
          description="Agrupado por tipo de atendimento."
          data={atendimentosChart}
          onExport={exportAtendimentos}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4" />
              Jovens de alta vulnerabilidade
            </CardTitle>
            <CardDescription>
              Classificação operacional baseada na última avaliação socioeconômica no período.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={exportHighVulnerability}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-muted-foreground">
            Critério operacional usado: score a partir de renda familiar, composição, CadÚnico, PCD e benefícios sociais.
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jovem</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Renda</TableHead>
                <TableHead>CadÚnico</TableHead>
                <TableHead>PCD</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : highVulnerability.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum jovem classificado com alta vulnerabilidade pelos critérios atuais.
                  </TableCell>
                </TableRow>
              ) : (
                highVulnerability.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.jovem?.nome_completo || "-"}</TableCell>
                    <TableCell>{row.jovem?.unidade?.nome || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={row.score >= 5 ? "destructive" : "secondary"}>{row.score}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(row.renda_familiar)}</TableCell>
                    <TableCell>{formatCode(row.cadunico_status, cadunicoLabels)}</TableCell>
                    <TableCell>{formatCode(row.pcd_status, pcdLabels)}</TableCell>
                    <TableCell>{formatDate(row.data_avaliacao)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ReportChartCard({
  title,
  description,
  data,
  onExport,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; total: number }>;
  onExport: () => void;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </CardHeader>
      <CardContent>
        <SimpleBarChart data={data} />
      </CardContent>
    </Card>
  );
}
