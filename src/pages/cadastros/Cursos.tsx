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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import {
  Curso,
  CursoDisciplinaVisual,
  CursoFormValues,
  CursoUnidadeVinculo,
  useCursos,
} from "@/hooks/useCursos";
import {
  GovValidacaoAprovadaOption,
  useGovValidacoes,
} from "@/hooks/useGovValidacoes";
import { useUnidades } from "@/hooks/useUnidades";
import { getErrorMessage } from "@/lib/errors";

const PAGE_SIZE = 10;
const GOV_NONE = "__none__";

const initialForm: CursoFormValues = {
  codigo: "",
  nome: "",
  descricao: "",
  unidadeVinculos: [],
};

export default function Cursos() {
  const { fetchCursos, createCurso, updateCurso, deleteCurso } = useCursos();
  const { listApprovedGovValidacoes } = useGovValidacoes();
  const { listAllUnidades } = useUnidades();
  const { toast } = useToast();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("all");
  const [govOptions, setGovOptions] = useState<GovValidacaoAprovadaOption[]>([]);
  const [unidadeOptions, setUnidadeOptions] = useState<Array<{ id: string; nome: string | null }>>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Curso[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Curso | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, unidadeFilter]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setUnidadeOptions(await listAllUnidades());
      } catch (error: unknown) {
        toast({
          title: "Erro ao carregar unidades",
          description: getErrorMessage(error, "O filtro ficará limitado."),
          variant: "destructive",
        });
      }
    };

    loadOptions();
  }, [listAllUnidades, toast]);

  useEffect(() => {
    const loadGovOptions = async () => {
      try {
        setGovOptions(await listApprovedGovValidacoes());
      } catch (error: unknown) {
        toast({
          title: "Erro ao carregar validações GOV",
          description: getErrorMessage(
            error,
            "A lista de validações ficará indisponível até nova tentativa.",
          ),
          variant: "destructive",
        });
      }
    };

    loadGovOptions();
  }, [listApprovedGovValidacoes, toast]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total } = await fetchCursos({
        search: debouncedSearch,
        unidadeId: unidadeFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(items);
      setTotal(total);
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar cursos",
        description: getErrorMessage(error, "Tente novamente em instantes."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, unidadeFilter, page, fetchCursos, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const govOptionsByUnidade = useMemo(() => {
    const map = new Map<string, GovValidacaoAprovadaOption[]>();
    govOptions.forEach((gov) => {
      const items = map.get(gov.unidade_id) ?? [];
      items.push(gov);
      map.set(gov.unidade_id, items);
    });
    return map;
  }, [govOptions]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (curso: Curso) => {
    setEditing(curso);
    setFormData({
      codigo: curso.codigo ?? "",
      nome: curso.nome ?? "",
      descricao: curso.descricao ?? "",
      unidadeVinculos: (curso.unidades ?? []).map((vinculo) => ({
        unidade_id: vinculo.unidade_id,
        gov_validacao_id: vinculo.gov_validacao_id ?? "",
      })),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData(initialForm);
    setEditing(null);
  };

  const toggleUnidade = (unidadeId: string, checked: boolean) => {
    setFormData((prev) => {
      if (!checked) {
        return {
          ...prev,
          unidadeVinculos: prev.unidadeVinculos.filter((item) => item.unidade_id !== unidadeId),
        };
      }

      if (prev.unidadeVinculos.some((item) => item.unidade_id === unidadeId)) {
        return prev;
      }

      const govs = govOptionsByUnidade.get(unidadeId) ?? [];
      return {
        ...prev,
        unidadeVinculos: [
          ...prev.unidadeVinculos,
          {
            unidade_id: unidadeId,
            gov_validacao_id: govs.length === 1 ? govs[0].id : "",
          },
        ],
      };
    });
  };

  const updateGovVinculo = (unidadeId: string, govValidacaoId: string) => {
    setFormData((prev) => ({
      ...prev,
      unidadeVinculos: prev.unidadeVinculos.map((item) =>
        item.unidade_id === unidadeId
          ? { ...item, gov_validacao_id: govValidacaoId === GOV_NONE ? "" : govValidacaoId }
          : item,
      ),
    }));
  };

  const getSelectedGov = (govValidacaoId: string | null | undefined) =>
    govOptions.find((option) => option.id === govValidacaoId) ?? null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      toast({
        title: "Permissão insuficiente",
        description: "Somente administradores podem alterar cursos.",
        variant: "destructive",
      });
      return;
    }

    setDialogSubmitting(true);
    try {
      if (editing) {
        await updateCurso(editing.id, formData, editing);
        toast({ title: "Curso atualizado" });
      } else {
        await createCurso(formData);
        toast({ title: "Curso criado" });
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
      await deleteCurso(deleteTarget);
      toast({ title: "Curso removido" });
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
    <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
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

  const rows = items.map((curso) => {
    const disciplinas = getCursoDisciplinas(curso.unidades ?? []);
    const cbos = getCursoCbos(curso.unidades ?? []);

    return (
      <TableRow key={curso.id}>
        <TableCell>
          <div className="font-semibold">{curso.nome}</div>
          <div className="text-sm text-muted-foreground">{curso.codigo}</div>
        </TableCell>
        <TableCell className="min-w-[260px]">
          <div className="space-y-2">
            {(curso.unidades ?? []).length > 0 ? (
              curso.unidades?.map((vinculo) => (
                <div key={vinculo.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="font-medium">{vinculo.unidade?.nome || "Unidade sem nome"}</div>
                  <div className="text-muted-foreground">
                    {vinculo.gov_validacao?.nome || "Sem GOV aprovado"}
                  </div>
                  {vinculo.gov_validacao?.protocolo && (
                    <div className="text-xs text-muted-foreground">
                      {vinculo.gov_validacao.protocolo} · {formatGovStatus(vinculo.gov_validacao.vigencia_final)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <Badge variant="secondary">Sem unidade</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="min-w-[280px]">
          {disciplinas.length > 0 ? (
            <div className="space-y-1">
              {disciplinas.slice(0, 6).map((disciplina) => (
                <div key={disciplina.id} className="text-sm">
                  <span className="font-medium">{disciplina.nome}</span>{" "}
                  <span className="text-muted-foreground">({disciplina.carga_horaria}h)</span>
                </div>
              ))}
              {disciplinas.length > 6 && (
                <div className="text-xs text-muted-foreground">
                  +{disciplinas.length - 6} matéria(s)
                </div>
              )}
            </div>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell className="max-w-[260px]">
          {cbos.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {cbos.map((cbo) => (
                <Badge key={cbo} variant="outline">
                  {cbo}
                </Badge>
              ))}
            </div>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
          {curso.descricao || "—"}
        </TableCell>
        <TableCell>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEditDialog(curso)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => setDeleteTarget(curso)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline">Somente leitura</Badge>
          )}
        </TableCell>
      </TableRow>
    );
  });

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in">
      <CadastroListHeader
        title="Cursos"
        description="Cadastro base de cursos para o planejamento pedagógico."
        searchPlaceholder="Buscar por nome ou descrição..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        actions={
          <Button onClick={openCreateDialog} disabled={!isAdmin}>
            <Plus className="h-4 w-4" />
            Novo curso
          </Button>
        }
      />

      {!isAdmin && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Você não possui permissão para editar cursos.
        </div>
      )}

      <CadastroTable
        headers={["Curso", "Unidades e GOV", "Matérias", "CBOs", "Descrição", "Ações"]}
        rows={rows}
        isLoading={loading}
        hasData={items.length > 0}
        emptyMessage="Nenhum curso encontrado."
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
        title={editing ? "Editar curso" : "Novo curso"}
        description="Cadastre o curso com seus vínculos por unidade."
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
            <label htmlFor="descricao" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="descricao"
              value={formData.descricao ?? ""}
              onChange={(event) => setFormData((prev) => ({ ...prev, descricao: event.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Unidades</p>
            <div className="grid gap-3">
              {unidadeOptions.map((unidade) => {
                const vinculo = formData.unidadeVinculos.find((item) => item.unidade_id === unidade.id);
                const unidadeGovOptions = govOptionsByUnidade.get(unidade.id) ?? [];
                const selectedGov = getSelectedGov(vinculo?.gov_validacao_id);

                return (
                  <div key={unidade.id} className="rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`unidade-${unidade.id}`}
                        checked={Boolean(vinculo)}
                        onCheckedChange={(checked) => toggleUnidade(unidade.id, checked === true)}
                      />
                      <label htmlFor={`unidade-${unidade.id}`} className="text-sm font-medium">
                        {unidade.nome || "Sem nome"}
                      </label>
                    </div>

                    {vinculo && (
                      <div className="mt-3 space-y-3">
                        <Select
                          value={vinculo.gov_validacao_id || GOV_NONE}
                          onValueChange={(value) => updateGovVinculo(unidade.id, value)}
                          disabled={unidadeGovOptions.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar validação GOV aprovada" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={GOV_NONE}>Sem validação GOV</SelectItem>
                            {unidadeGovOptions.map((gov) => (
                              <SelectItem key={gov.id} value={gov.id}>
                                {gov.nome} ({gov.protocolo})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedGov && <GovPreview gov={selectedGov} />}
                        {!selectedGov && unidadeGovOptions.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma validação GOV aprovada para esta unidade.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CadastroDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover curso</AlertDialogTitle>
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

function GovPreview({ gov }: { gov: GovValidacaoAprovadaOption }) {
  const disciplinas = gov.ementa?.disciplinas
    ?.map((item) => item.disciplina)
    .filter(Boolean) as CursoDisciplinaVisual[] | undefined;

  return (
    <div className="rounded-md bg-muted/40 p-3 text-sm">
      <div className="font-medium">{gov.ementa?.titulo || "Ementa sem título"}</div>
      <div className="text-muted-foreground">
        {(gov.ementa?.carga_horaria_teorica ?? 0) + (gov.ementa?.carga_horaria_pratica ?? 0)}h totais
      </div>
      {disciplinas && disciplinas.length > 0 && (
        <div className="mt-2 space-y-1">
          {disciplinas.map((disciplina) => (
            <div key={disciplina.id}>
              {disciplina.nome} <span className="text-muted-foreground">({disciplina.carga_horaria}h)</span>
            </div>
          ))}
        </div>
      )}
      {gov.ementa?.cbos && gov.ementa.cbos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {gov.ementa.cbos.map((cbo) => (
            <Badge key={cbo} variant="outline">
              {cbo}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function getCursoDisciplinas(vinculos: CursoUnidadeVinculo[]) {
  const map = new Map<string, CursoDisciplinaVisual>();
  vinculos.forEach((vinculo) => {
    vinculo.gov_validacao?.ementa?.disciplinas?.forEach((item) => {
      if (item.disciplina) {
        map.set(item.disciplina.id, item.disciplina);
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function getCursoCbos(vinculos: CursoUnidadeVinculo[]) {
  const cbos = new Set<string>();
  vinculos.forEach((vinculo) => {
    vinculo.gov_validacao?.ementa?.cbos?.forEach((cbo) => {
      if (cbo) cbos.add(cbo);
    });
  });
  return Array.from(cbos).sort();
}

function formatGovStatus(vigenciaFim: string | null) {
  if (!vigenciaFim) return "Sem vigência";
  const today = new Date();
  const end = new Date(vigenciaFim);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Vencido";
  if (diffDays <= 90) return `Vence em ${diffDays} dia(s)`;
  return "Vigente";
}
