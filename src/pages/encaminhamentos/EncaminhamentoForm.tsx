import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useModelosEncaminhamento } from "@/hooks/useConfiguracoes";
import { logAudit } from "@/hooks/useAuditLog";

interface Jovem {
  id: string;
  nome_completo: string;
  matricula: string | null;
}

type TipoRede =
  | "geral"
  | "cras"
  | "creas"
  | "assistencia_social_outra";

const TIPO_REDE_OPTIONS: Array<{ value: TipoRede; label: string }> = [
  { value: "geral", label: "Encaminhamento geral" },
  { value: "cras", label: "CRAS" },
  { value: "creas", label: "CREAS" },
  { value: "assistencia_social_outra", label: "Outra rede socioassistencial" },
];

export default function EncaminhamentoForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jovens, setJovens] = useState<Jovem[]>([]);

  const preselectedJovemId = searchParams.get("jovem_id");

  const [formData, setFormData] = useState({
    jovem_id: preselectedJovemId || "",
    data_encaminhamento: new Date().toISOString().slice(0, 16),
    modelo_encaminhamento_id: "",
    tipo_rede: "geral" as TipoRede,
    referencia_rede: "",
    destino_nome: "",
    destino_instituicao: "",
    destino_cargo: "",
    destino_contato: "",
    descricao_encaminhamento: "",
    retorno_previsto: "",
  });
  const [socialReference, setSocialReference] = useState<{
    cras: string;
    creas: string;
  } | null>(null);

  // Carrega modelos de encaminhamento configurados
  const { data: modelosEncaminhamento, isLoading: loadingModelos } =
    useModelosEncaminhamento();

  // Aplica modelo selecionado ao formulário
  const handleApplyModelo = (modeloId: string) => {
    const modelo = modelosEncaminhamento?.find((m) => m.id === modeloId);
    if (modelo) {
      setFormData((prev) => ({
        ...prev,
        modelo_encaminhamento_id: modeloId,
        destino_nome: modelo.area_destino || prev.destino_nome,
        destino_instituicao:
          modelo.instituicao_destino || prev.destino_instituicao,
        descricao_encaminhamento:
          modelo.corpo_template || prev.descricao_encaminhamento,
      }));
      toast({
        title: "Modelo aplicado!",
        description: `Template "${modelo.nome}" carregado`,
      });
    }
  };

  useEffect(() => {
    fetchJovens();
  }, []);

  async function fetchJovens() {
    const { data } = await supabase
      .from("jovens")
      .select("id, nome_completo, matricula")
      .eq("status", "active_apprentice")
      .order("nome_completo");

    if (data) setJovens(data);
  }

  useEffect(() => {
    if (!formData.jovem_id) {
      setSocialReference(null);
      return;
    }

    fetchSocialReference(formData.jovem_id);
  }, [formData.jovem_id]);

  async function fetchSocialReference(jovemId: string) {
    const { data } = await supabase
      .from("avaliacoes_socioeconomicas")
      .select("cras, creas")
      .eq("jovem_id", jovemId)
      .order("data_avaliacao", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSocialReference({
      cras: data?.cras || "",
      creas: data?.creas || "",
    });
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTipoRedeChange = (value: TipoRede) => {
    setFormData((prev) => {
      const next = { ...prev, tipo_rede: value };

      if (value === "cras") {
        next.destino_instituicao = "CRAS";
        next.destino_nome = "Rede socioassistencial";
        next.referencia_rede = socialReference?.cras || prev.referencia_rede;
      } else if (value === "creas") {
        next.destino_instituicao = "CREAS";
        next.destino_nome = "Rede socioassistencial";
        next.referencia_rede = socialReference?.creas || prev.referencia_rede;
      }

      return next;
    });
  };

  const normalizeText = (value: string) =>
    value.trim() === "" ? null : value.trim();

  const isMissingModeloColumnError = (error: any) =>
    error?.message?.includes("modelo_encaminhamento_id") &&
    error?.message?.includes("schema cache");

  async function insertEncaminhamento(payload: Record<string, any>) {
    const firstAttempt = await supabase
      .from("encaminhamentos")
      .insert(payload)
      .select()
      .single();

    if (!firstAttempt.error || !isMissingModeloColumnError(firstAttempt.error)) {
      return firstAttempt;
    }

    const { modelo_encaminhamento_id, ...payloadSemModelo } = payload;
    console.warn(
      "Coluna modelo_encaminhamento_id ausente no schema cache; salvando encaminhamento sem vínculo de modelo.",
      modelo_encaminhamento_id,
    );

    return supabase
      .from("encaminhamentos")
      .insert(payloadSemModelo)
      .select()
      .single();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        jovem_id: formData.jovem_id,
        data_encaminhamento: formData.data_encaminhamento,
        modelo_encaminhamento_id:
          formData.modelo_encaminhamento_id || null,
        tipo_rede: formData.tipo_rede,
        referencia_rede: normalizeText(formData.referencia_rede),
        destino_nome: formData.destino_nome.trim(),
        destino_instituicao: formData.destino_instituicao.trim(),
        destino_cargo: normalizeText(formData.destino_cargo),
        destino_contato: normalizeText(formData.destino_contato),
        descricao_encaminhamento: normalizeText(
          formData.descricao_encaminhamento,
        ),
        retorno_previsto: formData.retorno_previsto || null,
        responsavel_id: user?.id,
        created_by: user?.id,
      };

      const { data: insertedData, error } = await insertEncaminhamento(payload);

      if (error) throw error;

      // Registrar log de auditoria
      if (insertedData?.id) {
        await logAudit({
          entityType: "encaminhamentos",
          entityId: insertedData.id,
          actionType: "create",
          newData: insertedData,
        });
      }

      toast({ title: "Encaminhamento registrado!" });

      if (preselectedJovemId) {
        navigate(`/jovens/${preselectedJovemId}`);
      } else {
        navigate("/encaminhamentos");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="page-header mb-0">
          <h1 className="page-title">Novo Encaminhamento</h1>
          <p className="page-description">
            Registre um encaminhamento para outra instituição
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção de Modelo */}
        {modelosEncaminhamento && modelosEncaminhamento.length > 0 && (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Usar Modelo de Encaminhamento
              </CardTitle>
              <CardDescription>
                Selecione um modelo pré-configurado para agilizar o
                preenchimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="modelo">Modelo disponível</Label>
                  <Select
                    value={formData.modelo_encaminhamento_id}
                    onValueChange={handleApplyModelo}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingModelos
                            ? "Carregando..."
                            : "Selecione um modelo (opcional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {modelosEncaminhamento?.map((modelo) => (
                        <SelectItem key={modelo.id} value={modelo.id}>
                          <div className="flex items-center gap-2">
                            {modelo.nome}
                            {modelo.area_destino && (
                              <Badge variant="outline" className="text-xs">
                                {modelo.area_destino}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Modelos configuráveis em Configurações → Modelos de
                Encaminhamento
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do Jovem</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="jovem_id">Jovem *</Label>
              <Select
                value={formData.jovem_id}
                onValueChange={(v) => handleChange("jovem_id", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o jovem" />
                </SelectTrigger>
                <SelectContent>
                  {jovens.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nome_completo} {j.matricula && `(${j.matricula})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="data_encaminhamento">
                Data do encaminhamento *
              </Label>
              <Input
                id="data_encaminhamento"
                type="datetime-local"
                value={formData.data_encaminhamento}
                onChange={(e) =>
                  handleChange("data_encaminhamento", e.target.value)
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do Encaminhamento</CardTitle>
            <CardDescription>
              Informações sobre o destino do encaminhamento
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tipo_rede">Tipo de rede</Label>
              <Select
                value={formData.tipo_rede}
                onValueChange={(v: TipoRede) => handleTipoRedeChange(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_REDE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="destino_instituicao">Instituição *</Label>
              <Input
                id="destino_instituicao"
                value={formData.destino_instituicao}
                onChange={(e) =>
                  handleChange("destino_instituicao", e.target.value)
                }
                placeholder="Nome da instituição"
                required
              />
            </div>
            <div>
              <Label htmlFor="referencia_rede">Referência da rede</Label>
              <Input
                id="referencia_rede"
                value={formData.referencia_rede}
                onChange={(e) => handleChange("referencia_rede", e.target.value)}
                placeholder={
                  formData.tipo_rede === "cras"
                    ? "CRAS de referência"
                    : formData.tipo_rede === "creas"
                      ? "CREAS de referência"
                      : "Unidade, território ou referência"
                }
              />
            </div>
            <div>
              <Label htmlFor="destino_nome">Destino/Área *</Label>
              <Input
                id="destino_nome"
                value={formData.destino_nome}
                onChange={(e) => handleChange("destino_nome", e.target.value)}
                placeholder="Ex: Psicologia, Saúde, Assistência Social..."
                required
              />
            </div>
            <div>
              <Label htmlFor="destino_cargo">Cargo / Função</Label>
              <Input
                id="destino_cargo"
                value={formData.destino_cargo}
                onChange={(e) => handleChange("destino_cargo", e.target.value)}
                placeholder="Ex: Assistente Social"
              />
            </div>
            <div>
              <Label htmlFor="destino_contato">Contato</Label>
              <Input
                id="destino_contato"
                value={formData.destino_contato}
                onChange={(e) =>
                  handleChange("destino_contato", e.target.value)
                }
                placeholder="E-mail ou telefone"
              />
            </div>
            <div>
              <Label htmlFor="retorno_previsto">Retorno previsto</Label>
              <Input
                id="retorno_previsto"
                type="date"
                value={formData.retorno_previsto}
                onChange={(e) =>
                  handleChange("retorno_previsto", e.target.value)
                }
              />
            </div>
          </CardContent>
          {formData.tipo_rede !== "geral" && socialReference ? (
            <CardContent className="pt-0">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Referências atuais da avaliação socioeconômica: <strong>CRAS:</strong>{" "}
                {socialReference.cras || "não informado"} | <strong>CREAS:</strong>{" "}
                {socialReference.creas || "não informado"}
              </div>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Descrição</CardTitle>
            <CardDescription>
              Descreva o motivo e detalhes do encaminhamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="descricao_encaminhamento"
              value={formData.descricao_encaminhamento}
              onChange={(e) =>
                handleChange("descricao_encaminhamento", e.target.value)
              }
              rows={5}
              placeholder="Descreva o motivo do encaminhamento, situação do jovem e informações relevantes..."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Registrar Encaminhamento
          </Button>
        </div>
      </form>
    </div>
  );
}
