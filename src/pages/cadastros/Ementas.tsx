import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CadastroDialog } from "@/components/cadastros/CadastroDialog";
import { CadastroListHeader } from "@/components/cadastros/CadastroListHeader";
import { CadastroTable } from "@/components/cadastros/CadastroTable";
import { useEmentas, Ementa, EmentaFormValues } from "@/hooks/useEmentas";
import { useDisciplinas } from "@/hooks/useDisciplinas";

const PAGE_SIZE = 10;

const initialForm: EmentaFormValues = {
  codigo: "",
  titulo: "",
  descricao: "",
  carga_horaria_pratica: null,
  cbo_tipo: "ocupacao",
  cbos: [""],
  disciplinaIds: [],
};

export default function Ementas() {
  const { fetchEmentas, createEmenta, updateEmenta, deleteEmenta } = useEmentas();
  const { listAllDisciplinas } = useDisciplinas();
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Ementa[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editing, setEditing] = useState<Ementa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ementa | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [disciplinasOptions, setDisciplinasOptions] = useState<
    Array<{
      id: string;
      nome: string;
      codigo: string;
      tipo_modulo: string;
      carga_horaria: number;
      numero_encontros: number;
    }>
  >([]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const loadDisciplinas = async () => {
      try {
        const disciplinas = await listAllDisciplinas();
        setDisciplinasOptions(disciplinas);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar disciplinas",
          description: error.message ?? "Tente novamente em instantes.",
          variant: "destructive",
        });
      }
    };
    loadDisciplinas();
  }, [listAllDisciplinas, toast]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const cargaHorariaTeorica = useMemo(
    () =>
      formData.disciplinaIds.reduce((sum, id) => {
        const disciplina = disciplinasOptions.find((item) => item.id === id);
        return sum + (disciplina?.carga_horaria || 0);
      }, 0),
    [disciplinasOptions, formData.disciplinaIds],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchEmentas({
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(items);
      setTotal(total);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar ementas",
        description: error.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, fetchEmentas, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (ementa: Ementa) => {
    setEditing(ementa);
    setFormData({
      codigo: ementa.codigo ?? "",
      titulo: ementa.titulo ?? "",
      descricao: ementa.descricao ?? "",
      carga_horaria_pratica: ementa.carga_horaria_pratica ?? null,
      cbo_tipo: ementa.cbo_tipo ?? "ocupacao",
      cbos: ementa.cbos && ementa.cbos.length > 0 ? ementa.cbos : [""],
      disciplinaIds: (ementa.disciplinas || [])
        .map((item) => item.disciplina?.id)
        .filter(Boolean) as string[],
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
        description: "Somente administradores podem alterar ementas.",
        variant: "destructive",
      });
      return;
    }

    setDialogSubmitting(true);
    try {
      if (editing) {
        await updateEmenta(editing.id, formData, editing);
        toast({ title: "Ementa atualizada" });
      } else {
        await createEmenta(formData);
        toast({ title: "Ementa criada" });
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
      await deleteEmenta(deleteTarget);
      toast({ title: "Ementa removida" });
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

  const rows = items.map((ementa) => (
    <TableRow key={ementa.id}>
      <TableCell>
        <div className="font-semibold">{ementa.titulo}</div>
        <div className="text-sm text-muted-foreground">{ementa.codigo}</div>
      </TableCell>
      <TableCell>{ementa.carga_horaria_teorica}h</TableCell>
      <TableCell>{ementa.carga_horaria_pratica}h</TableCell>
      <TableCell>{ementa.disciplinas?.length || 0}</TableCell>
      <TableCell className="max-w-[320px] truncate text-sm text-muted-foreground">
        {ementa.descricao || "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" aria-label="PDF">
            <Link to={`/ementas/${ementa.id}/pdf`}>
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
          {isAdmin ? (
            <>
              <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEditDialog(ementa)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setDeleteTarget(ementa)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  ));

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in">
      <CadastroListHeader
        title="Ementas"
        description="Composição de disciplinas e cargas horárias do planejamento pedagógico."
        searchPlaceholder="Buscar por título ou descrição..."
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <Button onClick={openCreateDialog} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Nova ementa
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Você não possui permissão para editar ementas.
        </div>
      )}

      <CadastroTable
        headers={["Ementa", "Carga teórica", "Carga prática", "Disciplinas", "Descrição", "Ações"]}
        rows={rows}
        isLoading={loading}
        hasData={items.length > 0}
        emptyMessage="Nenhuma ementa encontrada."
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
        title={editing ? "Editar ementa" : "Nova ementa"}
        description="Selecione as disciplinas do banco e informe a carga prática manual."
        onSubmit={handleSubmit}
        submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
        isSubmitting={dialogSubmitting}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="titulo" className="text-sm font-medium">
              Título *
            </label>
            <Input
              id="titulo"
              required
              value={formData.titulo}
              onChange={(event) => setFormData((prev) => ({ ...prev, titulo: event.target.value }))}
            />
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

          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <label htmlFor="cbo_tipo" className="text-sm font-medium">
                Tipo de ocupação *
              </label>
              <Select
                value={formData.cbo_tipo}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    cbo_tipo: value as EmentaFormValues["cbo_tipo"],
                    cbos:
                      value === "ocupacao"
                        ? [prev.cbos[0] || ""]
                        : prev.cbos.length > 0
                          ? prev.cbos
                          : [""],
                  }))
                }
              >
                <SelectTrigger id="cbo_tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ocupacao">Ocupação</SelectItem>
                  <SelectItem value="arco_ocupacional">Arco ocupacional</SelectItem>
                  <SelectItem value="multiplas_ocupacoes">Múltiplas ocupações</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {formData.cbo_tipo === "ocupacao" ? "CBO *" : "CBOs *"}
              </label>
              <div className="space-y-2">
                {formData.cbos.map((cbo, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      required
                      value={cbo}
                      placeholder="Ex.: 4110-10"
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          cbos: prev.cbos.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        }))
                      }
                    />
                    {formData.cbo_tipo !== "ocupacao" && formData.cbos.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            cbos: prev.cbos.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        aria-label="Remover CBO"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {formData.cbo_tipo !== "ocupacao" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      cbos: [...prev.cbos, ""],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar CBO
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Carga horária teórica</label>
              <Input value={`${cargaHorariaTeorica} horas`} disabled />
            </div>
            <div className="space-y-2">
              <label htmlFor="carga_horaria_pratica" className="text-sm font-medium">
                Carga prática *
              </label>
              <Input
                id="carga_horaria_pratica"
                type="number"
                min={0}
                required
                value={formData.carga_horaria_pratica ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    carga_horaria_pratica: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Disciplinas do banco</label>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3">
              {disciplinasOptions.map((disciplina) => {
                const checked = formData.disciplinaIds.includes(disciplina.id);
                return (
                  <label
                    key={disciplina.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          disciplinaIds: value
                            ? [...prev.disciplinaIds, disciplina.id]
                            : prev.disciplinaIds.filter((id) => id !== disciplina.id),
                        }))
                      }
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{disciplina.nome}</span>
                        <Badge variant="outline">{disciplina.tipo_modulo}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {disciplina.codigo} · {disciplina.carga_horaria}h · {disciplina.numero_encontros} encontro(s)
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </CadastroDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ementa</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Confirme para remover {deleteTarget?.titulo}.
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
