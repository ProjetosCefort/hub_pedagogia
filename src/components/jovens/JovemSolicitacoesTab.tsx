import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRightLeft,
  CalendarPlus,
  Loader2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type StatusSolicitacao =
  | "aberta"
  | "em_andamento"
  | "respondida"
  | "concluida"
  | "cancelada";

interface SolicitacaoItem {
  id: string;
  setor_origem: string;
  setor_destino: string;
  titulo: string;
  descricao: string;
  prioridade: "baixa" | "media" | "alta";
  status: StatusSolicitacao;
  prazo_resposta: string | null;
  devolutiva: string | null;
  created_at: string;
  responded_at: string | null;
  atendimento_agendado_id?: string | null;
  agendamento_criado_em?: string | null;
}

interface ScheduleFormState {
  agendado_para: string;
  tipo:
    | "intervencao"
    | "avaliacao_pedagogica"
    | "avaliacao_socioeconomica"
    | "encaminhamento";
  modalidade: "presencial" | "remoto";
  local_atendimento: string;
  link_atendimento: string;
  modelo_agendamento: string;
  titulo: string;
  descricao: string;
}

interface JovemSolicitacoesTabProps {
  jovemId: string;
}

function setorLabel(setor: string) {
  switch (setor) {
    case "pedagogico":
      return "Pedagógico";
    case "psicossocial":
      return "Psicossocial";
    case "servico_social":
      return "Serviço Social";
    default:
      return setor;
  }
}

function canScheduleFromSetor(setor: string) {
  return setor === "psicossocial" || setor === "servico_social";
}

function buildScheduleDefaults(item: SolicitacaoItem): ScheduleFormState {
  const agendadoPara = new Date();
  agendadoPara.setMinutes(agendadoPara.getMinutes() + 60);

  return {
    agendado_para: agendadoPara.toISOString().slice(0, 16),
    tipo:
      item.setor_destino === "servico_social"
        ? "avaliacao_socioeconomica"
        : "intervencao",
    modalidade: "presencial",
    local_atendimento: "",
    link_atendimento: "",
    modelo_agendamento: "acompanhamento",
    titulo: item.titulo,
    descricao: item.descricao,
  };
}

