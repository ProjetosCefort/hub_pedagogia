import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Clock3, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const STATUS_OPTIONS = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
] as const;

const PRIORIDADE_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-emerald-100 text-emerald-900 border-emerald-200",
  media: "bg-amber-100 text-amber-900 border-amber-200",
  alta: "bg-rose-100 text-rose-900 border-rose-200",
};

type TarefaRecord = Tables<"tarefas_jovem"> & {
  atribuidaParaNome?: string | null;
  criadaPorNome?: string | null;
};

interface JovemTarefasTabProps {
  jovemId: string;
}

interface StaffOption {
  id: string;
  nome: string;
}

export function JovemTarefasTab({ jovemId }: JovemTarefasTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<TarefaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formPrioridade, setFormPrioridade] = useState<"baixa" | "media" | "alta">("media");
  const [formAtribuida, setFormAtribuida] = useState<string | null>(null);
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const assignedOptions = useMemo(() => [{ id: "none", nome: "Sem responsável" }, ...staff], [staff]);

  const fetchStaff = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .order("nome_completo", { ascending: true });

      if (error) {
        console.error("Erro ao carregar equipe:", error);
        return;
      }

      setStaff(
        (data ?? []).map((profile) => ({
          id: profile.id,
          nome: profile.nome_completo || "Usuário sem nome",
        })),
      );
    } catch (error) {
      console.error("Erro ao buscar equipe:", error);
    }
  }, []);

  const fetchTarefas = useCallback(async () => {
    setLoading(true);
    setPermissionDenied(false);
    try {
      const { data, error } = await supabase
        .from("tarefas_jovem")
        .select("*")
        .eq("jovem_id", jovemId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42501" || /permission denied/i.test(error.message)) {
          setPermissionDenied(true);
          setTarefas([]);
          return;
        }
        throw error;
      }

      const registros = data ?? [];
      const userIds = new Set<string>();
      registros.forEach((item) => {
        if (item.atribuida_para) userIds.add(item.atribuida_para);
        if (item.criada_por) userIds.add(item.criada_por);
      });

      const profilesMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", Array.from(userIds));

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, profile.nome_completo || "Usuário");
        });
      }

      const enriched = registros.map((item) => ({
        ...item,
        atribuidaParaNome: item.atribuida_para ? profilesMap.get(item.atribuida_para) ?? null : null,
        criadaPorNome: item.criada_por ? profilesMap.get(item.criada_por) ?? null : null,
      }));

      setTarefas(enriched);
    } catch (error: any) {
      console.error("Erro ao carregar tarefas:", error);
      toast({
        title: "Erro ao carregar",
        description: error.message || "Não foi possível carregar as tarefas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [jovemId, toast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchTarefas();
  }, [fetchTarefas]);

  async function handleCreateTarefa() {
    if (!formTitulo.trim()) {
      toast({
        title: "Informe um título",
        description: "A tarefa precisa de um título",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("tarefas_jovem").insert({
        jovem_id: jovemId,
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim() || null,
        prioridade: formPrioridade,
        atribuida_para: formAtribuida || null,
        criada_por: user.id,
        due_date: formDueDate || null,
      });

      if (error) throw error;

      setFormTitulo("");
      setFormDescricao("");
      setFormAtribuida(null);
      setFormPrioridade("media");
      setFormDueDate("");
      toast({ title: "Tarefa criada" });
      fetchTarefas();
    } catch (error: any) {
      console.error("Erro ao criar tarefa:", error);
      toast({
        title: "Não foi possível criar",
        description: error.message || "Verifique as informações e tente novamente",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(tarefaId: string, status: Tables<"tarefas_jovem">["status"]) {
    try {
      setUpdatingId(tarefaId);
      const { error } = await supabase
        .from("tarefas_jovem")
        .update({ status })
        .eq("id", tarefaId);
      if (error) throw error;
      toast({ title: "Status atualizado" });
      fetchTarefas();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Falha ao atualizar status",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAssigneeChange(tarefaId: string, userId: string | null) {
    try {
      setUpdatingId(tarefaId);
      const { error } = await supabase
        .from("tarefas_jovem")
        .update({ atribuida_para: userId })
        .eq("id", tarefaId);
      if (error) throw error;
      toast({ title: "Responsável atualizado" });
      fetchTarefas();
    } catch (error: any) {
      console.error("Erro ao atribuir tarefa:", error);
      toast({
        title: "Falha ao atribuir",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const isOverdue = (tarefa: TarefaRecord) => {
    if (!tarefa.due_date) return false;
    if (tarefa.status === "concluida" || tarefa.status === "cancelada") return false;
    const due = new Date(tarefa.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="space-y-6">
      {permissionDenied ? (
        <Alert>
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription>
            Apenas usuários staff podem visualizar e registrar tarefas.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Nova tarefa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Título</label>
                  <Input value={formTitulo} onChange={(e) => setFormTitulo(e.target.value)} placeholder="Ex.: Solicitar documento" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Responsável</label>
                  <Select value={formAtribuida ?? "none"} onValueChange={(value) => setFormAtribuida(value === "none" ? null : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Prioridade</label>
                  <Select value={formPrioridade} onValueChange={(value) => setFormPrioridade(value as typeof formPrioridade)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORIDADE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Prazo</label>
                  <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Descrição</label>
                <Textarea value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} rows={3} placeholder="Detalhes adicionais" />
              </div>
              <Button onClick={handleCreateTarefa} disabled={creating}>
                {creating ? "Salvando..." : "Criar tarefa"}
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Tarefas ({tarefas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Carregando tarefas...</div>
              ) : tarefas.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Nenhuma tarefa cadastrada até o momento.</div>
              ) : (
                <div className="space-y-4">
                  {tarefas.map((tarefa) => (
                    <div key={tarefa.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-base">{tarefa.titulo}</h4>
                          <Badge variant="outline" className={`border ${PRIORIDADE_COLORS[tarefa.prioridade]}`}>
                            {PRIORIDADE_OPTIONS.find((opt) => opt.value === tarefa.prioridade)?.label || tarefa.prioridade}
                          </Badge>
                          {isOverdue(tarefa) && (
                            <Badge variant="destructive" className="text-xs">
                              Atrasada
                            </Badge>
                          )}
                        </div>
                        <Select
                          value={tarefa.status}
                          onValueChange={(value) => handleStatusChange(tarefa.id, value as Tables<"tarefas_jovem">["status"])}
                          disabled={updatingId === tarefa.id}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tarefa.descricao}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <UserCircle className="h-3.5 w-3.5" />
                            Responsável:
                          </div>
                          <Select
                            value={tarefa.atribuida_para ?? "none"}
                            onValueChange={(value) => handleAssigneeChange(tarefa.id, value === "none" ? null : value)}
                            disabled={updatingId === tarefa.id}
                          >
                            <SelectTrigger className="w-[180px] h-7 text-xs">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          Criada em {format(new Date(tarefa.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {tarefa.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            Prazo {format(new Date(tarefa.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex gap-6">
                        {tarefa.criadaPorNome && <span>Criada por {tarefa.criadaPorNome}</span>}
                        {tarefa.atribuidaParaNome && <span>Responsável: {tarefa.atribuidaParaNome}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
