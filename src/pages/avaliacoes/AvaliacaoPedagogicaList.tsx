import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Download, Filter, GraduationCap, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/csv";

interface JovemOption {
  id: string;
  nome_completo: string;
  status: string;
  unidade?: {
    id: string;
    nome: string | null;
  } | null;
}

interface UnidadeOption {
  id: string;
  nome: string;
}

interface TurmaOption {
  id: string;
  nome: string;
}

interface AvaliacaoPedagogicaItem {
  id: string;
  data_avaliacao: string;
  turma_id?: string | null;
  motivo_intervencao: string;
  dificuldades?: string[] | null;
  parecer_final: string | null;
  turma?: {
    id: string;
    nome: string | null;
  } | null;
  jovem: {
    id: string;
    nome_completo: string;
    status: string;
    unidade?: {
      id: string;
      nome: string | null;
    } | null;
    turma?: {
      id: string;
      nome: string | null;
    } | null;
  } | null;
  aproveitamento?: {
    nome: string | null;
  } | null;
}

interface FilterState {
  jovemId: string;
  turmaId: string;
  unidadeId: string;
  status: string;
  startDate: string;
  endDate: string;
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

/** Valor usado nos Selects para "Todos/Todas"; Radix não permite value="" em SelectItem */
const FILTER_ALL = "__all__";
export default function AvaliacaoPedagogicaList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedJovem = searchParams.get("jovem_id") || "";
  const [filters, setFilters] = useState<FilterState>({
    jovemId: preselectedJovem,
    turmaId: "",
    unidadeId: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPedagogicaItem[]>([]);
  const [jovensOptions, setJovensOptions] = useState<JovemOption[]>([]);
  const [turmasOptions, setTurmasOptions] = useState<TurmaOption[]>([]);
  const [unidadesOptions, setUnidadesOptions] = useState<UnidadeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchAvaliacoes();
  }, [filters]);

  async function fetchLookups() {
    const [{ data: jovens }, { data: turmas }, { data: unidades }] = await Promise.all([
      supabase
        .from("jovens")
        .select("id, nome_completo, status, unidade:unidades(id, nome)")
        .order("nome_completo"),
      supabase.from("turmas").select("id, nome").order("nome"),
      supabase.from("unidades").select("id, nome").order("nome"),
    ]);

    setJovensOptions((jovens || []) as unknown as JovemOption[]);
    setTurmasOptions(turmas || []);
    setUnidadesOptions(unidades || []);
  }

