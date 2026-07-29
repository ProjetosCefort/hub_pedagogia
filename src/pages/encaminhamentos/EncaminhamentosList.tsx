import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRightLeft, Download, Filter, Plus } from "lucide-react";
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
  CardDescription,
  CardTitle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface EncaminhamentoItem {
  id: string;
  data_encaminhamento: string;
  tipo_rede: "geral" | "cras" | "creas" | "assistencia_social_outra";
  referencia_rede: string | null;
  destino_instituicao: string | null;
  destino_nome: string | null;
  destino_cargo: string | null;
  destino_contato: string | null;
  descricao_encaminhamento: string | null;
  retorno_previsto: string | null;
  modelo_encaminhamento_id?: string | null;
  modelo?: {
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
  } | null;
}

interface FilterState {
  jovemId: string;
  unidadeId: string;
  status: string;
  tipoRede: string;
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

const formatDate = (value: string | null) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return value;
  }
};

const tipoRedeLabels: Record<string, string> = {
  geral: "Geral",
  cras: "CRAS",
  creas: "CREAS",
  assistencia_social_outra: "Outra rede socioassistencial",
};

/** Valor usado nos Selects para "Todos/Todas"; Radix não permite value="" em SelectItem */
const FILTER_ALL = "__all__";

export default function EncaminhamentosList() {
  const [searchParams] = useSearchParams();
  const preselectedJovem = searchParams.get("jovem_id") || "";
  const [filters, setFilters] = useState<FilterState>({
    jovemId: preselectedJovem,
    unidadeId: "",
    status: "",
    tipoRede: "",
    startDate: "",
    endDate: "",
  });
  const [encaminhamentos, setEncaminhamentos] = useState<EncaminhamentoItem[]>([]);
  const [jovensOptions, setJovensOptions] = useState<JovemOption[]>([]);
  const [unidadesOptions, setUnidadesOptions] = useState<UnidadeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const buildEncaminhamentosQuery = (selectClause: string) => {
    let query = supabase
      .from("encaminhamentos")
      .select(selectClause)
      .order("data_encaminhamento", { ascending: false });

    if (filters.jovemId) {
      query = query.eq("jovem_id", filters.jovemId);
    }
    if (filters.unidadeId) {
      query = query.eq("jovens.unidade_id", filters.unidadeId);
    }
    if (filters.status) {
      query = query.eq("jovens.status", filters.status);
    }
    if (filters.tipoRede) {
      query = query.eq("tipo_rede", filters.tipoRede);
    }
    if (filters.startDate) {
      query = query.gte("data_encaminhamento", `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      query = query.lte("data_encaminhamento", `${filters.endDate}T23:59:59`);
    }

    return query;
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchEncaminhamentos();
  }, [filters]);

  async function fetchLookups() {
    const [{ data: jovens }, { data: unidades }] = await Promise.all([
      supabase
        .from("jovens")
        .select("id, nome_completo, status, unidade:unidades(id, nome)")
        .order("nome_completo"),
      supabase.from("unidades").select("id, nome").order("nome"),
    ]);

    setJovensOptions((jovens || []) as unknown as JovemOption[]);
    setUnidadesOptions(unidades || []);
  }

  async function fetchEncaminhamentos() {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await buildEncaminhamentosQuery(
        `
            id,
            data_encaminhamento,
            tipo_rede,
            referencia_rede,
            destino_instituicao,
            destino_nome,
            destino_cargo,
            destino_contato,
            descricao_encaminhamento,
            retorno_previsto,
            jovem:jovens!inner(
              id,
              nome_completo,
              status,
              unidade:unidades(id, nome)
            )
          `,
      );
      if (error) throw error;

      const rows = (data || []) as unknown as EncaminhamentoItem[];
      setEncaminhamentos(
        rows.map((r) => ({ ...r, modelo: null })),
      );
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os encaminhamentos.");
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
      unidadeId: "",
      status: "",
      tipoRede: "",
      startDate: "",
      endDate: "",
    });
  };

  async function handleExportCsv() {
    setExporting(true);
    try {
      const { data, error } = await buildEncaminhamentosQuery(
        `
            id,
            data_encaminhamento,
            tipo_rede,
            destino_instituicao,
            destino_nome,
            retorno_previsto,
            jovem:jovens!inner(
              nome_completo
            )
          `,
      );

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Sem registros",
          description: "Nenhum encaminhamento disponível para exportação.",
        });
        return;
      }

      const rows = (data as unknown as Array<{ data_encaminhamento: string; tipo_rede?: string | null; jovem?: { nome_completo?: string } | null; destino_instituicao?: string | null; retorno_previsto?: string | null }>).map((item) => ({
        data: formatDate(item.data_encaminhamento),
        jovem: item.jovem?.nome_completo || "—",
        tipoRede: item.tipo_rede ? tipoRedeLabels[item.tipo_rede] || item.tipo_rede : "—",
        destino: item.destino_instituicao || "—",
        modelo: "—",
        retorno: formatDate(item.retorno_previsto),
      }));

      downloadCsv("encaminhamentos.csv", rows, [
        { header: "Data", accessor: (row) => row.data },
        { header: "Jovem", accessor: (row) => row.jovem },
        { header: "Tipo de rede", accessor: (row) => row.tipoRede },
        { header: "Destino", accessor: (row) => row.destino },
        { header: "Modelo", accessor: (row) => row.modelo },
        { header: "Retorno previsto", accessor: (row) => row.retorno },
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
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            <h1 className="page-title">Encaminhamentos Oficiais</h1>
          </div>
          <p className="page-description">
            Consulte os encaminhamentos realizados para redes externas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button asChild>
            <Link to="/encaminhamentos/novo">
              <Plus className="w-4 h-4 mr-2" /> Novo encaminhamento
            </Link>
          </Button>
        </div>
      </div>

      <Card className="filters-panel">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </CardTitle>
          <CardDescription>Filtre por jovem, unidade ou período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="filters-grid">
            <div>
              <Label>Jovem</Label>
              <Select
                value={filters.jovemId || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("jovemId", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger>
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
              <Label>Unidade</Label>
              <Select
                value={filters.unidadeId || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("unidadeId", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger>
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
              <Label>Status do jovem</Label>
              <Select
                value={filters.status || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("status", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger>
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
            <div>
              <Label>Tipo de rede</Label>
              <Select
                value={filters.tipoRede || FILTER_ALL}
                onValueChange={(v) =>
                  handleFilterChange("tipoRede", v === FILTER_ALL ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todos</SelectItem>
                  {Object.entries(tipoRedeLabels).map(([value, label]) => (
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
              ? "Carregando registros..."
              : `${encaminhamentos.length} registro(s) encontrado(s)`}
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
                    <TableHead>Jovem</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Rede</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Retorno previsto</TableHead>
                    <TableHead className="w-[220px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : encaminhamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Nenhum encaminhamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    encaminhamentos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(item.data_encaminhamento)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">
                              {item.jovem?.nome_completo || "—"}
                            </span>
                            {item.jovem?.status && (
                              <Badge variant="outline" className="w-fit mt-1">
                                {statusLabels[item.jovem.status] ||
                                  item.jovem.status}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.jovem?.unidade?.nome || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit">
                              {tipoRedeLabels[item.tipo_rede] || item.tipo_rede}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.referencia_rede || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{item.destino_instituicao || "—"}</span>
                            <span className="text-sm text-muted-foreground">
                              {item.destino_nome || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(item.retorno_previsto)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              disabled={!item.jovem?.id}
                            >
                              <Link
                                to={
                                  item.jovem?.id
                                    ? `/jovens/${item.jovem.id}`
                                    : "#"
                                }
                              >
                                Ver prontuário
                              </Link>
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary">
                                  Detalhes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>Encaminhamento</DialogTitle>
                                  <DialogDescription>
                                    Registrado em {formatDate(item.data_encaminhamento)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 text-sm">
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                      <Label>Tipo de rede</Label>
                                      <p>{tipoRedeLabels[item.tipo_rede] || item.tipo_rede}</p>
                                    </div>
                                    <div>
                                      <Label>Referência da rede</Label>
                                      <p>{item.referencia_rede || "—"}</p>
                                    </div>
                                    <div>
                                      <Label>Instituição</Label>
                                      <p>{item.destino_instituicao || "—"}</p>
                                    </div>
                                    <div>
                                      <Label>Destino / área</Label>
                                      <p>{item.destino_nome || "—"}</p>
                                    </div>
                                    <div>
                                      <Label>Contato</Label>
                                      <p>{item.destino_contato || "—"}</p>
                                    </div>
                                    <div>
                                      <Label>Retorno previsto</Label>
                                      <p>{formatDate(item.retorno_previsto)}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Descrição</Label>
                                    <p className="text-muted-foreground">
                                      {item.descricao_encaminhamento || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Modelo utilizado</Label>
                                    <p>{item.modelo?.nome || "—"}</p>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    <Button asChild variant="secondary" size="sm">
                                      <Link
                                        to={`/encaminhamentos/${item.id}/imprimir`}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Visualizar impressão
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
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
