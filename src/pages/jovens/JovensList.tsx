import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PendenciasBadge } from "@/components/jovens/PendenciasBadge";
import { StatusIndicator } from "@/components/jovens/StatusIndicator";
import { usePendencias } from "@/hooks/usePendencias";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCpf } from "@/lib/formatters";

interface Jovem {
  id: string;
  nome_completo: string;
  cpf: string | null;
  matricula: string | null;
  status: string;
  data_admissao: string | null;
  empresa: { nome_fantasia: string | null } | null;
  /** PostgREST às vezes retorna a relação com o nome da tabela */
  empresas?: { nome_fantasia: string | null } | null;
  turma: { nome: string } | null;
  unidade: { nome: string } | null;
}

interface Unidade {
  id: string;
  nome: string;
}

interface Empresa {
  id: string;
  nome_fantasia: string | null;
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

const ITEMS_PER_PAGE = 20;

export default function JovensList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filtros do estado
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || "all"
  );
  const [unidadeFilter, setUnidadeFilter] = useState<string>(
    searchParams.get("unidade") || "all"
  );
  const [empresaFilter, setEmpresaFilter] = useState<string>(
    searchParams.get("empresa") || "all"
  );
  const [hasPendenciasFilter, setHasPendenciasFilter] = useState<string>(
    searchParams.get("hasPendencias") || "all"
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  // Dados
  const [jovens, setJovens] = useState<Jovem[]>([]);
  const [pendenciasMap, setPendenciasMap] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { fetchPendenciasBatch } = usePendencias();

  // Sincronizar filtros com URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (unidadeFilter !== "all") params.set("unidade", unidadeFilter);
    if (empresaFilter !== "all") params.set("empresa", empresaFilter);
    if (hasPendenciasFilter !== "all")
      params.set("hasPendencias", hasPendenciasFilter);
    if (currentPage > 1) params.set("page", currentPage.toString());

    setSearchParams(params, { replace: true });
  }, [
    searchTerm,
    statusFilter,
    unidadeFilter,
    empresaFilter,
    hasPendenciasFilter,
    currentPage,
    setSearchParams,
  ]);

  // Buscar unidades e empresas para os selects
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [unidadesRes, empresasRes] = await Promise.all([
          supabase
            .from("unidades")
            .select("id, nome")
            .order("nome"),
          supabase
            .from("empresas")
            .select("id, nome_fantasia")
            .order("nome_fantasia"),
        ]);

        if (unidadesRes.data) setUnidades(unidadesRes.data);
        if (empresasRes.data)
          setEmpresas(
            empresasRes.data.filter((e) => e.nome_fantasia !== null)
          );
      } catch (error) {
        console.error("Error fetching options:", error);
      }
    }

    fetchOptions();
  }, []);

  // Buscar jovens com filtros aplicados no backend
  const fetchJovens = useCallback(async () => {
    setLoading(true);
    try {
      // Construir query base
      let query = supabase
        .from("jovens")
        .select(
          `
          id,
          nome_completo,
          cpf,
          matricula,
          status,
          data_admissao,
          empresa:empresas!jovens_empresa_id_fkey(nome_fantasia),
          turma:turmas(nome),
          unidade:unidades(nome)
        `,
          { count: "exact" }
        );

      // Aplicar filtros no backend
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (unidadeFilter !== "all") {
        query = query.eq("unidade_id", unidadeFilter);
      }

      if (empresaFilter !== "all") {
        query = query.eq("empresa_id", empresaFilter);
      }

      // Busca por nome ou CPF
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        // Remover formatação do CPF para busca
        const cpfClean = searchTerm.replace(/\D/g, "");
        
        // Se parece com CPF (11 dígitos), buscar por CPF
        if (cpfClean.length === 11) {
          query = query.or(`cpf.eq.${cpfClean},nome_completo.ilike.%${searchLower}%`);
        } else {
          // Caso contrário, buscar apenas por nome
          query = query.ilike("nome_completo", `%${searchLower}%`);
        }
      }

      // Ordenação
      query = query.order("nome_completo", { ascending: true });

      // Se há filtro de pendências, buscar todos os resultados (sem paginação)
      // pois precisamos filtrar por pendências no frontend primeiro
      const needsPendenciasFilter = hasPendenciasFilter !== "all";
      
      if (!needsPendenciasFilter) {
        // Paginação apenas quando não há filtro de pendências
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const list = (data || []) as unknown as Jovem[];
      setJovens(list);
      setTotalCount(count || 0);

      // Buscar pendências para os jovens retornados
      if (list.length > 0) {
        const ids = list.map((j) => j.id);
        const map = await fetchPendenciasBatch(ids);
        setPendenciasMap(map);
      } else {
        setPendenciasMap({});
      }
    } catch (error) {
      console.error("Error fetching jovens:", error);
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    unidadeFilter,
    empresaFilter,
    searchTerm,
    currentPage,
    hasPendenciasFilter,
    fetchPendenciasBatch,
  ]);

  // Buscar quando filtros mudarem
  useEffect(() => {
    fetchJovens();
  }, [fetchJovens]);

  // Resetar página quando filtros mudarem (exceto página)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, unidadeFilter, empresaFilter, searchTerm, hasPendenciasFilter]);

  // Filtrar por pendências no frontend (após buscar dados)
  const filteredJovens = jovens.filter((jovem) => {
    if (hasPendenciasFilter === "all") return true;
    
    const pendencias = pendenciasMap[jovem.id] || [];
    const hasPendencias = pendencias.length > 0;
    
    if (hasPendenciasFilter === "yes") {
      return hasPendencias;
    } else {
      return !hasPendencias;
    }
  });

  // Paginar resultados filtrados quando há filtro de pendências
  const needsPendenciasFilter = hasPendenciasFilter !== "all";
  const paginatedJovens = needsPendenciasFilter
    ? filteredJovens.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
    : filteredJovens;

  // Calcular total de páginas baseado nos resultados filtrados
  const effectiveTotal = needsPendenciasFilter 
    ? filteredJovens.length 
    : totalCount;
  const totalPages = Math.ceil(effectiveTotal / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setUnidadeFilter("all");
    setEmpresaFilter("all");
    setHasPendenciasFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "all" ||
    unidadeFilter !== "all" ||
    empresaFilter !== "all" ||
    hasPendenciasFilter !== "all";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Jovens Aprendizes</h1>
          <p className="page-description">
            Gerencie os jovens aprendizes cadastrados no programa
          </p>
        </div>
        <Button asChild>
          <Link to="/jovens/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Jovem Aprendiz
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Filtros Avançados</DialogTitle>
                <DialogDescription>
                  Filtre os jovens aprendizes por diferentes critérios
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="completed">Completo</SelectItem>
                      <SelectItem value="under_analysis">Em análise</SelectItem>
                      <SelectItem value="pending_documents">Documentos pendentes</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                      <SelectItem value="active_apprentice">Aprendiz ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="terminated">Desligado</SelectItem>
                      <SelectItem value="completed_program">Programa concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Unidade</label>
                  <Select
                    value={unidadeFilter}
                    onValueChange={setUnidadeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as unidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Empresa</label>
                  <Select
                    value={empresaFilter}
                    onValueChange={setEmpresaFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as empresas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome_fantasia || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pendências</label>
                  <Select
                    value={hasPendenciasFilter}
                    onValueChange={setHasPendenciasFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Com pendências</SelectItem>
                      <SelectItem value="no">Sem pendências</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filtros:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Busca: {searchTerm}
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusLabels[statusFilter]}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {unidadeFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Unidade: {unidades.find((u) => u.id === unidadeFilter)?.nome}
                <button
                  onClick={() => setUnidadeFilter("all")}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {empresaFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Empresa:{" "}
                {empresas.find((e) => e.id === empresaFilter)?.nome_fantasia}
                <button
                  onClick={() => setEmpresaFilter("all")}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {hasPendenciasFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Pendências:{" "}
                {hasPendenciasFilter === "yes" ? "Com" : "Sem"}
                <button
                  onClick={() => setHasPendenciasFilter("all")}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pendências</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <div className="animate-pulse-soft text-muted-foreground">
                    Carregando...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedJovens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhum jovem aprendiz encontrado
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedJovens.map((jovem) => (
                <TableRow key={jovem.id}>
                  <TableCell>
                    <Link
                      to={`/jovens/${jovem.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {jovem.nome_completo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jovem.cpf ? formatCpf(jovem.cpf) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jovem.matricula || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(jovem.empresa ?? jovem.empresas)?.nome_fantasia || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jovem.unidade?.nome || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jovem.turma?.nome || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusIndicator
                        status={jovem.status as any}
                        pendencias={pendenciasMap[jovem.id] ?? []}
                        compact
                      />
                      <Badge
                        variant="outline"
                        className={`badge-status-${jovem.status}`}
                      >
                        {statusLabels[jovem.status]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PendenciasBadge
                      pendencias={pendenciasMap[jovem.id] ?? []}
                      compact
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jovem.data_admissao
                      ? format(new Date(jovem.data_admissao), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/jovens/${jovem.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Prontuário
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/jovens/${jovem.id}/editar`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {paginatedJovens.length} de {effectiveTotal} jovens aprendizes
            {needsPendenciasFilter && " (filtrado)"}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Mostrar primeira, última, atual e adjacentes
                  return (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  );
                })
                .map((page, idx, arr) => {
                  // Adicionar ellipsis quando necessário
                  const showEllipsisBefore = idx > 0 && arr[idx - 1] < page - 1;
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsisBefore && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </div>
                  );
                })}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
