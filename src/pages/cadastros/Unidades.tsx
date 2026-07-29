import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { TableCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CadastroListHeader } from "@/components/cadastros/CadastroListHeader";
import { CadastroTable } from "@/components/cadastros/CadastroTable";
import { CadastroDialog } from "@/components/cadastros/CadastroDialog";
import { useUnidades, Unidade, UnidadeFormValues } from "@/hooks/useUnidades";

const PAGE_SIZE = 10;

const initialForm: UnidadeFormValues = {
  nome: "",
  endereco: "",
  telefone: "",
};

export default function Unidades() {
  const { fetchUnidades, createUnidade, updateUnidade, deleteUnidade } = useUnidades();
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasPhoneFilter, setHasPhoneFilter] = useState<"all" | "with" | "without">("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Unidade[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editing, setEditing] = useState<Unidade | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Unidade | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, hasPhoneFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchUnidades({
        search: debouncedSearch,
        hasTelefone: hasPhoneFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(items);
      setTotal(total);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar unidades",
        description: error.message ?? "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, hasPhoneFilter, page, fetchUnidades, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (unidade: Unidade) => {
    setEditing(unidade);
    setFormData({
      nome: unidade.nome ?? "",
      endereco: unidade.endereco ?? "",
      telefone: unidade.telefone ?? "",
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
        description: "Somente administradores podem alterar unidades.",
        variant: "destructive",
      });
      return;
    }
    setDialogSubmitting(true);
    try {
      if (editing) {
        await updateUnidade(editing.id, formData, editing);
        toast({ title: "Unidade atualizada" });
      } else {
        await createUnidade(formData);
        toast({ title: "Unidade criada" });
      }
      closeDialog();
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message ?? "Verifique os dados e tente novamente.",
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
      await deleteUnidade(deleteTarget);
      toast({ title: "Unidade removida" });
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
    <Select value={hasPhoneFilter} onValueChange={(value) => setHasPhoneFilter(value as typeof hasPhoneFilter)}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Telefone" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os contatos</SelectItem>
        <SelectItem value="with">Com telefone</SelectItem>
        <SelectItem value="without">Sem telefone</SelectItem>
      </SelectContent>
    </Select>
  );

  const tableRows = items.map((unidade) => (
    <TableRow key={unidade.id}>
      <TableCell className="font-semibold">{unidade.nome}</TableCell>
      <TableCell>{unidade.endereco || "—"}</TableCell>
      <TableCell>{unidade.telefone || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {unidade.created_at ? format(new Date(unidade.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEditDialog(unidade)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setDeleteTarget(unidade)}>
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
        title="Unidades"
        description="Mapa das unidades do CEFORT responsáveis pelo atendimento."
        searchPlaceholder="Buscar por nome ou endereço..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        actions={
          <Button onClick={openCreateDialog} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Nova unidade
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Você possui acesso de leitura. Solicite a um administrador para criar ou editar unidades.
        </div>
      )}

      <CadastroTable
        headers={["Unidade", "Endereço", "Telefone", "Criada em", "Ações"]}
        rows={tableRows}
        isLoading={loading}
        hasData={items.length > 0}
        emptyMessage="Nenhuma unidade encontrada."
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
        title={editing ? "Editar unidade" : "Nova unidade"}
        description="Informe os dados básicos para identificar a unidade."
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
          <div className="space-y-2">
            <label htmlFor="endereco" className="text-sm font-medium">
              Endereço
            </label>
            <Input
              id="endereco"
              value={formData.endereco ?? ""}
              onChange={(event) => setFormData((prev) => ({ ...prev, endereco: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="telefone" className="text-sm font-medium">
              Telefone
            </label>
            <Input
              id="telefone"
              value={formData.telefone ?? ""}
              onChange={(event) => setFormData((prev) => ({ ...prev, telefone: event.target.value }))}
            />
          </div>
        </div>
      </CadastroDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover unidade</AlertDialogTitle>
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

