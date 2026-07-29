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
import { useEmpresas, Empresa, EmpresaFormValues } from "@/hooks/useEmpresas";

const PAGE_SIZE = 10;

const initialForm: EmpresaFormValues = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  responsavel_nome: "",
  responsavel_telefone: "",
};

export default function Empresas() {
  const { fetchEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCnpj, setFilterCnpj] = useState<"all" | "with" | "without">("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Empresa[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [formData, setFormData] = useState<EmpresaFormValues>(initialForm);
  const [editing, setEditing] = useState<Empresa | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCnpj]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchEmpresas({
        search: debouncedSearch,
        hasCnpj: filterCnpj,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(items);
      setTotal(total);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar empresas",
        description: error.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCnpj, page, fetchEmpresas, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (empresa: Empresa) => {
    setEditing(empresa);
    setFormData({
      razao_social: empresa.razao_social ?? "",
      nome_fantasia: empresa.nome_fantasia ?? "",
      cnpj: empresa.cnpj ?? "",
      endereco: empresa.endereco ?? "",
      telefone: empresa.telefone ?? "",
      email: empresa.email ?? "",
      responsavel_nome: empresa.responsavel_nome ?? "",
      responsavel_telefone: empresa.responsavel_telefone ?? "",
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
        description: "Somente administradores podem alterar cadastros.",
        variant: "destructive",
      });
      return;
    }

    setDialogSubmitting(true);
    try {
      if (editing) {
        await updateEmpresa(editing.id, formData, editing);
        toast({ title: "Empresa atualizada com sucesso" });
      } else {
        await createEmpresa(formData);
        toast({ title: "Empresa criada com sucesso" });
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
      await deleteEmpresa(deleteTarget);
      toast({ title: "Empresa removida" });
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
    <Select value={filterCnpj} onValueChange={(value) => setFilterCnpj(value as typeof filterCnpj)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="CNPJ" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas</SelectItem>
        <SelectItem value="with">Com CNPJ</SelectItem>
        <SelectItem value="without">Sem CNPJ</SelectItem>
      </SelectContent>
    </Select>
  );

  const tableRows = items.map((empresa) => (
    <TableRow key={empresa.id}>
      <TableCell>
        <div className="font-semibold">{empresa.razao_social}</div>
        <div className="text-sm text-muted-foreground">{empresa.nome_fantasia || "—"}</div>
      </TableCell>
      <TableCell className="font-mono text-sm">{empresa.cnpj || "—"}</TableCell>
      <TableCell>{empresa.email || "—"}</TableCell>
      <TableCell>{empresa.telefone || "—"}</TableCell>
      <TableCell>{empresa.responsavel_nome || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {empresa.created_at ? format(new Date(empresa.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEditDialog(empresa)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setDeleteTarget(empresa)}>
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
        title="Empresas parceiras"
        description="Cadastre e atualize as empresas vinculadas ao Jovem Aprendiz."
        searchPlaceholder="Buscar por razão social, fantasia ou CNPJ..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        actions={
          <Button onClick={openCreateDialog} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Nova empresa
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          Apenas administradores podem criar ou editar empresas. Você está em modo somente leitura.
        </div>
      )}

      <CadastroTable
        headers={["Empresa", "CNPJ", "Contato", "Telefone", "Responsável", "Criada em", "Ações"]}
        rows={tableRows}
        isLoading={loading}
        hasData={items.length > 0}
        emptyMessage="Nenhuma empresa encontrada."
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
        title={editing ? "Editar empresa" : "Nova empresa"}
        description="Informe os dados principais da empresa."
        onSubmit={handleSubmit}
        submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
        isSubmitting={dialogSubmitting}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="razao_social" className="text-sm font-medium">
              Razão social *
            </label>
            <Input
              id="razao_social"
              required
              value={formData.razao_social}
              onChange={(event) => setFormData((prev) => ({ ...prev, razao_social: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nome_fantasia" className="text-sm font-medium">
              Nome fantasia
            </label>
            <Input
              id="nome_fantasia"
              value={formData.nome_fantasia ?? ""}
              onChange={(event) => setFormData((prev) => ({ ...prev, nome_fantasia: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="cnpj" className="text-sm font-medium">
                CNPJ
              </label>
              <Input
                id="cnpj"
                value={formData.cnpj ?? ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, cnpj: event.target.value }))}
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email ?? ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
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
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="responsavel_nome" className="text-sm font-medium">
                Responsável
              </label>
              <Input
                id="responsavel_nome"
                value={formData.responsavel_nome ?? ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, responsavel_nome: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="responsavel_telefone" className="text-sm font-medium">
                Telefone do responsável
              </label>
              <Input
                id="responsavel_telefone"
                value={formData.responsavel_telefone ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, responsavel_telefone: event.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </CadastroDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Confirme para remover {deleteTarget?.razao_social}.
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

