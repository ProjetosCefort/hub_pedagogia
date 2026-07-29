import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Filter, Heart, Pencil, Plus, Printer } from "lucide-react";
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
  CardDescription,
  CardHeader,
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
import { usePermissions } from "@/hooks/usePermissions";
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

interface AvaliacaoSocioeconomicaItem {
  id: string;
  data_avaliacao: string;
  pcd_status: string | null;
  cadunico_status: string | null;
  renda_familiar: number | null;
  quantidade_membros: number | null;
  beneficios_sociais: string | null;
  composicao_familiar: any;
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

const pcdLabels: Record<string, string> = {
  pcd: "PCD",
  nao_pcd: "Não PCD",
  em_analise: "Em análise",
};

const cadunicoLabels: Record<string, string> = {
  atualizado: "Atualizado",
  desatualizado: "Desatualizado",
  nao_inscrito: "Não inscrito",
  pendente: "Pendente",
};

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatCode = (value: string | null, map: Record<string, string>) => {
  if (!value) return "—";
  return map[value] || value;
};

/** Valor usado nos Selects para "Todos/Todas"; Radix não permite value="" em SelectItem */
const FILTER_ALL = "__all__";

const normalizeComposition = (value: any): Array<Record<string, string>> => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
};

export default function AvaliacaoSocioeconomicaList() {
  const [searchParams] = useSearchParams();
  const preselectedJovem = searchParams.get("jovem_id") || "";
  const [filters, setFilters] = useState<FilterState>({
    jovemId: preselectedJovem,
    unidadeId: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoSocioeconomicaItem[]>([]);
  const [jovensOptions, setJovensOptions] = useState<JovemOption[]>([]);
  const [unidadesOptions, setUnidadesOptions] = useState<UnidadeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canWriteSocioeconomica = hasPermission("avaliacoes_socioeconomicas.write");

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchAvaliacoes();
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

  const buildAvaliacoesQuery = (selectClause: string) => {
    let query = supabase
      .from("avaliacoes_socioeconomicas")
      .select(selectClause)
      .order("data_avaliacao", { ascending: false });

    if (filters.jovemId) {
      query = query.eq("jovem_id", filters.jovemId);
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
            pcd_status,
            cadunico_status,
            renda_familiar,
            quantidade_membros,
            beneficios_sociais,
            composicao_familiar,
            jovem:jovens!inner(
              id,
              nome_completo,
              status,
              unidade:unidades(id, nome)
            )
          `,
      );
      if (error) throw error;

      setAvaliacoes((data || []) as unknown as AvaliacaoSocioeconomicaItem[]);
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
          pcd_status,
          cadunico_status,
          renda_familiar,
          quantidade_membros,
          jovem:jovens!inner(nome_completo)
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
        jovem?: { nome_completo?: string } | null;
        pcd_status?: string | null;
        cadunico_status?: string | null;
        renda_familiar?: number | null;
        quantidade_membros?: number | null;
      }>).map((item) => ({
        data: formatDate(item.data_avaliacao),
        jovem: item.jovem?.nome_completo || "—",
        pcd: formatCode(item.pcd_status, pcdLabels),
        cadunico: formatCode(item.cadunico_status, cadunicoLabels),
        renda: formatCurrency(item.renda_familiar),
        membros: item.quantidade_membros ?? "—",
      }));

      downloadCsv("avaliacoes-socioeconomicas.csv", rows, [
        { header: "Data", accessor: (row) => row.data },
        { header: "Jovem", accessor: (row) => row.jovem },
        { header: "PCD", accessor: (row) => row.pcd },
        { header: "CadÚnico", accessor: (row) => row.cadunico },
        { header: "Renda Familiar", accessor: (row) => row.renda },
        { header: "Membros", accessor: (row) => row.membros },
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
            <Heart className="w-5 h-5 text-primary" />
            <h1 className="page-title">Avaliações Socioeconômicas</h1>
          </div>
          <p className="page-description">
            Visualize as avaliações socioeconômicas registradas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          {canWriteSocioeconomica && (
            <Button asChild>
              <Link to="/avaliacoes-socioeconomicas/nova">
                <Plus className="w-4 h-4 mr-2" /> Nova avaliação
              </Link>
            </Button>
          )}
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
                    <TableHead>Jovem</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>PDC / CadÚnico</TableHead>
                    <TableHead>Renda familiar</TableHead>
                    <TableHead className="w-[260px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : avaliacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
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
                              {avaliacao.jovem?.nome_completo || "—"}
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
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit">
                              {formatCode(avaliacao.pcd_status, pcdLabels)}
                            </Badge>
                            <Badge variant="outline" className="w-fit">
                              {formatCode(
                                avaliacao.cadunico_status,
                                cadunicoLabels,
                              )}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(avaliacao.renda_familiar)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              disabled={!avaliacao.jovem?.id}
                            >
                              <Link
                                to={
                                  avaliacao.jovem?.id
                                    ? `/jovens/${avaliacao.jovem.id}`
                                    : "#"
                                }
                              >
                                Ver prontuário
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="secondary"
                            >
                              <Link to={`/avaliacoes-socioeconomicas/${avaliacao.id}/imprimir`}>
                                <Printer className="w-4 h-4 mr-2" />
                                Imprimir
                              </Link>
                            </Button>
                            {canWriteSocioeconomica && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                              >
                                <Link to={`/avaliacoes-socioeconomicas/${avaliacao.id}/editar`}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </Link>
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  Detalhes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Avaliação de {avaliacao.jovem?.nome_completo}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Registrada em {formatDate(avaliacao.data_avaliacao)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                      <Label>PCD</Label>
                                      <p>{formatCode(avaliacao.pcd_status, pcdLabels)}</p>
                                    </div>
                                    <div>
                                      <Label>Cadastro Único</Label>
                                      <p>
                                        {formatCode(
                                          avaliacao.cadunico_status,
                                          cadunicoLabels,
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Renda familiar</Label>
                                      <p>{formatCurrency(avaliacao.renda_familiar)}</p>
                                    </div>
                                    <div>
                                      <Label>Quantidade de membros</Label>
                                      <p>{avaliacao.quantidade_membros ?? "—"}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Benefícios sociais</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {avaliacao.beneficios_sociais || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Composição familiar</Label>
                                    {normalizeComposition(avaliacao.composicao_familiar)
                                      .length === 0 ? (
                                      <p className="text-sm text-muted-foreground">
                                        Nenhum integrante informado
                                      </p>
                                    ) : (
                                      <div className="border rounded-lg overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Nome</TableHead>
                                              <TableHead>Parentesco</TableHead>
                                              <TableHead>Idade</TableHead>
                                              <TableHead>Escolaridade</TableHead>
                                              <TableHead>Ocupação</TableHead>
                                              <TableHead>Renda</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {normalizeComposition(
                                              avaliacao.composicao_familiar,
                                            ).map((membro, index) => (
                                              <TableRow key={`${avaliacao.id}-${index}`}>
                                                <TableCell>
                                                  {membro.nome || "—"}
                                                </TableCell>
                                                <TableCell>
                                                  {membro.parentesco || "—"}
                                                </TableCell>
                                                <TableCell>{membro.idade || "—"}</TableCell>
                                                <TableCell>
                                                  {membro.escolaridade || "—"}
                                                </TableCell>
                                                <TableCell>
                                                  {membro.ocupacao || "—"}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCurrency(
                                                    membro.renda
                                                      ? Number(membro.renda)
                                                      : null,
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
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