export function JovemSolicitacoesTab({ jovemId }: JovemSolicitacoesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusSolicitacao | "all">("all");
  const [items, setItems] = useState<SolicitacaoItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SolicitacaoItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchItems();
  }, [jovemId]);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("solicitacoes_setoriais" as any)
        .select(
          "id, setor_origem, setor_destino, titulo, descricao, prioridade, status, prazo_resposta, devolutiva, created_at, responded_at, atendimento_agendado_id, agendamento_criado_em",
        )
        .eq("jovem_id", jovemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data || []) as SolicitacaoItem[]);
    } catch (error: any) {
      console.error("Erro ao carregar solicitações do jovem:", error);
      toast({
        title: "Erro ao carregar solicitações",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: StatusSolicitacao) {
    try {
      setUpdatingId(id);
      const payload: Record<string, unknown> = { status };
      if (status === "respondida" || status === "concluida") {
        payload.respondida_por = user?.id || null;
        payload.responded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("solicitacoes_setoriais" as any)
        .update(payload)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Status atualizado" });
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSubmitResponse(id: string) {
    const devolutiva = responseDrafts[id]?.trim();
    if (!devolutiva) {
      toast({
        title: "Informe a devolutiva",
        description: "A devolutiva não pode ficar vazia.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(id);
      const { error } = await supabase
        .from("solicitacoes_setoriais" as any)
        .update({
          devolutiva,
          status: "respondida",
          respondida_por: user?.id || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Devolutiva registrada" });
      setResponseDrafts((prev) => ({ ...prev, [id]: "" }));
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar devolutiva",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  function openScheduleDialog(item: SolicitacaoItem) {
    setSelectedItem(item);
    setScheduleForm(buildScheduleDefaults(item));
    setScheduleOpen(true);
  }

  async function handleCreateSchedule() {
    if (!selectedItem || !scheduleForm) return;

    if (!scheduleForm.agendado_para || !scheduleForm.titulo.trim()) {
      toast({
        title: "Campos obrigatorios",
        description: "Informe data, hora e titulo do atendimento.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(selectedItem.id);

      const { data: atendimento, error: atendimentoError } = await supabase
        .from("atendimentos_agendados")
        .insert({
          jovem_id: jovemId,
          setor:
            selectedItem.setor_destino === "servico_social"
              ? "servico_social"
              : "psicossocial",
          tipo: scheduleForm.tipo,
          modalidade: scheduleForm.modalidade,
          local_atendimento: scheduleForm.local_atendimento || null,
          link_atendimento: scheduleForm.link_atendimento || null,
          modelo_agendamento: scheduleForm.modelo_agendamento || null,
          titulo: scheduleForm.titulo.trim(),
          descricao: scheduleForm.descricao.trim() || null,
          agendado_para: new Date(scheduleForm.agendado_para).toISOString(),
          duracao_minutos: 60,
          responsavel_id: user?.id || null,
          status: "agendado",
          created_by: user?.id || null,
        })
        .select("id")
        .single();

      if (atendimentoError) throw atendimentoError;

      const { error: solicitacaoError } = await supabase
        .from("solicitacoes_setoriais" as any)
        .update({
          atendimento_agendado_id: atendimento.id,
          agendamento_criado_em: new Date().toISOString(),
          status: selectedItem.status === "aberta" ? "em_andamento" : selectedItem.status,
        })
        .eq("id", selectedItem.id);

      if (solicitacaoError) throw solicitacaoError;

      toast({ title: "Agendamento criado com sucesso" });
      setScheduleOpen(false);
      setSelectedItem(null);
      setScheduleForm(null);
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Solicitações entre setores
          </CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="respondida">Respondida</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link to="/solicitacoes">Abrir módulo completo</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <Dialog
        open={scheduleOpen}
        onOpenChange={(value) => {
          setScheduleOpen(value);
          if (!value) {
            setSelectedItem(null);
            setScheduleForm(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agendar atendimento</DialogTitle>
            <DialogDescription>
              Vincule um atendimento a esta solicitacao.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && scheduleForm && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div>
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={scheduleForm.agendado_para}
                  onChange={(event) =>
                    setScheduleForm((prev) =>
                      prev ? { ...prev, agendado_para: event.target.value } : prev,
                    )
                  }
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={scheduleForm.tipo}
                  onValueChange={(value) =>
                    setScheduleForm((prev) =>
                      prev ? { ...prev, tipo: value as ScheduleFormState["tipo"] } : prev,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedItem.setor_destino === "servico_social" ? (
                      <>
                        <SelectItem value="avaliacao_socioeconomica">
                          Avaliacao socioeconomica
                        </SelectItem>
                        <SelectItem value="encaminhamento">Encaminhamento</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="intervencao">Intervencao</SelectItem>
                        <SelectItem value="avaliacao_pedagogica">
                          Avaliacao pedagogica
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Titulo</Label>
                <Input
                  value={scheduleForm.titulo}
                  onChange={(event) =>
                    setScheduleForm((prev) =>
                      prev ? { ...prev, titulo: event.target.value } : prev,
                    )
                  }
                />
              </div>
              <div>
                <Label>Local</Label>
                <Input
                  value={scheduleForm.local_atendimento}
                  onChange={(event) =>
                    setScheduleForm((prev) =>
                      prev
                        ? { ...prev, local_atendimento: event.target.value }
                        : prev,
                    )
                  }
                />
              </div>
              <div>
                <Label>Link remoto</Label>
                <Input
                  value={scheduleForm.link_atendimento}
                  onChange={(event) =>
                    setScheduleForm((prev) =>
                      prev ? { ...prev, link_atendimento: event.target.value } : prev,
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSchedule}
              disabled={!selectedItem || updatingId === selectedItem?.id}
            >
              Criar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Carregando solicitações...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            Nenhuma solicitação registrada para este jovem.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{item.titulo}</p>
                      <Badge variant="outline">{item.prioridade}</Badge>
                      <Badge variant="secondary">{item.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {setorLabel(item.setor_origem)} → {setorLabel(item.setor_destino)}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                      {item.descricao}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 md:text-right">
                    <p>
                      Criada em{" "}
                      {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {item.prazo_resposta && (
                      <p>
                        Prazo:{" "}
                        {format(new Date(item.prazo_resposta), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                    {item.responded_at && (
                      <p>
                        Respondida em{" "}
                        {format(new Date(item.responded_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                    {item.agendamento_criado_em && (
                      <p>
                        Agendada em{" "}
                        {format(new Date(item.agendamento_criado_em), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Select
                    value={item.status}
                    onValueChange={(value) => handleStatusChange(item.id, value as StatusSolicitacao)}
                    disabled={updatingId === item.id}
                  >
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="respondida">Respondida</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  {item.atendimento_agendado_id ? (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to={
                          item.setor_destino === "servico_social"
                            ? `/servico-social/agenda/${item.atendimento_agendado_id}/editar`
                            : `/psicossocial/agenda/${item.atendimento_agendado_id}/editar`
                        }
                      >
                        <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                        Abrir agendamento
                      </Link>
                    </Button>
                  ) : canScheduleFromSetor(item.setor_destino) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openScheduleDialog(item)}
                      disabled={updatingId === item.id}
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Agendar atendimento
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {item.devolutiva ? (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      {item.devolutiva}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem devolutiva registrada.
                    </p>
                  )}
                  <Textarea
                    value={responseDrafts[item.id] ?? ""}
                    onChange={(event) =>
                      setResponseDrafts((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Registrar devolutiva para esta solicitação..."
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSubmitResponse(item.id)}
                    disabled={updatingId === item.id}
                  >
                    Salvar devolutiva
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
