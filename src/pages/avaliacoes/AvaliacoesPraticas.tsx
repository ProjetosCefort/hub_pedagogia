import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Factory, Link2, Mail, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendPracticalEvaluationEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type PracticalStatus =
  | "solicitada"
  | "respondida"
  | "validada"
  | "atrasada"
  | "cancelada";

type CompetencyRating = "excelente" | "bom" | "regular" | "insuficiente";

interface JovemOption {
  id: string;
  nome_completo: string;
  empresa_id: string | null;
  data_admissao: string | null;
  empresa?: { nome_fantasia: string | null; razao_social: string | null } | null;
  turma?: {
    nome: string | null;
    curso?: { nome: string | null } | null;
  } | null;
}

interface EmpresaOption {
  id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
}

interface PracticalEvaluation {
  id: string;
  status: PracticalStatus;
  data_solicitacao: string;
  data_resposta: string | null;
  data_validacao: string | null;
  proxima_data_envio: string | null;
  avaliador_nome: string | null;
  avaliador_email: string | null;
  parecer_empresa: string | null;
  parecer_interno: string | null;
  observacoes: string | null;
  resumo_atividades: string | null;
  manteve_turno_contrato: boolean | null;
  justificativa_turno: string | null;
  competencia_comunicacao: CompetencyRating | null;
  competencia_trabalho_equipe: CompetencyRating | null;
  competencia_proatividade: CompetencyRating | null;
  competencia_responsabilidade: CompetencyRating | null;
  competencia_assiduidade: CompetencyRating | null;
  pontos_fortes: string | null;
  pontos_melhoria: string | null;
  feedback_fornecido: boolean | null;
  quantidade_feedbacks: number | null;
  medidas_disciplinares: boolean | null;
  quantidade_medidas_disciplinares: number | null;
  motivos_medidas_disciplinares: string | null;
  jovem?: {
    nome_completo: string | null;
    data_admissao: string | null;
    turma?: {
      nome: string | null;
      curso?: { nome: string | null } | null;
    } | null;
  } | null;
  empresa?: { nome_fantasia: string | null; razao_social: string | null } | null;
}

const STATUS_OPTIONS: Array<{ value: PracticalStatus; label: string }> = [
  { value: "solicitada", label: "Solicitada" },
  { value: "respondida", label: "Respondida" },
  { value: "validada", label: "Validada" },
  { value: "atrasada", label: "Atrasada" },
  { value: "cancelada", label: "Cancelada" },
];

const RATING_OPTIONS: Array<{ value: CompetencyRating; label: string }> = [
  { value: "excelente", label: "Excelente" },
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "insuficiente", label: "Insuficiente" },
];

