import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const PUBLIC_GET_URL = SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/public-get-practical-evaluation";
const PUBLIC_SUBMIT_URL = SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/public-submit-practical-evaluation";

type PublicEvaluation = {
  id: string;
  status: string;
  data_solicitacao: string;
  data_resposta: string | null;
  proxima_data_envio: string | null;
  avaliador_nome: string | null;
  avaliador_email: string | null;
  parecer_empresa: string | null;
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
};

type CompetencyRating = "excelente" | "bom" | "regular" | "insuficiente";
type BooleanSelectValue = "sim" | "nao" | "";

type EvaluationFormData = {
  resumo_atividades: string;
  manteve_turno_contrato: BooleanSelectValue;
  justificativa_turno: string;
  competencia_comunicacao: CompetencyRating | "";
  competencia_trabalho_equipe: CompetencyRating | "";
  competencia_proatividade: CompetencyRating | "";
  competencia_responsabilidade: CompetencyRating | "";
  competencia_assiduidade: CompetencyRating | "";
  pontos_fortes: string;
  pontos_melhoria: string;
  feedback_fornecido: BooleanSelectValue;
  quantidade_feedbacks: string;
  medidas_disciplinares: BooleanSelectValue;
  quantidade_medidas_disciplinares: string;
  motivos_medidas_disciplinares: string;
};

const RATING_OPTIONS: Array<{ value: CompetencyRating; label: string }> = [
  { value: "excelente", label: "Excelente" },
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "insuficiente", label: "Insuficiente" },
];

const COMPETENCY_FIELDS: Array<{
  key:
    | "competencia_comunicacao"
    | "competencia_trabalho_equipe"
    | "competencia_proatividade"
    | "competencia_responsabilidade"
    | "competencia_assiduidade";
  label: string;
}> = [
  { key: "competencia_comunicacao", label: "Comunicação" },
  { key: "competencia_trabalho_equipe", label: "Trabalho em equipe" },
  { key: "competencia_proatividade", label: "Proatividade" },
  { key: "competencia_responsabilidade", label: "Responsabilidade" },
  { key: "competencia_assiduidade", label: "Assiduidade" },
];

