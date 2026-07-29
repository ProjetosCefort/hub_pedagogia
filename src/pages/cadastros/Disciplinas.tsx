import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CadastroDialog } from "@/components/cadastros/CadastroDialog";
import { CadastroListHeader } from "@/components/cadastros/CadastroListHeader";
import { CadastroTable } from "@/components/cadastros/CadastroTable";
import { useDisciplinas, Disciplina, DisciplinaFormValues } from "@/hooks/useDisciplinas";

const PAGE_SIZE = 10;
const FILTER_ALL = "all";

const TIPO_MODULO_OPTIONS = [
  "Introdutório",
  "Simultaneidade básica",
  "Simultaneidade específica",
];

const initialForm: DisciplinaFormValues = {
  codigo: "",
  nome: "",
  tipo_modulo: "",
  carga_horaria: null,
  numero_encontros: null,
  descricao: "",
};

export default function Disciplinas() {
  const { fetchDisciplinas, createDisciplina, updateDisciplina, deleteDisciplina } = useDisciplinas();
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tipoModuloFilter, setTipoModuloFilter] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Disciplina[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Disciplina | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tipoModuloFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchDisciplinas({
        search: debouncedSearch,
        tipoModulo: tipoModuloFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(items);
      setTotal(total);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar disciplinas",
        description: error.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tipoModuloFilter, page, fetchDisciplinas, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (disciplina: Disciplina) => {
    setEditing(disciplina);
    setFormData({
      codigo: disciplina.codigo ?? "",
      nome: disciplina.nome ?? "",
      tipo_modulo: disciplina.tipo_modulo ?? "",
      carga_horaria: disciplina.carga_horaria ?? null,
      numero_encontros: disciplina.numero_encontros ?? null,
      descricao: disciplina.descricao ?? "",
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
        description: "Somente administradores podem alterar disciplinas.",
        variant: "destructive",
      });
      return;
    }

    setDialogSubmitting(true);
    try {
      if (editing) {
        await updateDisciplina(editing.id, formData, editing);
        toast({ title: "Disciplina atualizada" });
      } else {
        await createDisciplina(formData);
        toast({ title: "Disciplina criada" });
      }
      closeDialog();
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message ?? "Revise os dados e tente novamente.",
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
      await deleteDisciplina(deleteTarget);
      toast({ title: "Disciplina removida" });
      setDeleteTarget(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filters = (
    <Select value={tipoModuloFilter} onValueChange={setTipoModuloFilter}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Tipo de módulo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>Todos os tipos</SelectItem>
        {TIPO_MODULO_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const rows = items.map((disciplina) => (
    <TableRow key={disciplina.id}>
      <TableCell>
        <div className="font-semibold">{disciplina.nome}</div>
        <div className="text-sm text-muted-foreground">{disciplina.codigo}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{disciplina.tipo_modulo}</Badge>
      </TableCell>
      <TableCell>{disciplina.carga_horaria}h</TableCell>
      <TableCell>{disciplina.numero_encontros}</TableCell>
      <TableCell className="max-w-[340px] truncate text-sm text-muted-foreground">
        {disciplina.descricao || "—"}
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEditDialog(disciplina)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setDeleteTarget(disciplina)}>
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
        title="Banco de Disciplinas"
        description="Cadastro das disciplinas base do planejamento pedagógico."
        searchPlaceholder="Buscar por nome ou descrição..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        actions={
          <Button onClick={openCreateDialog} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Nova disciplina
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Você não possui permissão para editar disciplinas.
        </div>
      )}

      <CadastroTable
        headers={["Disciplina", "Tipo de módulo", "Carga horária", "Encontros", "Descrição", "Ações"]}
        rows={rows}
        isLoading={loading}
        hasData={items.length > 0}
        emptyMessage="Nenhuma disciplina encontrada."
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
        title={editing ? "Editar disciplina" : "Nova disciplina"}
        description="Cadastre a disciplina que poderá compor ementas e cursos."
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="tipo_modulo" className="text-sm font-medium">
                Tipo de módulo *
              </label>
              <Select
                value={formData.tipo_modulo}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo_modulo: value }))}
              >
                <SelectTrigger id="tipo_modulo">
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_MODULO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="carga_horaria" className="text-sm font-medium">
                Carga horária *
              </label>
              <Input
                id="carga_horaria"
                type="number"
                min={0}
                required
                value={formData.carga_horaria ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    carga_horaria: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="numero_encontros" className="text-sm font-medium">
                Número de encontros *
              </label>
              <Input
                id="numero_encontros"
                type="number"
                min={0}
                required
                value={formData.numero_encontros ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    numero_encontros: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="descricao" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="descricao"
              value={formData.descricao ?? ""}
              onChange={(event) => setFormData((prev) => ({ ...prev, descricao: event.target.value }))}
            />
          </div>
        </div>
      </CadastroDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover disciplina</AlertDialogTitle>
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
