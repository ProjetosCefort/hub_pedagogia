import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Loader2, Paperclip, Plus, Search, UsersRound } from "lucide-react";
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

type Conselho = {
  id: string;
  periodo: string | null;
  data_reuniao: string;
  status: "aberto" | "finalizado" | "arquivado";
  turma: { nome: string } | null;
  anexos?: Array<{ id: string }> | null;
};

export default function ConselhoClasseList() {
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Conselho["status"]>("all");
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<Conselho[]>([]);
  const { toast } = useToast();

  async function fetchData() {
    setLoading(true);
    setAccessDenied(false);
    try {
      const { data, error } = await supabase
        .from("conselho_classe" as any)
        .select("id, periodo, data_reuniao, status, turma:turmas(nome), anexos:conselho_classe_anexos(id)")
        .order("data_reuniao", { ascending: false });

      if (error) throw error;
      setRows((data as Conselho[]) ?? []);
    } catch (err: any) {
      if (err?.code === "42501") {
        setAccessDenied(true);
      }
      toast({
        title: err?.code === "42501" ? "Sem permissão" : "Erro",
        description:
          err?.code === "42501"
            ? "Você não tem permissão para visualizar conselhos de classe."
            : err?.message || "Falha ao carregar conselho de classe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((item) => {
      const matchesSearch =
        !term ||
        (item.periodo || "").toLowerCase().includes(term) ||
        (item.turma?.nome || "").toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesTurma = turmaFilter === "all" || (item.turma?.nome || "") === turmaFilter;
      return matchesSearch && matchesStatus && matchesTurma;
    });
  }, [rows, search, statusFilter, turmaFilter]);

  const turmaOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((item) => item.turma?.nome).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [rows],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, turmaFilter]);

  const statusLabel: Record<Conselho["status"], string> = {
    aberto: "Aberto",
    finalizado: "Finalizado",
    arquivado: "Arquivado",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Conselho de Classe</h1>
          <p className="page-description">Registro de reuniões por turma/período.</p>
        </div>
        <Button asChild>
          <Link to="/conselho-classe/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo conselho
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UsersRound className="w-4 h-4" />
            Lista de conselhos
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
                  className="pl-9"
                  placeholder="Buscar por turma, período ou status"
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
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Turma</span>
              <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {turmaOptions.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
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
                  <TableHead>Turma</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data reunião</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
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
                      Sem permissão para visualizar conselho de classe.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum conselho encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.turma?.nome || "—"}</TableCell>
                      <TableCell>{item.periodo || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "arquivado" ? "destructive" : "outline"}>
                          {statusLabel[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.data_reuniao), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {item.anexos?.length ? (
                          <Badge variant="outline" className="gap-1">
                            <Paperclip className="w-3 h-3" />
                            {item.anexos.length}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/conselho-classe/${item.id}`}>Editar</Link>
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
