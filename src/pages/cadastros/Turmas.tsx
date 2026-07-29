import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { TableCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CadastroListHeader } from "@/components/cadastros/CadastroListHeader";
import { CadastroTable } from "@/components/cadastros/CadastroTable";
import { CadastroDialog } from "@/components/cadastros/CadastroDialog";
import { useTurmas, Turma, TurmaFormValues } from "@/hooks/useTurmas";
import { useUnidades } from "@/hooks/useUnidades";
import { useCursos } from "@/hooks/useCursos";
import { getErrorMessage } from "@/lib/errors";

const PAGE_SIZE = 10;

/** Valor usado no Select de unidade para "Sem unidade"; Radix não permite value="" em SelectItem */
const UNIDADE_NONE = "__none__";

const initialForm: TurmaFormValues = {
  analista_responsavel_id: "",
  capacidade: null,
  codigo: "",
  curso_id: "",
  nome: "",
  unidade_id: "",
  data_inicio: "",
  ativo: true,
};

export default function Turmas() {
  const { fetchTurmas, createTurma, updateTurma, deleteTurma } = useTurmas();
  const { listAllUnidades } = useUnidades();
  const { listCursosByUnidade } = useCursos();
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("all");
  const [unidadeOptions, setUnidadeOptions] = useState<Array<{ id: string; nome: string | null }>>([]);
  const [analistaOptions, setAnalistaOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [cursoOptions, setCursoOptions] = useState<Array<{ id: string; nome: string; codigo: string }>>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Turma[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editing, setEditing] = useState<Turma | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Turma | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, unidadeFilter]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await listAllUnidades();
        setUnidadeOptions(options);
      } catch (error: unknown) {
        toast({
          title: "Erro ao carregar unidades",
          description: getErrorMessage(
            error,
            "As salas continuarão disponíveis, mas o filtro ficará limitado.",
          ),
          variant: "destructive",
        });
      }
    };
    loadOptions();
  }, [listAllUnidades, toast]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadAnalistas = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .order("nome_completo", { ascending: true });

        if (error) throw error;

        setAnalistaOptions(
          (profiles || []).map((profile) => ({
            id: profile.id,
            nome: profile.nome_completo || "Usuário sem nome",
          })),
        );
      } catch (error: unknown) {
        toast({
          title: "Erro ao carregar analistas",
          description: getErrorMessage(error, "Os demais campos da sala seguem disponíveis."),
          variant: "destructive",
        });
      }
    };

    loadAnalistas();
  }, [isAdmin, toast]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchTurmas({
        search: debouncedSearch,
        status: statusFilter,
        unidadeId: unidadeFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(items);
      setTotal(total);
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar salas",
        description: getErrorMessage(error, "Tente novamente em instantes."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, unidadeFilter, page, fetchTurmas, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!dialogOpen) return;

    async function loadCursosDaUnidade() {
      if (!formData.unidade_id) {
        setCursoOptions([]);
        if (formData.curso_id) {
          setFormData((prev) => ({ ...prev, curso_id: "" }));
        }
        return;
      }

      try {
        const cursos = await listCursosByUnidade(formData.unidade_id);
        setCursoOptions(cursos);
        if (formData.curso_id && !cursos.some((curso) => curso.id === formData.curso_id)) {
          setFormData((prev) => ({ ...prev, curso_id: "" }));
        }
      } catch (error: unknown) {
        toast({
          title: "Erro ao carregar cursos",
          description: getErrorMessage(error, "O vínculo de curso ficará indisponível até nova tentativa."),
          variant: "destructive",
        });
      }
    }

    loadCursosDaUnidade();
  }, [dialogOpen, formData.unidade_id, formData.curso_id, listCursosByUnidade, toast]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (turma: Turma) => {
    setEditing(turma);
    setFormData({
      analista_responsavel_id: turma.analista_responsavel_id ?? "",
      capacidade: turma.capacidade ?? null,
      codigo: turma.codigo ?? "",
      curso_id: turma.curso_id ?? "",
      nome: turma.nome ?? "",
      unidade_id: turma.unidade_id ?? "",
      data_inicio: turma.data_inicio?.slice(0, 10) ?? "",
      ativo: turma.ativo ?? true,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData(initialForm);
    setEditing(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      toast({
        title: "Permissão insuficiente",
        description: "Somente administradores podem alterar salas.",
        variant: "destructive",
      });
      return;
    }
    setDialogSubmitting(true);
    try {
      if (editing) {
        await updateTurma(editing.id, formData, editing);
        toast({ title: "Sala atualizada" });
      } else {
        await createTurma(formData);
        toast({ title: "Sala criada" });
      }
      closeDialog();
      loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: getErrorMessage(error, "Revise os dados e tente novamente."),
        variant: "destructive",
      });
    } finally {
      setDialogSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !isAdmin) return;
    setDeleting(true);
    try {
      await deleteTurma(deleteTarget);
      toast({ title: "Sala removida" });
      setDeleteTarget(null);
      loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro ao remover",
        description: getErrorMessage(error, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const statusFilterSelect = (
    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os status</SelectItem>
        <SelectItem value="active">Ativas</SelectItem>
        <SelectItem value="inactive">Inativas</SelectItem>
      </SelectContent>
    </Select>
  );

  const unidadeFilterSelect = (
    <Select value={unidadeFilter} onValueChange={(value) => setUnidadeFilter(value)}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Unidade" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as unidades</SelectItem>
        {unidadeOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.nome || "Sem nome"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const filters = (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      {statusFilterSelect}
      {unidadeFilterSelect}
    </div>
  );

  const tableRows = items.map((turma) => (
    <TableRow key={turma.id}>
      <TableCell>
        <div className="font-semibold">{turma.nome}</div>
        <div className="text-sm text-muted-foreground">{turma.codigo}</div>
      </TableCell>
      <TableCell>{turma.unidade?.nome || "—"}</TableCell>
      <TableCell>
        {turma.curso?.nome ? (
          <div>
            <div className="font-medium">{turma.curso.nome}</div>
            <div className="text-sm text-muted-foreground">{turma.curso.codigo || "Sem código"}</div>
          </div>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>{turma.capacidade ?? "—"}</TableCell>
      <TableCell>
        {turma.analista_responsavel_id
          ? analistaOptions.find((option) => option.id === turma.analista_responsavel_id)?.nome || "Responsável vinculado"
          : "—"}
      </TableCell>
      <TableCell>
        {turma.data_inicio ? format(new Date(turma.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : "—"}
      </TableCell>
      <TableCell>
        <Badge variant={turma.ativo ? "default" : "secondary"}>
          {turma.ativo ? "Ativa" : "Inativa"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {turma.created_at ? format(new Date(turma.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEditDialog(turma)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setDeleteTarget(turma)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Badge variant="outline">Somente leitura</Badge>
        )}
      </TableCell>
    </TableRow>
  ));

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in">
      <CadastroListHeader
        title="Turmas"
        description="Controle de salas vinculadas às unidades do CEFORT."
        searchPlaceholder="Buscar por nome..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        actions={
          <Button onClick={openCreateDialog} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Nova sala
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Você não possui permissão para editar salas.
        </div>
      )}

      <CadastroTable
        headers={["Sala", "Unidade", "Curso", "Capacidade", "Analista", "Início", "Status", "Criada em", "Ações"]}
        rows={tableRows}
        isLoading={loading}
        hasData={items.length > 0}
        emptyMessage="Nenhuma sala encontrada."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {from === 0 ? 0 : from} - {to} de {total}
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                {page} / {totalPages}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <CadastroDialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
        title={editing ? "Editar sala" : "Nova sala"}
        description="Preencha os dados operacionais da sala."
        onSubmit={handleSubmit}
        submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
        isSubmitting={dialogSubmitting}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="nome" className="text-sm font-medium">
              Nome *
            </label>
            <Input
              id="nome"
              required
              value={formData.nome}
              onChange={(event) => setFormData((prev) => ({ ...prev, nome: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="capacidade" className="text-sm font-medium">
                Capacidade
              </label>
              <Input
                id="capacidade"
                type="number"
                min={0}
                value={formData.capacidade ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    capacidade: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="analista_responsavel_id" className="text-sm font-medium">
                Analista responsável
              </label>
              <Select
                value={formData.analista_responsavel_id || UNIDADE_NONE}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    analista_responsavel_id: value === UNIDADE_NONE ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="analista_responsavel_id">
                  <SelectValue placeholder="Selecionar analista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNIDADE_NONE}>Sem responsável</SelectItem>
                  {analistaOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="unidade_id" className="text-sm font-medium">
              Unidade
            </label>
            <Select
              value={formData.unidade_id || UNIDADE_NONE}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  unidade_id: value === UNIDADE_NONE ? "" : value,
                  curso_id: "",
                }))
              }
            >
              <SelectTrigger id="unidade_id">
                <SelectValue placeholder="Selecionar unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNIDADE_NONE}>Sem unidade</SelectItem>
                {unidadeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.nome || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="curso_id" className="text-sm font-medium">
              Curso
            </label>
            <Select
              value={formData.curso_id || UNIDADE_NONE}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, curso_id: value === UNIDADE_NONE ? "" : value }))
              }
            >
              <SelectTrigger id="curso_id">
                <SelectValue placeholder="Selecionar curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNIDADE_NONE}>Sem curso</SelectItem>
                {cursoOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.nome} ({option.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="data_inicio" className="text-sm font-medium flex items-center gap-2">
                Início <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </label>
              <Input
                id="data_inicio"
                type="date"
                value={formData.data_inicio ?? ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, data_inicio: event.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch
                id="ativo"
                checked={formData.ativo ?? true}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, ativo: checked }))}
              />
              <label htmlFor="ativo" className="text-sm font-medium">
                Sala ativa
              </label>
            </div>
          </div>
        </div>
      </CadastroDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sala</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Confirme para remover {deleteTarget?.nome}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
