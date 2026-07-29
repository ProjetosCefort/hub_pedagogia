import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Plus, Search, Eye, Filter, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/csv";
import { usePermissions } from "@/hooks/usePermissions";

interface Intervencao {
  id: string;
  data_atendimento: string;
  descricao_demanda: string;
  jovem: { nome_completo: string } | null;
}

type SectorKey = "psicossocial" | "servico_social";

interface IntervencoesListProps {
  sector?: SectorKey;
  title?: string;
  description?: string;
  basePath?: string;
  createLabel?: string;
}

export default function IntervencoesList({
  sector = "psicossocial",
  title = "Intervenções",
  description = "Registros de atendimentos e intervenções",
  basePath = "/intervencoes",
  createLabel = "Nova Intervenção",
}: IntervencoesListProps) {
  const ITEMS_PER_PAGE = 10;
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "30d" | "90d">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [searchParams] = useSearchParams();
  const preselectedJovem = searchParams.get("jovem_id") || "";
  const canCreate =
    sector === "servico_social"
      ? hasPermission("atendimentos_servico_social.write")
      : hasPermission("intervencoes_psicossocial.write");

  useEffect(() => {
    fetchIntervencoes();
  }, [sector, preselectedJovem]);

  async function fetchIntervencoes() {
    try {
      setAccessDenied(false);
      let query = supabase
        .from("intervencoes" as any)
        .select(`
          id,
          data_atendimento,
          descricao_demanda,
          setor,
          jovem_id,
          jovem:jovens(nome_completo)
        `)
        .eq("setor", sector)
        .order("data_atendimento", { ascending: false });

      if (preselectedJovem) {
        query = query.eq("jovem_id", preselectedJovem);
      }

      const { data, error } = await query;

      if (error) throw error;
      setIntervencoes(data || []);
    } catch (error: any) {
      console.error("Error fetching intervencoes:", error);
      if (error?.code === "42501") {
        setAccessDenied(true);
        setIntervencoes([]);
        toast({
          title: "Sem permissão",
          description:
            sector === "servico_social"
              ? "Você não tem permissão para visualizar atendimentos."
              : "Você não tem permissão para visualizar intervenções.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = intervencoes.filter((i) => {
    const matchesSearch =
      i.jovem?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.descricao_demanda.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (periodFilter === "all") return true;

    const refDate = new Date();
    const days = periodFilter === "30d" ? 30 : 90;
    refDate.setDate(refDate.getDate() - days);
    return new Date(i.data_atendimento) >= refDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, periodFilter]);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const likeTerm = searchTerm.trim();
      const likeValue = `%${likeTerm}%`;

      let query = supabase
        .from("intervencoes" as any)
        .select(
          `
            id,
            data_atendimento,
            descricao_demanda,
            setor,
            jovem_id,
            jovem:jovens(nome_completo)
          `,
        )
        .eq("setor", sector)
        .order("data_atendimento", { ascending: false })
        .limit(1000);

      if (preselectedJovem) {
        query = query.eq("jovem_id", preselectedJovem);
      }

      if (likeTerm) {
        query = query.or(
          `descricao_demanda.ilike.${likeValue},jovens.nome_completo.ilike.${likeValue}`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((item) => ({
        data: format(new Date(item.data_atendimento), "dd/MM/yyyy HH:mm", {
          locale: ptBR,
        }),
        jovem: item.jovem?.nome_completo || "—",
        demanda: item.descricao_demanda,
      }));

      if (rows.length === 0) {
        toast({
          title: "Sem registros",
          description:
            sector === "servico_social"
              ? "Nenhum atendimento encontrado para exportação."
              : "Nenhuma intervenção encontrada para exportação.",
        });
        return;
      }

      downloadCsv(
        sector === "servico_social" ? "atendimentos-servico-social.csv" : "intervencoes.csv",
        rows,
        [
        { header: "Data", accessor: (row) => row.data },
        { header: "Jovem", accessor: (row) => row.jovem },
        { header: "Descrição", accessor: (row) => row.demanda },
        ],
      );
    } catch (error: any) {
      console.error(error);
      toast({
        title: error?.code === "42501" ? "Sem permissão" : "Erro ao exportar",
        description:
          error?.code === "42501"
            ? sector === "servico_social"
              ? "Você não tem permissão para exportar atendimentos."
              : "Você não tem permissão para exportar intervenções."
            : error.message || "Não foi possível gerar o CSV.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={exporting || accessDenied}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          {canCreate && (
            <Button asChild disabled={accessDenied}>
              <Link to={`${basePath}/nova${preselectedJovem ? `?jovem_id=${preselectedJovem}` : ""}`}>
                <Plus className="w-4 h-4 mr-2" />
                {createLabel}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="filters-grid-compact">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Busca
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por jovem ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Período
          </span>
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as "all" | "30d" | "90d")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Jovem</TableHead>
              <TableHead>Demanda</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="animate-pulse-soft text-muted-foreground">Carregando...</div>
                </TableCell>
              </TableRow>
            ) : accessDenied ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <p className="text-destructive font-medium">
                    {sector === "servico_social"
                      ? "Sem permissão para visualizar atendimentos."
                      : "Sem permissão para visualizar intervenções."}
                  </p>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <p className="text-muted-foreground">
                    {sector === "servico_social"
                      ? "Nenhum atendimento encontrado"
                      : "Nenhuma intervenção encontrada"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(item.data_atendimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.jovem?.nome_completo || "—"}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {item.descricao_demanda}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`${basePath}/${item.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`${basePath}/${item.id}/imprimir`}>
                          <Printer className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
          {Math.min(filtered.length, currentPage * ITEMS_PER_PAGE)} de {filtered.length}
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                {currentPage} / {totalPages}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
