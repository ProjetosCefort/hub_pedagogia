import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Layers3, Users, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMotivosIntervencao } from "@/hooks/useConfiguracoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type TargetType = "turma" | "empresa";

interface TurmaOption {
  id: string;
  nome: string;
  codigo: string;
}

interface EmpresaOption {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
}

interface JovemParticipante {
  id: string;
  nome_completo: string;
  matricula: string | null;
}

interface CollectiveItem {
  id: string;
  tipo_publico: TargetType;
  titulo: string;
  descricao: string;
  motivo_intervencao: string | null;
  data_intervencao: string;
  proximo_agendamento_em: string | null;
  turma?: { nome: string | null; codigo: string | null } | null;
  empresa?: { nome_fantasia: string | null; razao_social: string | null } | null;
  participantes?: Array<{ jovem?: { nome_completo: string | null } | null }> | null;
}

export default function IntervencoesColetivas() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CollectiveItem[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [participants, setParticipants] = useState<JovemParticipante[]>([]);
  const [formData, setFormData] = useState({
    tipo_publico: "turma" as TargetType,
    turma_id: "",
    empresa_id: "",
    titulo: "",
    motivo_intervencao_id: "",
    motivo_intervencao: "",
    descricao: "",
    data_intervencao: new Date().toISOString().slice(0, 16),
    proximo_agendamento_em: "",
  });

  const { data: motivosIntervencao } = useMotivosIntervencao(true, "psicossocial");

  useEffect(() => {
    fetchOptions();
    fetchItems();
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [formData.tipo_publico, formData.turma_id, formData.empresa_id]);

  async function fetchOptions() {
    const [{ data: turmasData }, { data: empresasData }] = await Promise.all([
      supabase.from("turmas").select("id, nome, codigo").order("nome"),
      supabase.from("empresas").select("id, nome_fantasia, razao_social").order("razao_social"),
    ]);

    setTurmas((turmasData || []) as TurmaOption[]);
    setEmpresas((empresasData || []) as EmpresaOption[]);
  }

  async function fetchParticipants() {
    try {
      let query = supabase
        .from("jovens")
        .select("id, nome_completo, matricula")
        .eq("status", "active_apprentice")
        .order("nome_completo");

      if (formData.tipo_publico === "turma" && formData.turma_id) {
        query = query.eq("turma_id", formData.turma_id);
      }

      if (formData.tipo_publico === "empresa" && formData.empresa_id) {
        query = query.eq("empresa_id", formData.empresa_id);
      }

      if (
        (formData.tipo_publico === "turma" && !formData.turma_id) ||
        (formData.tipo_publico === "empresa" && !formData.empresa_id)
      ) {
        setParticipants([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setParticipants((data || []) as JovemParticipante[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar participantes",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  async function fetchItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("intervencoes_coletivas" as any)
        .select(`
          id,
          tipo_publico,
          titulo,
          descricao,
          motivo_intervencao,
          data_intervencao,
          proximo_agendamento_em,
          turma:turmas(nome, codigo),
          empresa:empresas(nome_fantasia, razao_social),
          participantes:intervencoes_coletivas_participantes(
            jovem:jovens(nome_completo)
          )
        `)
        .order("data_intervencao", { ascending: false });

      if (error) throw error;
      setItems((data || []) as CollectiveItem[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar intervencoes coletivas",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const participantLabel = useMemo(() => {
    return `${participants.length} participante(s) encontrado(s) automaticamente`;
  }, [participants.length]);

  async function handleCreate() {
    if (!formData.titulo.trim() || !formData.descricao.trim()) {
      toast({
        title: "Campos obrigatorios",
        description: "Informe titulo e descricao.",
        variant: "destructive",
      });
      return;
    }

    if (participants.length === 0) {
      toast({
        title: "Sem participantes",
        description: "Selecione uma turma ou empresa com jovens ativos vinculados.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const { data: collective, error: collectiveError } = await supabase
        .from("intervencoes_coletivas" as any)
        .insert({
          setor: "psicossocial",
          tipo_publico: formData.tipo_publico,
          turma_id: formData.tipo_publico === "turma" ? formData.turma_id : null,
          empresa_id: formData.tipo_publico === "empresa" ? formData.empresa_id : null,
          titulo: formData.titulo.trim(),
          motivo_intervencao_id: formData.motivo_intervencao_id || null,
          motivo_intervencao: formData.motivo_intervencao || null,
          descricao: formData.descricao.trim(),
          data_intervencao: new Date(formData.data_intervencao).toISOString(),
          proximo_agendamento_em: formData.proximo_agendamento_em
            ? new Date(formData.proximo_agendamento_em).toISOString()
            : null,
          responsavel_id: user?.id || null,
          created_by: user?.id || null,
        })
        .select("id")
        .single();

      if (collectiveError) throw collectiveError;

      const participantRows = participants.map((item) => ({
        intervencao_coletiva_id: collective.id,
        jovem_id: item.id,
      }));

      const { error: participantsError } = await supabase
        .from("intervencoes_coletivas_participantes" as any)
        .insert(participantRows);

      if (participantsError) throw participantsError;

      if (formData.proximo_agendamento_em) {
        await Promise.all(
          participants.map((item) =>
            supabase.from("atendimentos_agendados").insert({
              jovem_id: item.id,
              setor: "psicossocial",
              tipo: "intervencao",
              modalidade: "presencial",
              modelo_agendamento: "acompanhamento",
              titulo: `Retorno coletivo: ${formData.titulo.trim()}`,
              descricao: formData.descricao.trim(),
              agendado_para: new Date(formData.proximo_agendamento_em).toISOString(),
              duracao_minutos: 60,
              responsavel_id: user?.id || null,
              status: "agendado",
              created_by: user?.id || null,
            }),
          ),
        );
      }

      toast({ title: "Intervencao coletiva registrada" });
      setOpen(false);
      setFormData({
        tipo_publico: "turma",
        turma_id: "",
        empresa_id: "",
        titulo: "",
        motivo_intervencao_id: "",
        motivo_intervencao: "",
        descricao: "",
        data_intervencao: new Date().toISOString().slice(0, 16),
        proximo_agendamento_em: "",
      });
      setParticipants([]);
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar intervencao coletiva",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Intervencoes coletivas</h1>
          <p className="page-description">
            Organize acoes por turma teorica ou empresa pratica com lista automatica de participantes.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Layers3 className="mr-2 h-4 w-4" />
              Nova intervencao coletiva
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Nova intervencao coletiva</DialogTitle>
              <DialogDescription>
                Registre uma intervencao por turma ou empresa e gere a lista de participantes automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div>
                <Label>Publico alvo</Label>
                <Select
                  value={formData.tipo_publico}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      tipo_publico: value as TargetType,
                      turma_id: "",
                      empresa_id: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="turma">Turma teorica</SelectItem>
                    <SelectItem value="empresa">Empresa pratica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {formData.tipo_publico === "turma" ? (
                  <>
                    <Label>Turma</Label>
                    <Select
                      value={formData.turma_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, turma_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label>Empresa</Label>
                    <Select
                      value={formData.empresa_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, empresa_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nome_fantasia || item.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label>Titulo</Label>
                <Input
                  value={formData.titulo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, titulo: event.target.value }))}
                  placeholder="Ex.: Roda de conversa sobre convivencia"
                />
              </div>
              <div>
                <Label>Motivo padrao</Label>
                <Select
                  value={formData.motivo_intervencao_id || "__none__"}
                  onValueChange={(value) => {
                    const selected = motivosIntervencao?.find((item) => item.id === value);
                    setFormData((prev) => ({
                      ...prev,
                      motivo_intervencao_id: value === "__none__" ? "" : value,
                      motivo_intervencao: value === "__none__" ? "" : selected?.nome || "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem motivo predefinido</SelectItem>
                    {(motivosIntervencao || []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data da intervencao</Label>
                <Input
                  type="datetime-local"
                  value={formData.data_intervencao}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, data_intervencao: event.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Descricao</Label>
                <Textarea
                  rows={4}
                  value={formData.descricao}
                  onChange={(event) => setFormData((prev) => ({ ...prev, descricao: event.target.value }))}
                  placeholder="Contexto, objetivos, encaminhamentos e observacoes da acao coletiva."
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Proximo agendamento coletivo</Label>
                <Input
                  type="datetime-local"
                  value={formData.proximo_agendamento_em}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      proximo_agendamento_em: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">{participantLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A lista eh montada com jovens ativos vinculados a turma ou empresa selecionada.
                </p>
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                  {participants.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                      <span>{item.nome_completo}</span>
                      <span className="text-muted-foreground">{item.matricula || "Sem matricula"}</span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum participante localizado ainda.</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Salvando..." : "Registrar intervencao"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Intervencoes registradas</CardDescription>
            <CardTitle className="text-2xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Por turma teorica</CardDescription>
            <CardTitle className="text-2xl">
              {items.filter((item) => item.tipo_publico === "turma").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Por empresa pratica</CardDescription>
            <CardTitle className="text-2xl">
              {items.filter((item) => item.tipo_publico === "empresa").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base">Historico coletivo</CardTitle>
          <CardDescription>
            Consulte o publico atendido e os proximos retornos planejados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando intervencoes coletivas...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhuma intervencao coletiva registrada.</div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{item.titulo}</p>
                        <Badge variant="secondary">
                          {item.tipo_publico === "turma" ? "Turma teorica" : "Empresa pratica"}
                        </Badge>
                        {item.motivo_intervencao && (
                          <Badge variant="outline">{item.motivo_intervencao}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {item.descricao}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          {item.tipo_publico === "turma" ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                          {item.tipo_publico === "turma"
                            ? item.turma?.nome || "Turma nao identificada"
                            : item.empresa?.nome_fantasia || item.empresa?.razao_social || "Empresa nao identificada"}
                        </span>
                        <span>
                          {item.participantes?.length || 0} participante(s)
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground md:text-right">
                      <p>
                        Realizada em{" "}
                        {format(new Date(item.data_intervencao), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {item.proximo_agendamento_em && (
                        <p className="mt-2 inline-flex items-center gap-1">
                          <CalendarPlus className="h-4 w-4" />
                          Proximo retorno em{" "}
                          {format(new Date(item.proximo_agendamento_em), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.participantes && item.participantes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.participantes.slice(0, 8).map((participant, index) => (
                        <Badge key={`${item.id}-${index}`} variant="outline">
                          {participant.jovem?.nome_completo || "Jovem"}
                        </Badge>
                      ))}
                      {item.participantes.length > 8 && (
                        <Badge variant="outline">+{item.participantes.length - 8} participantes</Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