const COMPETENCY_FIELDS: Array<{
  key: keyof Pick<
    PracticalEvaluation,
    | "competencia_comunicacao"
    | "competencia_trabalho_equipe"
    | "competencia_proatividade"
    | "competencia_responsabilidade"
    | "competencia_assiduidade"
  >;
  label: string;
}> = [
  { key: "competencia_comunicacao", label: "Comunicação" },
  { key: "competencia_trabalho_equipe", label: "Trabalho em equipe" },
  { key: "competencia_proatividade", label: "Proatividade" },
  { key: "competencia_responsabilidade", label: "Responsabilidade" },
  { key: "competencia_assiduidade", label: "Assiduidade" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const CREATE_LINK_URL =
  SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/create-practical-evaluation-link";

function resolvePracticalStatus(item: Pick<PracticalEvaluation, "status" | "proxima_data_envio" | "data_validacao" | "data_resposta" | "parecer_empresa">): PracticalStatus {
  if (item.status === "cancelada") return "cancelada";
  if (item.data_validacao) return "validada";
  if (item.proxima_data_envio && item.proxima_data_envio < new Date().toISOString().slice(0, 10)) {
    return "atrasada";
  }
  if (item.data_resposta || item.parecer_empresa?.trim()) return "respondida";
  return "solicitada";
}

export default function AvaliacoesPraticas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PracticalStatus | "all">("all");
  const [jovens, setJovens] = useState<JovemOption[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [items, setItems] = useState<PracticalEvaluation[]>([]);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [internalDrafts, setInternalDrafts] = useState<Record<string, string>>({});
  const [nextDateDrafts, setNextDateDrafts] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    jovem_id: "",
    empresa_id: "",
    avaliador_nome: "",
    avaliador_email: "",
    observacoes: "",
    proxima_data_envio: "",
  });

  useEffect(() => {
    fetchJovens();
    fetchEmpresas();
    fetchItems();
  }, []);

  async function fetchJovens() {
    const { data, error } = await supabase
      .from("jovens")
      .select(`
        id,
        nome_completo,
        empresa_id,
        data_admissao,
        empresa:empresas!jovens_empresa_id_fkey(nome_fantasia, razao_social),
        turma:turmas(
          nome,
          curso:cursos(nome)
        )
      `)
      .order("nome_completo");

    if (error) {
      toast({
        title: "Erro ao carregar jovens",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setJovens((data || []) as unknown as JovemOption[]);
  }

  async function fetchEmpresas() {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nome_fantasia, razao_social")
      .order("nome_fantasia", { ascending: true, nullsFirst: false });

    if (error) {
      toast({
        title: "Erro ao carregar empresas",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setEmpresas((data || []) as EmpresaOption[]);
  }

  async function fetchItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("avaliacoes_praticas" as any)
        .select(`
          id,
          status,
          data_solicitacao,
          data_resposta,
          data_validacao,
          proxima_data_envio,
          avaliador_nome,
          avaliador_email,
          parecer_empresa,
          parecer_interno,
          observacoes,
          resumo_atividades,
          manteve_turno_contrato,
          justificativa_turno,
          competencia_comunicacao,
          competencia_trabalho_equipe,
          competencia_proatividade,
          competencia_responsabilidade,
          competencia_assiduidade,
          pontos_fortes,
          pontos_melhoria,
          feedback_fornecido,
          quantidade_feedbacks,
          medidas_disciplinares,
          quantidade_medidas_disciplinares,
          motivos_medidas_disciplinares,
          jovem:jovens(
            nome_completo,
            data_admissao,
            turma:turmas(
              nome,
              curso:cursos(nome)
            )
          ),
          empresa:empresas(nome_fantasia, razao_social)
        `)
        .order("data_solicitacao", { ascending: false });

      if (error) throw error;
      setItems((data || []) as PracticalEvaluation[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar avaliacoes praticas",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.jovem_id || !formData.empresa_id) {
      toast({
        title: "Campos obrigatorios",
        description: "Selecione jovem e empresa.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from("avaliacoes_praticas" as any).insert({
        jovem_id: formData.jovem_id,
        empresa_id: formData.empresa_id,
        avaliador_nome: formData.avaliador_nome || null,
        avaliador_email: formData.avaliador_email || null,
        observacoes: formData.observacoes || null,
        proxima_data_envio: formData.proxima_data_envio || null,
        created_by: user?.id || null,
        responsavel_id: user?.id || null,
        status: "solicitada",
      });

      if (error) throw error;

      toast({ title: "Avaliacao pratica criada" });
      setOpen(false);
      setFormData({
        jovem_id: "",
        empresa_id: "",
        avaliador_nome: "",
        avaliador_email: "",
        observacoes: "",
        proxima_data_envio: "",
      });
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao criar avaliacao",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterResponse(item: PracticalEvaluation) {
    const parecerEmpresa = responseDrafts[item.id]?.trim();
    if (!parecerEmpresa) {
      toast({
        title: "Informe a resposta da empresa",
        description: "O parecer da empresa nao pode ficar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(item.id);
      const { error } = await supabase
        .from("avaliacoes_praticas" as any)
        .update({
          parecer_empresa: parecerEmpresa,
          status: "respondida",
          data_resposta: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      toast({ title: "Resposta da empresa registrada" });
      setResponseDrafts((prev) => ({ ...prev, [item.id]: "" }));
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar resposta",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleValidate(item: PracticalEvaluation) {
    const parecerInterno = internalDrafts[item.id]?.trim();
    const proximaDataEnvio = nextDateDrafts[item.id]?.trim() || null;

    if (!parecerInterno) {
      toast({
        title: "Informe o parecer interno",
        description: "A validacao interna nao pode ficar vazia.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(item.id);
      const { error } = await supabase
        .from("avaliacoes_praticas" as any)
        .update({
          parecer_interno: parecerInterno,
          proxima_data_envio: proximaDataEnvio,
          status: "validada",
          data_validacao: new Date().toISOString(),
          responsavel_id: user?.id || null,
        })
        .eq("id", item.id);

      if (error) throw error;
      toast({ title: "Avaliacao validada" });
      setInternalDrafts((prev) => ({ ...prev, [item.id]: "" }));
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao validar avaliacao",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleGenerateLink(item: PracticalEvaluation) {
    return generatePracticalEvaluationLink(item.id);
  }

  async function generatePracticalEvaluationLink(avaliacaoId: string): Promise<string> {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    const res = await fetch(CREATE_LINK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLIC_KEY,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ avaliacao_id: avaliacaoId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.public_url) {
      throw new Error(data?.error || "Nao foi possivel gerar o link.");
    }

    return data.public_url as string;
  }

  async function handleSendEmail(item: PracticalEvaluation) {
    try {
      setEmailingId(item.id);
      if (!item.avaliador_email) {
        throw new Error("Cadastre o e-mail do avaliador antes do envio.");
      }

      const publicUrl = await generatePracticalEvaluationLink(item.id);
      const ok = await sendPracticalEvaluationEmail({
        email: item.avaliador_email,
        nome: item.avaliador_nome || "Responsavel",
        jovem: item.jovem?.nome_completo || "Jovem",
        empresa:
          item.empresa?.nome_fantasia ||
          item.empresa?.razao_social ||
          "Empresa",
        link: publicUrl,
        prazo: item.proxima_data_envio
          ? format(new Date(item.proxima_data_envio), "dd/MM/yyyy", { locale: ptBR })
          : "",
        observacoes: item.observacoes || "",
      });

      if (!ok) {
        throw new Error("Nao foi possivel enviar o e-mail.");
      }

      toast({
        title: "E-mail enviado",
        description: "A ficha de avaliacao pratica foi enviada para a empresa.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEmailingId(null);
    }
  }

  async function handleCopyLink(item: PracticalEvaluation) {
    try {
      setLinkingId(item.id);
      const publicUrl = await generatePracticalEvaluationLink(item.id);
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copiado",
        description:
          "O link publico da avaliacao pratica foi copiado para a area de transferencia.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar link",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLinkingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => resolvePracticalStatus(item) === statusFilter);
  }, [items, statusFilter]);

  const selectedJovem = jovens.find((item) => item.id === formData.jovem_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Avaliacoes praticas</h1>
          <p className="page-description">
            Controle o envio da ficha para a empresa, a resposta recebida e a validacao interna.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova avaliacao pratica
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova avaliacao pratica</DialogTitle>
              <DialogDescription>
                Gere a ficha de desempenho pratico para preenchimento pela empresa.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Jovem</Label>
                <Select
                  value={formData.jovem_id}
                  onValueChange={(value) => {
                    const jovem = jovens.find((item) => item.id === value);
                    setFormData((prev) => ({
                      ...prev,
                      jovem_id: value,
                      empresa_id: jovem?.empresa_id || "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o jovem" />
                  </SelectTrigger>
                  <SelectContent>
                    {jovens.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedJovem && (
                <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Identificação automática da ficha</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <InfoLine
                      label="Aprendiz"
                      value={selectedJovem.nome_completo}
                    />
                    <InfoLine
                      label="Início do contrato"
                      value={formatDateDisplay(selectedJovem.data_admissao)}
                    />
                    <InfoLine
                      label="Curso"
                      value={getCursoNome(selectedJovem)}
                    />
                    <InfoLine
                      label="Empresa"
                      value={
                        selectedJovem.empresa?.nome_fantasia ||
                        selectedJovem.empresa?.razao_social ||
                        null
                      }
                    />
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
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
                        {item.nome_fantasia || item.razao_social || "Empresa"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gestor na empresa</Label>
                <Input
                  value={formData.avaliador_nome}
                  onChange={(event) => setFormData((prev) => ({ ...prev, avaliador_nome: event.target.value }))}
                />
              </div>
              <div>
                <Label>E-mail do gestor</Label>
                <Input
                  type="email"
                  value={formData.avaliador_email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, avaliador_email: event.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Prazo ou próxima data de envio</Label>
                <Input
                  type="date"
                  value={formData.proxima_data_envio}
                  onChange={(event) => setFormData((prev) => ({ ...prev, proxima_data_envio: event.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Observacoes</Label>
                <Textarea
                  rows={4}
                  value={formData.observacoes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, observacoes: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Salvando..." : "Criar avaliacao"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total no modulo</CardDescription>
            <CardTitle className="text-2xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solicitadas</CardDescription>
            <CardTitle className="text-2xl">{items.filter((item) => resolvePracticalStatus(item) === "solicitada").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Respondidas</CardDescription>
            <CardTitle className="text-2xl">{items.filter((item) => resolvePracticalStatus(item) === "respondida").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Validadas</CardDescription>
            <CardTitle className="text-2xl">{items.filter((item) => resolvePracticalStatus(item) === "validada").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Atrasadas</CardDescription>
            <CardTitle className="text-2xl">{items.filter((item) => resolvePracticalStatus(item) === "atrasada").length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Fluxo das avaliacoes praticas
              </CardTitle>
              <CardDescription>
                Acompanhe a ficha enviada, a devolutiva da empresa e a validacao interna.
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PracticalStatus | "all")}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Carregando avaliacoes praticas...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhuma avaliacao pratica encontrada.</div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{item.jovem?.nome_completo || "Jovem nao informado"}</p>
                        <Badge variant={resolvePracticalStatus(item) === "atrasada" ? "destructive" : "secondary"}>
                          {STATUS_OPTIONS.find((status) => status.value === resolvePracticalStatus(item))?.label || resolvePracticalStatus(item)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                        <Factory className="h-4 w-4" />
                        {item.empresa?.nome_fantasia || item.empresa?.razao_social || "Empresa nao informada"}
                      </p>
                      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <p>Curso: {getCursoNome(item.jovem) || "Não informado"}</p>
                        <p>
                          Início do contrato:{" "}
                          {formatDateDisplay(item.jovem?.data_admissao)}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Solicitada em {format(new Date(item.data_solicitacao), "dd/MM/yyyy", { locale: ptBR })}</p>
                        {item.data_resposta && (
                          <p>Respondida em {format(new Date(item.data_resposta), "dd/MM/yyyy", { locale: ptBR })}</p>
                        )}
                        {item.data_validacao && (
                          <p>Validada em {format(new Date(item.data_validacao), "dd/MM/yyyy", { locale: ptBR })}</p>
                        )}
                        {item.proxima_data_envio && <p>Proximo envio: {format(new Date(item.proxima_data_envio), "dd/MM/yyyy", { locale: ptBR })}</p>}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground md:text-right">
                      <p>Avaliador: {item.avaliador_nome || "Nao informado"}</p>
                      <p>{item.avaliador_email || "Sem e-mail"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Resposta da empresa</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(item)}
                        disabled={linkingId === item.id}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        {linkingId === item.id ? "Gerando link..." : "Copiar link de resposta"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendEmail(item)}
                        disabled={emailingId === item.id}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {emailingId === item.id ? "Enviando..." : "Enviar ficha por e-mail"}
                      </Button>
                      {hasStructuredResponse(item) ? (
                        <PracticalResponseDetails item={item} />
                      ) : item.parecer_empresa ? (
                        <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                          {item.parecer_empresa}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Ainda sem resposta registrada.</p>
                      )}
                      {item.data_resposta ? (
                        <p className="text-xs text-muted-foreground">
                          Resposta enviada em {format(new Date(item.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}. A ficha da empresa fica bloqueada para edição após o envio.
                        </p>
                      ) : (
                        <>
                          <Textarea
                            rows={4}
                            value={responseDrafts[item.id] ?? ""}
                            onChange={(event) =>
                              setResponseDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                            }
                            placeholder="Registrar devolutiva manual recebida da empresa..."
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegisterResponse(item)}
                            disabled={updatingId === item.id}
                          >
                            Registrar resposta manual
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Validacao interna</Label>
                      {item.parecer_interno ? (
                        <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                          {item.parecer_interno}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Ainda sem validacao registrada.</p>
                      )}
                      <Textarea
                        rows={4}
                        value={internalDrafts[item.id] ?? ""}
                        onChange={(event) =>
                          setInternalDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                        }
                        placeholder="Registrar parecer do acompanhamento..."
                      />
                      <div>
                        <Label className="mb-2 block">Proxima data de envio</Label>
                        <Input
                          type="date"
                          value={nextDateDrafts[item.id] ?? item.proxima_data_envio ?? ""}
                          onChange={(event) =>
                            setNextDateDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleValidate(item)}
                        disabled={updatingId === item.id}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Validar avaliacao
                      </Button>
                    </div>
                  </div>

                  {item.observacoes && (
                    <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.observacoes}
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

function PracticalResponseDetails({ item }: { item: PracticalEvaluation }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoLine label="Gestor" value={item.avaliador_nome} />
        <InfoLine
          label="Data da devolutiva"
          value={formatDateTimeDisplay(item.data_resposta)}
        />
      </div>

      <div className="mt-3 space-y-3">
        <InfoBlock label="Resumo das atividades" value={item.resumo_atividades} />
        <InfoLine
          label="Manteve o turno estipulado em contrato?"
          value={yesNoLabel(item.manteve_turno_contrato)}
        />
        {item.manteve_turno_contrato === false && (
          <InfoBlock label="Justificativa da mudança de turno" value={item.justificativa_turno} />
        )}

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Competências comportamentais
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {COMPETENCY_FIELDS.map((field) => (
              <InfoLine
                key={field.key}
                label={field.label}
                value={ratingLabel(item[field.key])}
              />
            ))}
          </div>
        </div>

        <InfoBlock label="Pontos fortes" value={item.pontos_fortes} />
        <InfoBlock label="Pontos de melhoria" value={item.pontos_melhoria} />

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoLine
            label="Feedback fornecido ao aprendiz?"
            value={yesNoLabel(item.feedback_fornecido)}
          />
          {item.feedback_fornecido && (
            <InfoLine
              label="Quantidade de feedbacks"
              value={String(item.quantidade_feedbacks ?? 0)}
            />
          )}
          <InfoLine
            label="Houve medidas disciplinares?"
            value={yesNoLabel(item.medidas_disciplinares)}
          />
          {item.medidas_disciplinares && (
            <InfoLine
              label="Quantidade de medidas"
              value={String(item.quantidade_medidas_disciplinares ?? 0)}
            />
          )}
        </div>

        {item.medidas_disciplinares && (
          <InfoBlock
            label="Motivos das medidas disciplinares"
            value={item.motivos_medidas_disciplinares}
          />
        )}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "Não informado"}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value || "Não informado"}</p>
    </div>
  );
}

function hasStructuredResponse(item: PracticalEvaluation) {
  return Boolean(
    item.resumo_atividades ||
      item.pontos_fortes ||
      item.pontos_melhoria ||
      item.competencia_comunicacao ||
      item.competencia_trabalho_equipe ||
      item.competencia_proatividade ||
      item.competencia_responsabilidade ||
      item.competencia_assiduidade,
  );
}

function getCursoNome(
  jovem:
    | Pick<JovemOption, "turma">
    | NonNullable<PracticalEvaluation["jovem"]>
    | null
    | undefined,
) {
  return jovem?.turma?.curso?.nome || jovem?.turma?.nome || null;
}

function formatDateDisplay(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return format(new Date(year, month - 1, day), "dd/MM/yyyy", {
      locale: ptBR,
    });
  }
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

function formatDateTimeDisplay(value: string | null | undefined) {
  if (!value) return null;
  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function ratingLabel(value: CompetencyRating | null | undefined) {
  return RATING_OPTIONS.find((item) => item.value === value)?.label || null;
}

function yesNoLabel(value: boolean | null | undefined) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return null;
}
