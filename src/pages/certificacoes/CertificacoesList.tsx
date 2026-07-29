import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Ban, Download, Filter, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { downloadExcel } from "@/lib/excel";

type Certificacao = {
  id: string;
  titulo: string;
  orgao_emissor: string;
  notificar_antes_dias: number;
  data_emissao: string | null;
  data_validade: string | null;
  status: "vigente" | "em_andamento" | "vencido" | "suspensa" | "cancelada";
};

export default function CertificacoesList() {
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Certificacao["status"]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<Certificacao[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "inativar" | "excluir";
    item: Certificacao;
  } | null>(null);
  const { toast } = useToast();

  async function fetchData() {
    setLoading(true);
    setAccessDenied(false);
    try {
      try {
        const { error: syncError } = await (supabase as any).rpc(
          "sync_certificacoes_status_by_validade",
        );
        if (syncError) {
          const ignorable =
            syncError.code === "PGRST202" ||
            syncError.code === "42883" ||
            /not found/i.test(syncError.message || "");
          if (!ignorable) {
            throw syncError;
          }
        }
      } catch (syncErr: any) {
        const ignorable =
          syncErr?.code === "PGRST202" ||
          syncErr?.code === "42883" ||
          /not found/i.test(syncErr?.message || "");
        if (!ignorable) {
          throw syncErr;
        }
      }

      const { data, error } = await supabase
        .from("certificacoes" as any)
        .select("id, titulo, orgao_emissor, notificar_antes_dias, data_emissao, data_validade, status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data as Certificacao[]) ?? []);
    } catch (err: any) {
      if (err?.code === "42501") {
        setAccessDenied(true);
        setRows([]);
      }
      toast({
        title: err?.code === "42501" ? "Sem permissão" : "Erro",
        description:
          err?.code === "42501"
            ? "Você não tem permissão para visualizar certificações."
            : err?.message || "Falha ao carregar certificações",
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
    return rows.filter((row) => {
      const matchesSearch = !term || (
        row.titulo.toLowerCase().includes(term) ||
        row.orgao_emissor.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term)
      );
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const statusLabel: Record<Certificacao["status"], string> = {
    vigente: "Vigente",
    em_andamento: "Em andamento",
    vencido: "Vencido",
    suspensa: "Suspensa",
    cancelada: "Cancelada",
  };

  const filteredForExport = filtered;

  async function handleExportExcel() {
    setExporting(true);
    try {
      if (filteredForExport.length === 0) {
        toast({
          title: "Sem registros",
          description: "Não há certificações para exportar com os filtros atuais.",
        });
        return;
      }

      const exportRows = filteredForExport.map((item) => ({
        titulo: item.titulo,
        orgaoEmissor: item.orgao_emissor,
        status: item.status,
        emissao: item.data_emissao
          ? format(new Date(item.data_emissao), "dd/MM/yyyy", { locale: ptBR })
          : "—",
        validade: item.data_validade
          ? format(new Date(item.data_validade), "dd/MM/yyyy", { locale: ptBR })
          : "—",
        alerta: item.notificar_antes_dias ?? 30,
      }));

      downloadExcel("certificacoes.xls", exportRows, [
        { header: "Título", accessor: (row) => row.titulo },
        { header: "Órgão emissor", accessor: (row) => row.orgaoEmissor },
        { header: "Status", accessor: (row) => row.status },
        { header: "Data de emissão", accessor: (row) => row.emissao },
        { header: "Data de validade", accessor: (row) => row.validade },
        { header: "Alerta (dias)", accessor: (row) => row.alerta },
      ]);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao exportar",
        description: error.message || "Não foi possível gerar o arquivo Excel.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleInativar(id: string) {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("certificacoes" as any)
        .update({ status: "suspensa" })
        .eq("id", id);
      if (error) throw error;

      setRows((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "suspensa" } : item)),
      );
      toast({
        title: "Certificação inativada",
        description: "O status foi alterado para suspensa.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao inativar",
        description: error.message || "Não foi possível inativar o registro.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleExcluir(id: string) {
    try {
      setActionLoading(true);
      const { error } = await supabase.from("certificacoes" as any).delete().eq("id", id);
      if (error) throw error;

      setRows((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: "Certificação excluída",
        description: "O registro foi removido com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o registro.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Certificações</h1>
          <p className="page-description">Controle de certificações e validade.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={exporting || loading || accessDenied}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button asChild>
            <Link to="/certificacoes/nova">
              <Plus className="w-4 h-4 mr-2" />
              Nova certificação
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" />
            Lista de certificações
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
                  placeholder="Buscar por título, órgão emissor ou status"
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
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Órgão emissor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Alerta (dias)</TableHead>
                  <TableHead className="w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : accessDenied ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-destructive font-medium">
                      Sem permissão para visualizar certificações.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhuma certificação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.titulo}</TableCell>
                      <TableCell>{item.orgao_emissor}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "cancelada" ? "destructive" : "outline"}>
                          {statusLabel[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.data_emissao
                          ? format(new Date(item.data_emissao), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {item.data_validade
                          ? format(new Date(item.data_validade), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>{item.notificar_antes_dias ?? 30}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="icon" title="Editar">
                            <Link to={`/certificacoes/${item.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Inativar"
                            onClick={() => setConfirmAction({ type: "inativar", item })}
                            disabled={item.status === "suspensa" || item.status === "cancelada"}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            onClick={() => setConfirmAction({ type: "excluir", item })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "inativar" ? "Inativar certificação" : "Excluir certificação"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "inativar"
                ? `Deseja inativar a certificação "${confirmAction.item.titulo}"?`
                : `Deseja excluir a certificação "${confirmAction?.item.titulo}"? Essa ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || !confirmAction}
              onClick={(event) => {
                event.preventDefault();
                if (!confirmAction) return;
                if (confirmAction.type === "inativar") {
                  handleInativar(confirmAction.item.id);
                } else {
                  handleExcluir(confirmAction.item.id);
                }
              }}
            >
              {actionLoading
                ? "Processando..."
                : confirmAction?.type === "inativar"
                  ? "Inativar"
                  : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