export default function AvaliacaoPraticaPublica() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avaliacao, setAvaliacao] = useState<PublicEvaluation | null>(null);
  const [avaliadorNome, setAvaliadorNome] = useState("");
  const [avaliadorEmail, setAvaliadorEmail] = useState("");
  const [formData, setFormData] = useState<EvaluationFormData>({
    resumo_atividades: "",
    manteve_turno_contrato: "" as BooleanSelectValue,
    justificativa_turno: "",
    competencia_comunicacao: "" as CompetencyRating | "",
    competencia_trabalho_equipe: "" as CompetencyRating | "",
    competencia_proatividade: "" as CompetencyRating | "",
    competencia_responsabilidade: "" as CompetencyRating | "",
    competencia_assiduidade: "" as CompetencyRating | "",
    pontos_fortes: "",
    pontos_melhoria: "",
    feedback_fornecido: "" as BooleanSelectValue,
    quantidade_feedbacks: "",
    medidas_disciplinares: "" as BooleanSelectValue,
    quantidade_medidas_disciplinares: "",
    motivos_medidas_disciplinares: "",
  });

  useEffect(() => {
    if (!token) {
      setError("Link invalido ou expirado.");
      setLoading(false);
      return;
    }

    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(PUBLIC_GET_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLIC_KEY,
        },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.avaliacao) {
        setError(data?.error || "Nao foi possivel carregar a avaliacao.");
        return;
      }

      const record = data.avaliacao as PublicEvaluation;
      setAvaliacao(record);
      setAvaliadorNome(record.avaliador_nome || "");
      setAvaliadorEmail(record.avaliador_email || "");
      setFormData({
        resumo_atividades: record.resumo_atividades || "",
        manteve_turno_contrato: booleanToSelectValue(record.manteve_turno_contrato),
        justificativa_turno: record.justificativa_turno || "",
        competencia_comunicacao: record.competencia_comunicacao || "",
        competencia_trabalho_equipe: record.competencia_trabalho_equipe || "",
        competencia_proatividade: record.competencia_proatividade || "",
        competencia_responsabilidade: record.competencia_responsabilidade || "",
        competencia_assiduidade: record.competencia_assiduidade || "",
        pontos_fortes: record.pontos_fortes || "",
        pontos_melhoria: record.pontos_melhoria || "",
        feedback_fornecido: booleanToSelectValue(record.feedback_fornecido),
        quantidade_feedbacks:
          record.quantidade_feedbacks === null || record.quantidade_feedbacks === undefined
            ? ""
            : String(record.quantidade_feedbacks),
        medidas_disciplinares: booleanToSelectValue(record.medidas_disciplinares),
        quantidade_medidas_disciplinares:
          record.quantidade_medidas_disciplinares === null ||
          record.quantidade_medidas_disciplinares === undefined
            ? ""
            : String(record.quantidade_medidas_disciplinares),
        motivos_medidas_disciplinares: record.motivos_medidas_disciplinares || "",
      });
    } catch {
      setError("Nao foi possivel carregar a avaliacao.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (avaliacao?.data_resposta) {
      setError("Esta ficha ja foi enviada e nao pode ser alterada.");
      return;
    }

    const validationError = validateEvaluationForm(formData, avaliadorNome);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(PUBLIC_SUBMIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLIC_KEY,
        },
        body: JSON.stringify({
          avaliador_nome: avaliadorNome,
          avaliador_email: avaliadorEmail,
          resumo_atividades: formData.resumo_atividades,
          manteve_turno_contrato: selectValueToBoolean(formData.manteve_turno_contrato),
          justificativa_turno: formData.justificativa_turno,
          competencia_comunicacao: formData.competencia_comunicacao,
          competencia_trabalho_equipe: formData.competencia_trabalho_equipe,
          competencia_proatividade: formData.competencia_proatividade,
          competencia_responsabilidade: formData.competencia_responsabilidade,
          competencia_assiduidade: formData.competencia_assiduidade,
          pontos_fortes: formData.pontos_fortes,
          pontos_melhoria: formData.pontos_melhoria,
          feedback_fornecido: selectValueToBoolean(formData.feedback_fornecido),
          quantidade_feedbacks: parseOptionalInteger(formData.quantidade_feedbacks),
          medidas_disciplinares: selectValueToBoolean(formData.medidas_disciplinares),
          quantidade_medidas_disciplinares: parseOptionalInteger(
            formData.quantidade_medidas_disciplinares,
          ),
          motivos_medidas_disciplinares: formData.motivos_medidas_disciplinares,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setError(data?.error || "Nao foi possivel enviar a avaliacao.");
        return;
      }

      setSuccess("Resposta enviada com sucesso.");
      loadData();
    } catch {
      setError("Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  const isReadOnly = Boolean(avaliacao?.data_resposta);

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 flex items-center justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Avaliacao pratica da empresa</CardTitle>
          <CardDescription>
            Relatório de desempenho do aprendiz na prática.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Carregando avaliacao...
            </div>
          ) : error && !avaliacao ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : avaliacao ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="mb-3 font-semibold">I. Identificação</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoLine label="Nome do aprendiz" value={avaliacao.jovem?.nome_completo} />
                  <InfoLine
                    label="Data de início do contrato"
                    value={formatDateDisplay(avaliacao.jovem?.data_admissao)}
                  />
                  <InfoLine label="Curso" value={getCursoNome(avaliacao.jovem)} />
                  <InfoLine
                    label="Empresa"
                    value={
                      avaliacao.empresa?.nome_fantasia ||
                      avaliacao.empresa?.razao_social
                    }
                  />
                </div>
                <div className="mt-3 border-t pt-3">
                  <p className="font-semibold">II. Período de avaliação</p>
                  <p className="text-muted-foreground mt-1">
                    Data de início: {formatDateDisplay(avaliacao.data_solicitacao)}
                  </p>
                </div>
                {avaliacao.observacoes && (
                  <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
                    {avaliacao.observacoes}
                  </p>
                )}
              </div>

              {isReadOnly && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Esta ficha foi enviada em {formatDateTimeDisplay(avaliacao.data_resposta)} e não pode ser editada.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nome do gestor *</Label>
                  <Input
                    value={avaliadorNome}
                    disabled={isReadOnly}
                    onChange={(event) => setAvaliadorNome(event.target.value)}
                  />
                </div>
                <div>
                  <Label>E-mail do gestor</Label>
                  <Input
                    type="email"
                    value={avaliadorEmail}
                    disabled={isReadOnly}
                    onChange={(event) => setAvaliadorEmail(event.target.value)}
                  />
                </div>
              </div>

              <section className="space-y-4">
                <div>
                  <Label>Resumo das atividades desenvolvidas *</Label>
                  <Textarea
                    rows={5}
                    value={formData.resumo_atividades}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        resumo_atividades: event.target.value,
                      }))
                    }
                    placeholder="Descreva as principais atividades, projetos e tarefas realizadas pelo aprendiz."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>O aprendiz manteve o turno estipulado em contrato? *</Label>
                    <Select
                      value={formData.manteve_turno_contrato}
                      disabled={isReadOnly}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          manteve_turno_contrato: value as BooleanSelectValue,
                          justificativa_turno:
                            value === "sim" ? "" : prev.justificativa_turno,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.manteve_turno_contrato === "nao" && (
                    <div>
                      <Label>Justificativa da mudança *</Label>
                      <Input
                        value={formData.justificativa_turno}
                        disabled={isReadOnly}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            justificativa_turno: event.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold">
                  Avaliação das competências comportamentais
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {COMPETENCY_FIELDS.map((field) => (
                    <div key={field.key}>
                      <Label>{field.label} *</Label>
                      <Select
                        value={formData[field.key]}
                        disabled={isReadOnly}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.key]: value as CompetencyRating,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {RATING_OPTIONS.map((rating) => (
                            <SelectItem key={rating.value} value={rating.value}>
                              {rating.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Pontos fortes *</Label>
                  <Textarea
                    rows={5}
                    value={formData.pontos_fortes}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        pontos_fortes: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Pontos de melhoria *</Label>
                  <Textarea
                    rows={5}
                    value={formData.pontos_melhoria}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        pontos_melhoria: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Foi fornecido feedback ao aprendiz? *</Label>
                  <Select
                    value={formData.feedback_fornecido}
                    disabled={isReadOnly}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        feedback_fornecido: value as BooleanSelectValue,
                        quantidade_feedbacks:
                          value === "nao" ? "" : prev.quantidade_feedbacks,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.feedback_fornecido === "sim" && (
                  <div>
                    <Label>Quantidade de feedbacks *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.quantidade_feedbacks}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantidade_feedbacks: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Houve aplicação de medidas disciplinares? *</Label>
                  <Select
                    value={formData.medidas_disciplinares}
                    disabled={isReadOnly}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        medidas_disciplinares: value as BooleanSelectValue,
                        quantidade_medidas_disciplinares:
                          value === "nao" ? "" : prev.quantidade_medidas_disciplinares,
                        motivos_medidas_disciplinares:
                          value === "nao" ? "" : prev.motivos_medidas_disciplinares,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.medidas_disciplinares === "sim" && (
                  <div>
                    <Label>Quantidade de medidas *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.quantidade_medidas_disciplinares}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantidade_medidas_disciplinares: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              {formData.medidas_disciplinares === "sim" && (
                <div>
                  <Label>Motivos das medidas disciplinares *</Label>
                  <Textarea
                    rows={4}
                    value={formData.motivos_medidas_disciplinares}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        motivos_medidas_disciplinares: event.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {avaliacao.parecer_empresa && !hasStructuredResponse(avaliacao) && (
                <div>
                  <Label>Devolutiva registrada anteriormente</Label>
                  <Textarea
                    rows={8}
                    value={avaliacao.parecer_empresa}
                    disabled
                  />
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}

              <Button type="submit" disabled={sending || isReadOnly}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar ficha
                  </>
                )}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
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

function validateEvaluationForm(data: EvaluationFormData, gestorNome: string) {
  if (!gestorNome.trim()) return "Informe o nome do gestor.";
  if (!data.resumo_atividades.trim()) {
    return "Informe o resumo das atividades desenvolvidas.";
  }
  if (!data.manteve_turno_contrato) {
    return "Informe se o aprendiz manteve o turno estipulado em contrato.";
  }
  if (
    data.manteve_turno_contrato === "nao" &&
    !data.justificativa_turno.trim()
  ) {
    return "Informe a justificativa da mudança de turno.";
  }
  const missingCompetency = COMPETENCY_FIELDS.find((field) => !data[field.key]);
  if (missingCompetency) {
    return `Informe a avaliação de ${missingCompetency.label}.`;
  }
  if (!data.pontos_fortes.trim()) return "Informe os pontos fortes do aprendiz.";
  if (!data.pontos_melhoria.trim()) {
    return "Informe os pontos de melhoria do aprendiz.";
  }
  if (!data.feedback_fornecido) {
    return "Informe se foram fornecidos feedbacks ao aprendiz.";
  }
  if (
    data.feedback_fornecido === "sim" &&
    (parseOptionalInteger(data.quantidade_feedbacks) || 0) <= 0
  ) {
    return "Informe a quantidade de feedbacks fornecidos.";
  }
  if (!data.medidas_disciplinares) {
    return "Informe se houve aplicação de medidas disciplinares.";
  }
  if (data.medidas_disciplinares === "sim") {
    if ((parseOptionalInteger(data.quantidade_medidas_disciplinares) || 0) <= 0) {
      return "Informe a quantidade de medidas disciplinares.";
    }
    if (!data.motivos_medidas_disciplinares.trim()) {
      return "Informe os motivos das medidas disciplinares.";
    }
  }
  return "";
}

function hasStructuredResponse(item: PublicEvaluation) {
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

function booleanToSelectValue(value: boolean | null | undefined): BooleanSelectValue {
  if (value === true) return "sim";
  if (value === false) return "nao";
  return "";
}

function selectValueToBoolean(value: BooleanSelectValue) {
  if (value === "sim") return true;
  if (value === "nao") return false;
  return null;
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCursoNome(jovem: PublicEvaluation["jovem"] | null | undefined) {
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