  const buildAvaliacoesQuery = (selectClause: string) => {
    let query = supabase
      .from("avaliacoes_pedagogicas")
      .select(selectClause)
      .order("data_avaliacao", { ascending: false });

    if (filters.jovemId) {
      query = query.eq("jovem_id", filters.jovemId);
    }
    if (filters.turmaId) {
      query = query.eq("jovens.turma_id", filters.turmaId);
    }
    if (filters.unidadeId) {
      query = query.eq("jovens.unidade_id", filters.unidadeId);
    }
    if (filters.status) {
      query = query.eq("jovens.status", filters.status);
    }
    if (filters.startDate) {
      query = query.gte("data_avaliacao", `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      query = query.lte("data_avaliacao", `${filters.endDate}T23:59:59`);
    }

    return query;
  };

  async function fetchAvaliacoes() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await buildAvaliacoesQuery(
        `
            id,
            data_avaliacao,
            turma_id,
            motivo_intervencao,
            dificuldades,
            parecer_final,
            turma:turmas(
              id,
              nome
            ),
            jovem:jovens(
              id,
              nome_completo,
              status,
              unidade:unidades(id, nome),
              turma:turmas(id, nome)
            )
          `,
      );
      if (error) throw error;

      const rows = (data || []) as unknown as Omit<AvaliacaoPedagogicaItem, "aproveitamento">[];
      setAvaliacoes(rows.map((r) => ({ ...r, aproveitamento: null })));
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      jovemId: preselectedJovem,
      turmaId: "",
      unidadeId: "",
      status: "",
      startDate: "",
      endDate: "",
    });
  };

  const formatDate = (value: string) =>
    format(new Date(value), "dd/MM/yyyy", { locale: ptBR });

  async function handleExportCsv() {
    setExporting(true);
    try {
      const { data, error } = await buildAvaliacoesQuery(
        `
          id,
          data_avaliacao,
          turma_id,
          motivo_intervencao,
          dificuldades,
          parecer_final,
          turma:turmas(id, nome),
          jovem:jovens(nome_completo, turma:turmas(id, nome))
        `,
      );
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Sem registros",
          description: "Não há avaliações para exportar com os filtros atuais.",
        });
        return;
      }

      const rows = (data as unknown as Array<{
        data_avaliacao: string;
        turma?: { id?: string; nome?: string } | null;
        jovem?: { nome_completo?: string; turma?: { id?: string; nome?: string } | null } | null;
        motivo_intervencao?: string | null;
        dificuldades?: string[] | null;
        parecer_final?: string | null;
      }>).map((item) => ({
        data: formatDate(item.data_avaliacao),
        jovem:
          item.jovem?.nome_completo ||
          (item.turma?.nome ? `Turma: ${item.turma.nome}` : null) ||
          (item.jovem?.turma?.nome ? `Turma: ${item.jovem.turma.nome}` : "—"),
        motivo: item.motivo_intervencao || "—",
        dificuldades:
          item.dificuldades && item.dificuldades.length > 0
            ? item.dificuldades.join(", ")
            : "—",
        aproveitamento: "—",
        parecer: item.parecer_final || "—",
      }));

      downloadCsv("avaliacoes-pedagogicas.csv", rows, [
        { header: "Data", accessor: (row) => row.data },
        { header: "Jovem", accessor: (row) => row.jovem },
        { header: "Motivo", accessor: (row) => row.motivo },
        { header: "Dificuldades", accessor: (row) => row.dificuldades },
        { header: "Aproveitamento", accessor: (row) => row.aproveitamento },
        { header: "Parecer", accessor: (row) => row.parecer },
      ]);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao exportar",
        description: error.message || "Não foi possível gerar o CSV.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h1 className="page-title">Avaliações Pedagógicas</h1>
          </div>
          <p className="page-description">
            Consulte e filtre as avaliações pedagógicas registradas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button asChild>
            <Link to="/avaliacoes-pedagogicas/nova">
              <Plus className="w-4 h-4 mr-2" /> Nova avaliação
            </Link>
          </Button>
        </div>
      </div>

      <Card className="filters-panel">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </CardTitle>
          <CardDescription>Refine os resultados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="filters-grid">
            <div>
              <Label htmlFor="filtro-jovem">Jovem</Label>
              <Select
                value={filters.jovemId || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("jovemId", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger id="filtro-jovem">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todos</SelectItem>
                  {jovensOptions.map((jovem) => (
                    <SelectItem key={jovem.id} value={jovem.id}>
                      {jovem.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filtro-turma">Turma</Label>
              <Select
                value={filters.turmaId || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("turmaId", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger id="filtro-turma">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todas</SelectItem>
                  {turmasOptions.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filtro-unidade">Unidade</Label>
              <Select
                value={filters.unidadeId || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("unidadeId", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger id="filtro-unidade">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todas</SelectItem>
                  {unidadesOptions.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filtro-status">Status do jovem</Label>
              <Select
                value={filters.status || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("status", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger id="filtro-status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todos</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Data inicial</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label>Data final</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="filters-actions">
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resultados</CardTitle>
          <CardDescription>
            {loading
              ? "Carregando avaliações..."
              : `${avaliacoes.length} registro(s) encontrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-destructive">{error}</div>
          ) : (
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Jovem / Turma</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Dificuldades</TableHead>
                    <TableHead>Parecer / Motivo</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : avaliacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Nenhuma avaliação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    avaliacoes.map((avaliacao) => (
                      <TableRow key={avaliacao.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(avaliacao.data_avaliacao)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">
                              {avaliacao.jovem?.nome_completo ||
                                (avaliacao.turma?.nome
                                  ? `Turma: ${avaliacao.turma.nome}`
                                  : null) ||
                                (avaliacao.jovem?.turma?.nome
                                  ? `Turma: ${avaliacao.jovem.turma.nome}`
                                  : "—")}
                            </span>
                            {avaliacao.jovem?.status && (
                              <Badge variant="outline" className="w-fit mt-1">
                                {statusLabels[avaliacao.jovem.status] ||
                                  avaliacao.jovem.status}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {avaliacao.jovem?.unidade?.nome || "—"}
                        </TableCell>
                        <TableCell>
                          {avaliacao.aproveitamento?.nome || "—"}
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          {avaliacao.dificuldades?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {avaliacao.dificuldades.slice(0, 3).map((dificuldade) => (
                                <Badge key={dificuldade} variant="outline">
                                  {dificuldade}
                                </Badge>
                              ))}
                              {avaliacao.dificuldades.length > 3 && (
                                <Badge variant="secondary">
                                  +{avaliacao.dificuldades.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {avaliacao.parecer_final ||
                              avaliacao.motivo_intervencao ||
                              "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              disabled={!avaliacao.jovem?.id && !avaliacao.turma_id}
                            >
                              <Link
                                to={
                                  avaliacao.jovem?.id
                                    ? `/jovens/${avaliacao.jovem.id}`
                                    : "/turmas"
                                }
                              >
                                {avaliacao.jovem?.id ? "Ver prontuário" : "Ver turma"}
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                navigate(
                                  `/avaliacoes-pedagogicas/${avaliacao.id}/imprimir`,
                                )
                              }
                            >
                              Visualizar avaliação
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
