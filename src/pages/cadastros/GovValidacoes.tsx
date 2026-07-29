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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TableCell, TableRow } from "@/components/ui/table";
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
import {
  GovStatus,
  GovValidacao,
  GovValidacaoFormValues,
  useGovValidacoes,
} from "@/hooks/useGovValidacoes";
import { useEmentas } from "@/hooks/useEmentas";
import { useUnidades } from "@/hooks/useUnidades";
import { getErrorMessage } from "@/lib/errors";

const PAGE_SIZE = 10;
const NONE = "__none__";

const statusLabels: Record<GovStatus, string> = {
  cadastrado: "Cadastrado",
  ajuste: "Ajuste",
  aprovado: "Aprovado",
  inativo: "Inativo",
};

const initialForm: GovValidacaoFormValues = {
  nome: "",
  protocolo: "",
  numero_curso_mte: "",
  unidade_id: "",
  ementa_id: "",
  alerta_antecedencia_dias: 90,
  vigencia_atual: "",
  vigencia_final: "",
  status: "cadastrado",
};

export default function GovValidacoes() {
  const {
    fetchGovValidacoes,
    createGovValidacao,
    updateGovValidacao,
    deleteGovValidacao,
  } = useGovValidacoes();
  const { listAllEmentas } = useEmentas();
  const { listAllUnidades } = useUnidades();
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GovValidacao[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editing, setEditing] = useState<GovValidacao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GovValidacao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unidadeOptions, setUnidadeOptions] = useState<Array<{ id: string; nome: string | null }>>([]);
  const [ementaOptions, setEmentaOptions] = useState<Array<{ id: string; titulo: string; codigo: string }>>([]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [unidades, ementas] = await Promise.all([
          listAllUnidades(),
          listAllEmentas(),
        ]);
        setUnidadeOptions(unidades);
        setEmentaOptions(ementas);
      } catch (error: unknown) {
        toast({
          title: "Erro ao carregar opções",
          description: getErrorMessage(error, "Tente novamente em instantes."),
          variant: "destructive",
        });
      }
    }

    loadOptions();
  }, [listAllEmentas, listAllUnidades, toast]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchGovValidacoes({
        search: debouncedSearch,
        status: statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(items);
      setTotal(total);
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar cadastros GOV",
        description: getErrorMessage(error, "Tente novamente em instantes."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fetchGovValidacoes, page, statusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: GovValidacao) => {
    setEditing(item);
    setFormData({
      nome: item.nome ?? "",
      protocolo: item.protocolo ?? "",
      numero_curso_mte: item.numero_curso_mte ?? "",
      unidade_id: item.unidade_id ?? "",
      ementa_id: item.ementa_id ?? "",
      alerta_antecedencia_dias: item.alerta_antecedencia_dias ?? 90,
      vigencia_atual: item.vigencia_atual ?? "",
      vigencia_final: item.vigencia_final ?? "",
      status: item.status ?? "cadastrado",
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
        description: "Somente administradores podem alterar cadastros GOV.",
        variant: "destructive",
      });
      return;
    }

    setDialogSubmitting(true);
    try {
      if (editing) {
        await updateGovValidacao(editing.id, formData, editing);
        toast({ title: "Cadastro GOV atualizado" });
      } else {
        await createGovValidacao(formData);
        toast({ title: "Cadastro GOV criado" });
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
      await deleteGovValidacao(deleteTarget);
      toast({ title: "Cadastro GOV removido" });
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

  const filters = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os status</SelectItem>
        {Object.entries(statusLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const rows = items.map((item) => (
    <TableRow key={item.id}>
      <TableCell>
        <div className="font-semibold">{item.nome}</div>
        <div className="text-sm text-muted-foreground">{item.protocolo}</div>
      </TableCell>
      <TableCell>{item.unidade?.nome || "—"}</TableCell>
      <TableCell>{item.ementa?.titulo || "—"}</TableCell>
      <TableCell>
        <Badge variant={item.status === "aprovado" ? "default" : "outline"}>
          {statusLabels[item.status] || item.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p>{item.numero_curso_mte || "Sem número MTE"}</p>
          <p className="text-muted-foreground">
            {item.vigencia_atual || "Sem início"} → {item.vigencia_final || "Sem fim"}
          </p>
        </div>
      </TableCell>
      <TableCell>{item.alerta_antecedencia_dias} dia(s)</TableCell>
      <TableCell>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEditDialog(item)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setDeleteTarget(item)}>
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
        title="GOV"
        description="Cadastro de validações governamentais vinculadas a unidade e ementa."
        searchPlaceholder="Buscar por nome, protocolo ou número MTE..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        actions={
          <Button onClick={openCreateDialog} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Novo GOV
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Você não possui permissão para editar cadastros GOV.
        </div>
      )}

      <CadastroTable
        headers={["Nome", "Unidade", "Ementa", "Status", "Vigência", "Alerta", "Ações"]}
        rows={rows}
        isLoading={loading}
        hasData={items.length > 0}
        emptyMessage="Nenhum cadastro GOV encontrado."
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
        title={editing ? "Editar GOV" : "Novo GOV"}
        description="Cadastre a validação governamental do curso."
        onSubmit={handleSubmit}
        submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
        isSubmitting={dialogSubmitting}
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="gov_nome" className="text-sm font-medium">
                Nome *
              </label>
              <Input
                id="gov_nome"
                required
                value={formData.nome}
                onChange={(event) => setFormData((prev) => ({ ...prev, nome: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="gov_protocolo" className="text-sm font-medium">
                Protocolo *
              </label>
              <Input
                id="gov_protocolo"
                required
                value={formData.protocolo}
                onChange={(event) => setFormData((prev) => ({ ...prev, protocolo: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="gov_unidade" className="text-sm font-medium">
                Unidade *
              </label>
              <Select
                value={formData.unidade_id || NONE}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, unidade_id: value === NONE ? "" : value }))
                }
              >
                <SelectTrigger id="gov_unidade">
                  <SelectValue placeholder="Selecionar unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Selecionar unidade</SelectItem>
                  {unidadeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.nome || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="gov_ementa" className="text-sm font-medium">
                Ementa *
              </label>
              <Select
                value={formData.ementa_id || NONE}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, ementa_id: value === NONE ? "" : value }))
                }
              >
                <SelectTrigger id="gov_ementa">
                  <SelectValue placeholder="Selecionar ementa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Selecionar ementa</SelectItem>
                  {ementaOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.titulo} ({option.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="gov_status" className="text-sm font-medium">
                Status *
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value as GovStatus }))
                }
              >
                <SelectTrigger id="gov_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="gov_alerta" className="text-sm font-medium">
                Alerta com antecedência
              </label>
              <Input
                id="gov_alerta"
                type="number"
                min={0}
                value={formData.alerta_antecedencia_dias ?? 90}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    alerta_antecedencia_dias: event.target.value ? Number(event.target.value) : 90,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="gov_mte" className="text-sm font-medium">
                Número do curso (MTE)
              </label>
              <Input
                id="gov_mte"
                required={formData.status === "aprovado"}
                value={formData.numero_curso_mte ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, numero_curso_mte: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="gov_vigencia_atual" className="text-sm font-medium">
                Vigência atual
              </label>
              <Input
                id="gov_vigencia_atual"
                type="date"
                required={formData.status === "aprovado"}
                value={formData.vigencia_atual ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, vigencia_atual: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="gov_vigencia_final" className="text-sm font-medium">
                Vigência final
              </label>
              <Input
                id="gov_vigencia_final"
                type="date"
                required={formData.status === "aprovado"}
                value={formData.vigencia_final ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, vigencia_final: event.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </CadastroDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover GOV</AlertDialogTitle>
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
