import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRightLeft,
  CalendarPlus,
  Loader2,
  Plus,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Setor = "pedagogico" | "psicossocial" | "servico_social";
type StatusSolicitacao =
  | "aberta"
  | "em_andamento"
  | "respondida"
  | "concluida"
  | "cancelada";

interface JovemOption {
  id: string;
  nome_completo: string;
}

interface SolicitacaoRecord {
  id: string;
  jovem_id: string;
  setor_origem: Setor;
  setor_destino: Setor;
  titulo: string;
  descricao: string;
  prioridade: "baixa" | "media" | "alta";
  status: StatusSolicitacao;
  prazo_resposta: string | null;
  devolutiva: string | null;
  solicitada_por: string | null;
  respondida_por: string | null;
  responded_at: string | null;
  created_at: string;
  atendimento_agendado_id?: string | null;
  agendamento_criado_em?: string | null;
  jovem?: { nome_completo: string | null } | null;
  solicitadaPorNome?: string | null;
  respondidaPorNome?: string | null;
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

const SETOR_OPTIONS: Array<{ value: Setor; label: string }> = [
  { value: "pedagogico", label: "Pedagógico" },
  { value: "psicossocial", label: "Psicossocial" },
  { value: "servico_social", label: "Serviço Social" },
];

const STATUS_OPTIONS: Array<{ value: StatusSolicitacao; label: string }> = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "respondida", label: "Respondida" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const PRIORIDADE_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;

function roleToSetor(role: string): Setor | null {
  if (role === "analista_pedagogico") return "pedagogico";
  if (role === "analista_psicossocial") return "psicossocial";
  if (role === "analista_social") return "servico_social";
  return null;
}

function setorLabel(setor: string) {
  return SETOR_OPTIONS.find((item) => item.value === setor)?.label || setor;
}

function canScheduleFromSetor(setor: Setor) {
  return setor === "psicossocial" || setor === "servico_social";
}

function buildScheduleDefaults(item: SolicitacaoRecord): ScheduleFormState {
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

export default function SolicitacoesSetoriais() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [jovens, setJovens] = useState<JovemOption[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRecord[]>([]);
  const [selectedSolicitacao, setSelectedSolicitacao] =
    useState<SolicitacaoRecord | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusSolicitacao | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "incoming" | "outgoing">("all");
  const [formData, setFormData] = useState({
    jovem_id: "",
    setor_origem: "pedagogico" as Setor,
    setor_destino: "psicossocial" as Setor,
    titulo: "",
    descricao: "",
    prioridade: "media" as "baixa" | "media" | "alta",
    prazo_resposta: "",
  });
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  const availableSetores = useMemo(() => {
    const setores = roles.map(roleToSetor).filter(Boolean) as Setor[];
    return Array.from(new Set(setores));
  }, [roles]);
  const canViewAll = roles.includes("admin") || roles.includes("gestor");

  useEffect(() => {
    if (availableSetores.length > 0) {
      setFormData((prev) => ({
        ...prev,
        setor_origem: availableSetores[0],
        setor_destino:
          availableSetores.find((setor) => setor !== availableSetores[0]) ||
          (availableSetores[0] === "pedagogico" ? "psicossocial" : "pedagogico"),
      }));
    }
  }, [availableSetores]);

  useEffect(() => {
    fetchJovens();
    fetchSolicitacoes();
  }, []);

  async function fetchJovens() {
    const { data, error } = await supabase
      .from("jovens")
      .select("id, nome_completo")
      .order("nome_completo");

    if (error) {
      console.error("Erro ao carregar jovens:", error);
      return;
    }

    setJovens((data || []) as JovemOption[]);
  }

  async function fetchSolicitacoes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("solicitacoes_setoriais" as any)
        .select(
          `
            id,
            jovem_id,
            setor_origem,
            setor_destino,
            titulo,
            descricao,
            prioridade,
            status,
            prazo_resposta,
            devolutiva,
            solicitada_por,
            respondida_por,
            responded_at,
            created_at,
            atendimento_agendado_id,
            agendamento_criado_em,
            jovem:jovens(nome_completo)
          `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as SolicitacaoRecord[];
      const userIds = Array.from(
        new Set(
          rows.flatMap((item) =>
            [item.solicitada_por, item.respondida_por].filter(Boolean) as string[],
          ),
        ),
      );

      const profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", userIds);

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, profile.nome_completo || "Usuário");
        });
      }

      const filtered = rows
        .filter((item) => {
          if (canViewAll) return true;
          return (
            availableSetores.includes(item.setor_origem) ||
            availableSetores.includes(item.setor_destino)
          );
        })
        .map((item) => ({
          ...item,
          solicitadaPorNome: item.solicitada_por
            ? profilesMap.get(item.solicitada_por) || null
            : null,
          respondidaPorNome: item.respondida_por
            ? profilesMap.get(item.respondida_por) || null
            : null,
        }));

      setSolicitacoes(filtered);
    } catch (error: any) {
      console.error("Erro ao carregar solicitações:", error);
      toast({
        title: "Erro ao carregar solicitações",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.jovem_id || !formData.titulo.trim() || !formData.descricao.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha jovem, título e descrição.",
        variant: "destructive",
      });
      return;
    }

    if (formData.setor_origem === formData.setor_destino) {
      toast({
        title: "Setores inválidos",
        description: "Origem e destino precisam ser diferentes.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("solicitacoes_setoriais" as any).insert({
        ...formData,
        prazo_resposta: formData.prazo_resposta || null,
        solicitada_por: user?.id || null,
      });

      if (error) throw error;

      toast({ title: "Solicitação criada" });
      setOpen(false);
      setFormData((prev) => ({
        ...prev,
        jovem_id: "",
        titulo: "",
        descricao: "",
        prioridade: "media",
        prazo_resposta: "",
      }));
      fetchSolicitacoes();
    } catch (error: any) {
      toast({
        title: "Erro ao criar solicitação",
        description: error.message || "Não foi possível salvar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
      fetchSolicitacoes();
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
      fetchSolicitacoes();
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

  function openScheduleDialog(item: SolicitacaoRecord) {
    setSelectedSolicitacao(item);
    setScheduleForm(buildScheduleDefaults(item));
    setScheduleOpen(true);
  }

  async function handleCreateSchedule() {
    if (!selectedSolicitacao || !scheduleForm) return;

    if (!scheduleForm.agendado_para || !scheduleForm.titulo.trim()) {
      toast({
        title: "Campos obrigatorios",
        description: "Informe data, hora e titulo do atendimento.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(selectedSolicitacao.id);

      const { data: atendimento, error: atendimentoError } = await supabase
        .from("atendimentos_agendados")
        .insert({
          jovem_id: selectedSolicitacao.jovem_id,
          setor:
            selectedSolicitacao.setor_destino === "servico_social"
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
          status:
            selectedSolicitacao.status === "aberta"
              ? "em_andamento"
              : selectedSolicitacao.status,
        })
        .eq("id", selectedSolicitacao.id);

      if (solicitacaoError) throw solicitacaoError;

      toast({ title: "Agendamento criado com sucesso" });
      setScheduleOpen(false);
      setSelectedSolicitacao(null);
      setScheduleForm(null);
      fetchSolicitacoes();
    } catch (error: any) {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Nao foi possivel criar o atendimento.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredSolicitacoes = solicitacoes.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (scopeFilter === "incoming" && !availableSetores.includes(item.setor_destino)) return false;
    if (scopeFilter === "outgoing" && !availableSetores.includes(item.setor_origem)) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Solicitações entre setores</h1>
          <p className="page-description">
            Gerencie solicitações internas, acompanhamento requerido e devolutivas.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova solicitação entre setores</DialogTitle>
              <DialogDescription>
                Crie uma solicitação vinculada ao jovem e envie para o setor responsável.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Jovem</Label>
                <Select
                  value={formData.jovem_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, jovem_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o jovem" />
                  </SelectTrigger>
                  <SelectContent>
                    {jovens.map((jovem) => (
                      <SelectItem key={jovem.id} value={jovem.id}>
                        {jovem.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Setor de origem</Label>
                <Select
                  value={formData.setor_origem}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, setor_origem: value as Setor }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SETOR_OPTIONS.filter(
                      (option) => canViewAll || availableSetores.includes(option.value),
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Setor de destino</Label>
                <Select
                  value={formData.setor_destino}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, setor_destino: value as Setor }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SETOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, titulo: event.target.value }))
                  }
                  placeholder="Ex.: Solicitação de acompanhamento emocional"
                />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      prioridade: value as "baixa" | "media" | "alta",
                    }))
                  }
                >
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
              <div>
                <Label>Prazo para retorno</Label>
                <Input
                  type="date"
                  value={formData.prazo_resposta}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, prazo_resposta: event.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Descrição da solicitação</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, descricao: event.target.value }))
                  }
                  rows={5}
                  placeholder="Descreva a demanda, o contexto e o que o outro setor precisa fazer."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Salvando..." : "Criar solicitação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={scheduleOpen}
        onOpenChange={(value) => {
          setScheduleOpen(value);
          if (!value) {
            setSelectedSolicitacao(null);
            setScheduleForm(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agendar atendimento</DialogTitle>
            <DialogDescription>
              Crie um atendimento vinculado a esta solicitacao para o setor de destino.
            </DialogDescription>
          </DialogHeader>
          {selectedSolicitacao && scheduleForm && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{selectedSolicitacao.titulo}</div>
                <div className="text-muted-foreground">
                  Destino: {setorLabel(selectedSolicitacao.setor_destino)}
                </div>
              </div>
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
                      prev
                        ? { ...prev, tipo: value as ScheduleFormState["tipo"] }
                        : prev,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSolicitacao.setor_destino === "servico_social" ? (
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
              <div>
                <Label>Modalidade</Label>
                <Select
                  value={scheduleForm.modalidade}
                  onValueChange={(value) =>
                    setScheduleForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            modalidade: value as ScheduleFormState["modalidade"],
                          }
                        : prev,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="remoto">Remoto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modelo</Label>
                <Select
                  value={scheduleForm.modelo_agendamento}
                  onValueChange={(value) =>
                    setScheduleForm((prev) =>
                      prev ? { ...prev, modelo_agendamento: value } : prev,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avaliacao_inicial">Avaliacao inicial</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="orientacao_familiar">Orientacao familiar</SelectItem>
                    <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
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
                  placeholder="Sala, unidade ou endereco"
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
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Descricao</Label>
                <Textarea
                  rows={4}
                  value={scheduleForm.descricao}
                  onChange={(event) =>
                    setScheduleForm((prev) =>
                      prev ? { ...prev, descricao: event.target.value } : prev,
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
              disabled={!selectedSolicitacao || updatingId === selectedSolicitacao?.id}
            >
              Criar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4" />
            Solicitações
          </CardTitle>
          <CardDescription>
            Acompanhe solicitações abertas, respostas e devolutivas entre os setores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as typeof scopeFilter)}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="incoming">Recebidas pelo meu setor</SelectItem>
                <SelectItem value="outgoing">Enviadas pelo meu setor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Carregando solicitações...
            </div>
          ) : filteredSolicitacoes.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhuma solicitação encontrada para os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jovem</TableHead>
                  <TableHead>Fluxo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Devolutiva</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolicitacoes.map((item) => (
                  <TableRow key={item.id} className="align-top">
                    <TableCell>
                      <div className="font-medium">{item.jovem?.nome_completo || "—"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.titulo}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        {item.descricao}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {setorLabel(item.setor_origem)} → {setorLabel(item.setor_destino)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Criada em{" "}
                        {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {item.solicitadaPorNome && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Solicitante: {item.solicitadaPorNome}
                        </div>
                      )}
                      {item.respondidaPorNome && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Respondeu: {item.respondidaPorNome}
                        </div>
                      )}
                      {item.agendamento_criado_em && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Agendamento vinculado em{" "}
                          {format(new Date(item.agendamento_criado_em), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.prioridade}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(value) =>
                          handleStatusChange(item.id, value as StatusSolicitacao)
                        }
                        disabled={updatingId === item.id}
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
                    </TableCell>
                    <TableCell>
                      {item.prazo_resposta
                        ? format(new Date(item.prazo_resposta), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="min-w-[280px]">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
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
                          ) : (
                            <Badge variant="outline">
                              Agendamento nao disponivel para este setor
                            </Badge>
                          )}
                        </div>
                        {item.devolutiva ? (
                          <div className="rounded-md border bg-muted/30 p-2 text-sm">
                            {item.devolutiva}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Sem devolutiva registrada.
                          </div>
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
                          placeholder="Registrar devolutiva ao setor solicitante..."
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSubmitResponse(item.id)}
                          disabled={updatingId === item.id}
                        >
                          Salvar devolutiva
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
