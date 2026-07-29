import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, BriefcaseBusiness, Loader2, Filter } from "lucide-react";
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

type Vinculo = {
  id: string;
  vaga_ref: string;
  status: "em_analise" | "aprovado" | "reprovado" | "encerrado";
  observacoes: string | null;
  created_at: string;
  jovem_id: string | null;
  inscricao_id: string | null;
  jovem: { nome_completo: string | null } | null;
  inscricao: { nome_completo: string | null; cpf: string | null } | null;
};

const statusLabel: Record<Vinculo["status"], string> = {
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  encerrado: "Encerrado",
};

export default function JovemVagaVinculosList() {
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Vinculo["status"]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const { toast } = useToast();

  async function fetchVinculos() {
    setLoading(true);
    setAccessDenied(false);
    try {
      const { data, error } = await supabase
        .from("jovem_vaga_vinculos" as any)
        .select(
          `
          id,
          vaga_ref,
          status,
          observacoes,
          created_at,
          jovem_id,
          inscricao_id,
          jovem:jovens(nome_completo),
          inscricao:inscricoes_jovens_aprendizes(nome_completo, cpf)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVinculos((data as Vinculo[]) ?? []);
    } catch (err: any) {
      if (err?.code === "42501") {
        setAccessDenied(true);
        setVinculos([]);
        toast({
          title: "Sem permissão",
          description: "Você não tem permissão para visualizar vínculos de vaga.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: err?.message || "Falha ao carregar vínculos de vaga",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVinculos();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vinculos.filter((item) => {
      const nome = item.jovem?.nome_completo || item.inscricao?.nome_completo || "";
      const matchesSearch =
        !term ||
        item.vaga_ref.toLowerCase().includes(term) ||
        nome.toLowerCase().includes(term) ||
        (item.inscricao?.cpf || "").includes(term);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, vinculos, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Vínculos de Vaga (MVP)</h1>
          <p className="page-description">Acompanhe jovens/inscrições em análise para vaga.</p>
        </div>
        <Button asChild>
          <Link to="/vagas-vinculos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo vínculo
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BriefcaseBusiness className="w-4 h-4" />
            Lista de vínculos
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
                  placeholder="Buscar por vaga, nome ou CPF..."
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
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Jovem/Inscrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : accessDenied ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-destructive font-medium">
                      Sem permissão para acessar vínculos de vaga.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Nenhum vínculo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.vaga_ref}</TableCell>
                      <TableCell>
                        {item.jovem?.nome_completo || item.inscricao?.nome_completo || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "reprovado" ? "destructive" : "outline"}>
                          {statusLabel[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/vagas-vinculos/${item.id}`}>Editar</Link>
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
