import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, FolderKanban, Loader2, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Projeto = {
  id: string;
  nome: string;
  setor: string | null;
  status: "planejado" | "em_andamento" | "concluido" | "cancelado";
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
};

const statusLabel: Record<Projeto["status"], string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

interface ProjetosListProps {
  context?: "servico_social" | "pedagogico";
  basePath?: string;
}

export default function ProjetosList({
  context = "servico_social",
  basePath = "/projetos",
}: ProjetosListProps) {
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Projeto["status"]>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const { toast } = useToast();

  async function fetchProjetos() {
    setLoading(true);
    setAccessDenied(false);
    try {
      const { data, error } = await supabase
        .from("projetos" as any)
        .select("id, nome, setor, status, data_inicio, data_fim, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const visibleProjetos = ((data as Projeto[]) ?? []).filter((item) => {
        if (context === "pedagogico") return item.setor === "pedagogico";
        return item.setor === "servico_social" || item.setor === "pedagogico";
      });
      setProjetos(visibleProjetos);
    } catch (err: any) {
      if (err?.code === "42501") {
        setAccessDenied(true);
        setProjetos([]);
        toast({
          title: "Sem permissão",
          description: "Você não tem permissão para visualizar projetos.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: err?.message || "Falha ao carregar projetos",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjetos();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projetos.filter((item) => {
      const matchesSearch =
        !term ||
        item.nome.toLowerCase().includes(term) ||
        (item.setor || "").toLowerCase().includes(term) ||
        statusLabel[item.status].toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSetor = setorFilter === "all" || (item.setor || "") === setorFilter;
      return matchesSearch && matchesStatus && matchesSetor;
    });
  }, [projetos, search, statusFilter, setorFilter]);

  const setorOptions = useMemo(
    () =>
      Array.from(new Set(projetos.map((item) => item.setor).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [projetos],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, setorFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Projetos</h1>
          <p className="page-description">
            {context === "pedagogico"
              ? "Gerencie projetos pedagógicos e seus participantes."
              : "Gerencie projetos do Serviço Social e acompanhe projetos pedagógicos."}
          </p>
        </div>
        <Button asChild>
          <Link to={`${basePath}/novo`}>
            <Plus className="w-4 h-4 mr-2" />
            Novo projeto
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            Lista de projetos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="filters-grid-compact">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Busca
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, setor ou status..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Status
              </span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Setor
              </span>
              <Select value={setorFilter} onValueChange={setSetorFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {setorOptions.map((setor) => (
                    <SelectItem key={setor} value={setor}>
                      {setor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : accessDenied ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-destructive font-medium">
                      Sem permissão para acessar projetos.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum projeto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.setor || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "cancelado" ? "destructive" : "outline"}>
                          {statusLabel[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.data_inicio
                          ? format(new Date(item.data_inicio), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.data_fim
                          ? format(new Date(item.data_fim), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`${basePath}/${item.id}`}>Editar</Link>
                        </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
