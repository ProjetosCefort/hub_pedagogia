import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Paperclip, Save, Loader2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  useAproveitamentoEscolar,
  useModelosEncaminhamento,
} from "@/hooks/useConfiguracoes";
import { logAudit } from "@/hooks/useAuditLog";
import { DOCUMENTOS_BUCKET, sanitizeDocumentoFileName } from "@/lib/documentos";

interface Jovem {
  id: string;
  nome_completo: string;
  matricula: string | null;
  turma_id: string | null;
}

interface Turma {
  id: string;
  nome: string;
}

interface MotivoPedagogico {
  id: string;
  nome: string;
  categoria: string | null;
  ativo: boolean;
  ordem: number;
}

const DIFICULDADE_SUGESTOES = [
  "Leitura",
  "Escrita",
  "Interpretação",
  "Matemática",
  "Atenção",
  "Organização",
  "Frequência",
  "Pontualidade",
  "Comunicação",
  "Trabalho em equipe",
];

export default function AvaliacaoPedagogicaForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jovens, setJovens] = useState<Jovem[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [motivosPedagogicos, setMotivosPedagogicos] = useState<MotivoPedagogico[]>([]);
  const [loadingMotivosPedagogicos, setLoadingMotivosPedagogicos] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avaliacaoTurmaInteira, setAvaliacaoTurmaInteira] = useState(false);
  const [supportsTurmaId, setSupportsTurmaId] = useState(false);
  const [supportsModeloEncaminhamentoId, setSupportsModeloEncaminhamentoId] =
    useState(false);

  const preselectedJovemId = searchParams.get("jovem_id");

  const [formData, setFormData] = useState({
    jovem_id: preselectedJovemId || "",
    turma_id: "",
    modelo_encaminhamento_id: "",
    data_avaliacao: new Date().toISOString().slice(0, 16),
    motivo_pedagogico_id: "",
    motivo_intervencao: "",
    dificuldades: [] as string[],
    aproveitamento_escolar_id: "",
    descricao_conducao: "",
    estrategias_aplicadas: "",
    manifestacao_jovem: "",
    parecer_final: "",
    assinatura_profissional: "",
    assinatura_jovem: "",
  });

  // Carrega tipos de aproveitamento escolar (apenas ativos)
  const { data: aproveitamentosEscolares, isLoading: loadingAproveitamentos } =
    useAproveitamentoEscolar(true);
  const { data: modelosEncaminhamento, isLoading: loadingModelos } =
    useModelosEncaminhamento();

  useEffect(() => {
    fetchJovens();
    fetchTurmas();
    fetchMotivosPedagogicos();
    detectSchemaCompatibility();
  }, []);

  useEffect(() => {
    fetchResponsavel();
  }, [user?.id]);

  async function fetchResponsavel() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("nome_completo")
      .eq("id", user.id)
      .maybeSingle();
    const nome = data?.nome_completo || user.email || "Usuário logado";
    setResponsavelNome(nome);
    setFormData((prev) => ({
      ...prev,
      assinatura_profissional: prev.assinatura_profissional || nome,
    }));
  }

  async function fetchJovens() {
    const { data } = await supabase
      .from("jovens")
      .select("id, nome_completo, matricula, turma_id")
      .eq("status", "active_apprentice")
      .order("nome_completo");

    if (data) setJovens(data);
  }

  async function fetchTurmas() {
    const { data } = await supabase
      .from("turmas")
      .select("id, nome")
      .order("nome");
    if (data) setTurmas(data);
  }

  async function fetchMotivosPedagogicos() {
    setLoadingMotivosPedagogicos(true);
    try {
      const { data, error } = await supabase
        .from("config_motivos_avaliacao_pedagogica" as any)
        .select("id, nome, categoria, ativo, ordem")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      setMotivosPedagogicos((data || []) as MotivoPedagogico[]);
    } catch (error) {
      console.error("Erro ao carregar motivos pedagógicos:", error);
    } finally {
      setLoadingMotivosPedagogicos(false);
    }
  }

  async function detectSchemaCompatibility() {
    try {
      const { error: turmaError } = await supabase
        .from("avaliacoes_pedagogicas")
        .select("id, turma_id")
        .limit(1);

      if (
        turmaError?.code === "PGRST204" &&
        turmaError.message?.includes("turma_id")
      ) {
        setSupportsTurmaId(false);
        setAvaliacaoTurmaInteira(false);
      } else if (!turmaError) {
        setSupportsTurmaId(true);
      }

      const { error: modeloError } = await supabase
        .from("avaliacoes_pedagogicas")
        .select("id, modelo_encaminhamento_id")
        .limit(1);

      if (
        modeloError?.code === "PGRST204" &&
        modeloError.message?.includes("modelo_encaminhamento_id")
      ) {
        setSupportsModeloEncaminhamentoId(false);
      } else if (!modeloError) {
        setSupportsModeloEncaminhamentoId(true);
      }
    } catch {
      // Em caso de erro não relacionado a schema, mantém fallback padrão.
    }
  }

  const handleApplyModelo = (modeloId: string) => {
    const modelo = modelosEncaminhamento?.find((m) => m.id === modeloId);
    if (!modelo) return;

    setFormData((prev) => ({
      ...prev,
      modelo_encaminhamento_id: modeloId,
      descricao_conducao: modelo.corpo_template || prev.descricao_conducao,
      estrategias_aplicadas: prev.estrategias_aplicadas || modelo.area_destino || "",
    }));

    toast({
      title: "Modelo aplicado!",
      description: `Template "${modelo.nome}" carregado`,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const collectiveMode = supportsTurmaId && avaliacaoTurmaInteira;

    // Validação: aproveitamento_escolar_id é obrigatório
    if (!formData.aproveitamento_escolar_id) {
      toast({
        title: "Campo obrigatório",
        description: "A classificação educacional é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.motivo_pedagogico_id || !formData.motivo_intervencao) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o tipo de abordagem pedagógica.",
        variant: "destructive",
      });
      return;
    }

    if (collectiveMode && !formData.turma_id) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione a turma para registrar a avaliação coletiva.",
        variant: "destructive",
      });
      return;
    }

    if (avaliacaoTurmaInteira && !supportsTurmaId) {
      toast({
        title: "Recurso indisponível neste ambiente",
        description:
          "Este banco não possui a coluna de turma na avaliação pedagógica. Use avaliação individual.",
        variant: "destructive",
      });
      return;
    }

    if (!collectiveMode && !formData.jovem_id) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o jovem para registrar a avaliação individual.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const jovemSelecionado = formData.jovem_id
        ? jovens.find((j) => j.id === formData.jovem_id)
        : null;
      const turmaIdFinal = formData.turma_id || jovemSelecionado?.turma_id || null;
      const payload: Record<string, any> = {
        jovem_id: collectiveMode ? null : formData.jovem_id || null,
        data_avaliacao: formData.data_avaliacao,
        motivo_intervencao_id: null,
        motivo_intervencao: formData.motivo_intervencao,
        dificuldades: formData.dificuldades,
        aproveitamento_escolar_id: formData.aproveitamento_escolar_id || null,
        descricao_conducao: formData.descricao_conducao || null,
        estrategias_aplicadas: formData.estrategias_aplicadas || null,
        manifestacao_jovem: formData.manifestacao_jovem || null,
        parecer_final: formData.parecer_final || null,
        assinatura_profissional: formData.assinatura_profissional || null,
        assinatura_jovem: collectiveMode
          ? null
          : formData.assinatura_jovem || null,
        responsavel_id: user?.id || null,
        created_by: user?.id || null,
      };
      if (supportsTurmaId) {
        payload.turma_id = turmaIdFinal;
      }
      if (supportsModeloEncaminhamentoId) {
        payload.modelo_encaminhamento_id =
          formData.modelo_encaminhamento_id || null;
      }

      const { data: insertedData, error } = await supabase
        .from("avaliacoes_pedagogicas")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Registrar log de auditoria
      if (insertedData?.id) {
        if (selectedFile) {
          const anexoId = crypto.randomUUID();
          const safeName = sanitizeDocumentoFileName(selectedFile.name);
          const storagePath = `avaliacoes-pedagogicas/${insertedData.id}/${anexoId}/${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from(DOCUMENTOS_BUCKET)
            .upload(storagePath, selectedFile, {
              upsert: false,
              contentType: selectedFile.type || undefined,
            });

          if (uploadError) throw uploadError;

          const { error: anexoError } = await supabase
            .from("avaliacoes_pedagogicas_anexos" as any)
            .insert({
              id: anexoId,
              avaliacao_id: insertedData.id,
              nome_arquivo: selectedFile.name,
              storage_path: storagePath,
              mime_type: selectedFile.type || null,
              tamanho_bytes: selectedFile.size,
              created_by: user?.id || null,
            });

          if (anexoError) throw anexoError;
        }

        await logAudit({
          entityType: "avaliacoes_pedagogicas",
          entityId: insertedData.id,
          actionType: "create",
          newData: insertedData,
        });
      }

      toast({ title: "Avaliação pedagógica registrada!" });

      if (preselectedJovemId) {
        navigate(`/jovens/${preselectedJovemId}`);
      } else {
        navigate("/avaliacoes-pedagogicas");
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
          <h1 className="page-title">Avaliação Pedagógica</h1>
          <p className="page-description">
            Registre uma nova avaliação pedagógica
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {modelosEncaminhamento && modelosEncaminhamento.length > 0 && (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Usar Modelo nos Campos Abertos
              </CardTitle>
              <CardDescription>
                Aplique um modelo para agilizar o preenchimento da avaliação pedagógica
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
                Modelos configuráveis em Configurações → Modelos de Encaminhamento
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-2">
              <Switch
                checked={avaliacaoTurmaInteira}
                disabled={!supportsTurmaId}
                onCheckedChange={(checked) => {
                  setAvaliacaoTurmaInteira(checked);
                  if (checked) {
                    setFormData((prev) => ({ ...prev, jovem_id: "" }));
                  }
                }}
              />
              <Label>Avaliação da turma inteira</Label>
            </div>
            {!supportsTurmaId && (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Avaliação coletiva por turma indisponível neste ambiente (schema sem suporte a turma).
              </p>
            )}
            <div>
              <Label htmlFor="turma_id">
                Turma {avaliacaoTurmaInteira ? "*" : "(opcional)"}
              </Label>
              <Select
                value={formData.turma_id}
                onValueChange={(v) => handleChange("turma_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="jovem_id">
                Jovem {avaliacaoTurmaInteira ? "(desabilitado para avaliação coletiva)" : "*"}
              </Label>
              <Select
                value={formData.jovem_id}
                onValueChange={(v) => {
                  const jovemSelecionado = jovens.find((j) => j.id === v);
                  setFormData((prev) => ({
                    ...prev,
                    jovem_id: v,
                    turma_id: prev.turma_id || jovemSelecionado?.turma_id || "",
                  }));
                }}
                disabled={avaliacaoTurmaInteira}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o jovem (se aplicável)" />
                </SelectTrigger>
                <SelectContent>
                  {jovens.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nome_completo} {j.matricula && `(${j.matricula})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Quando a avaliação for coletiva, selecione a turma e deixe o jovem em branco.
              </p>
            </div>
            <div>
              <Label htmlFor="responsavel">Responsável pela avaliação</Label>
              <Input
                id="responsavel"
                value={responsavelNome}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Campo preenchido automaticamente com o usuário logado.
              </p>
            </div>
            <div>
              <Label htmlFor="data_avaliacao">Data da avaliação *</Label>
              <Input
                id="data_avaliacao"
                type="datetime-local"
                value={formData.data_avaliacao}
                onChange={(e) => handleChange("data_avaliacao", e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Motivo da Avaliação Pedagógica</CardTitle>
            <CardDescription>
              Selecione a abordagem pedagógica aplicada nesta avaliação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="motivo_select">Tipo de abordagem pedagógica *</Label>
              <Select
                value={formData.motivo_pedagogico_id}
                onValueChange={(v) => {
                  const motivo = motivosPedagogicos?.find((m) => m.id === v);
                  setFormData((prev) => ({
                    ...prev,
                    motivo_pedagogico_id: v,
                    motivo_intervencao: motivo?.nome || "",
                  }));
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingMotivosPedagogicos
                        ? "Carregando..."
                        : "Selecione a abordagem"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {motivosPedagogicos?.map((motivo) => (
                    <SelectItem key={motivo.id} value={motivo.id}>
                      {motivo.nome}
                      {motivo.categoria && ` (${motivo.categoria})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Lista específica para avaliação pedagógica.
              </p>
            </div>
            <div>
              <Label htmlFor="motivo_detalhes">Detalhamento</Label>
              <Textarea
                id="motivo_detalhes"
                value={formData.motivo_intervencao}
                onChange={(e) =>
                  handleChange("motivo_intervencao", e.target.value)
                }
                rows={3}
                placeholder="Descreva detalhes adicionais sobre o motivo..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dificuldades observadas</CardTitle>
            <CardDescription>
              Registre dificuldades em formato de palavras-chave
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeywordInput
              values={formData.dificuldades}
              suggestions={DIFICULDADE_SUGESTOES}
              onChange={(values) =>
                setFormData((prev) => ({ ...prev, dificuldades: values }))
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Anexo
            </CardTitle>
            <CardDescription>
              Inclua um arquivo de apoio desta avaliação (opcional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".pdf,image/*,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              {selectedFile
                ? `Arquivo selecionado: ${selectedFile.name}`
                : "Nenhum arquivo selecionado."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classificação Educacional</CardTitle>
            <CardDescription>
              Selecione a classificação de aproveitamento escolar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="aproveitamento_escolar_id">
                Classificação Educacional *
              </Label>
              <Select
                value={formData.aproveitamento_escolar_id}
                onValueChange={(v) =>
                  handleChange("aproveitamento_escolar_id", v)
                }
                required
                disabled={loadingAproveitamentos}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingAproveitamentos
                        ? "Carregando..."
                        : "Selecione a classificação"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {aproveitamentosEscolares?.map((aproveitamento) => (
                    <SelectItem
                      key={aproveitamento.id}
                      value={aproveitamento.id}
                    >
                      {aproveitamento.nome}
                      {aproveitamento.descricao &&
                        ` - ${aproveitamento.descricao}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Classificações configuráveis em Configurações → Aproveitamento
                Escolar
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Descrição da Condução</CardTitle>
            <CardDescription>
              Descreva como a intervenção foi conduzida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="descricao_conducao"
              value={formData.descricao_conducao}
              onChange={(e) =>
                handleChange("descricao_conducao", e.target.value)
              }
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Estratégias aplicadas
            </CardTitle>
            <CardDescription>
              Detalhe quais estratégias pedagógicas foram utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="estrategias_aplicadas"
              value={formData.estrategias_aplicadas}
              onChange={(e) =>
                handleChange("estrategias_aplicadas", e.target.value)
              }
              rows={4}
              placeholder="Descreva as estratégias utilizadas..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manifestação do Jovem</CardTitle>
            <CardDescription>
              Registre a manifestação e posicionamento do jovem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="manifestacao_jovem"
              value={formData.manifestacao_jovem}
              onChange={(e) =>
                handleChange("manifestacao_jovem", e.target.value)
              }
              rows={4}
              placeholder="Registre a manifestação do jovem..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parecer Final</CardTitle>
            <CardDescription>
              Consolide o parecer profissional desta avaliação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="parecer_final"
              value={formData.parecer_final}
              onChange={(e) => handleChange("parecer_final", e.target.value)}
              rows={4}
              placeholder="Descreva o parecer final e encaminhamentos sugeridos..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assinaturas</CardTitle>
          </CardHeader>
          <CardContent
            className={`grid gap-4 ${
              avaliacaoTurmaInteira ? "sm:grid-cols-1" : "sm:grid-cols-2"
            }`}
          >
            <div>
              <Label htmlFor="assinatura_profissional">
                Nome do profissional
              </Label>
              <Input
                id="assinatura_profissional"
                value={formData.assinatura_profissional}
                onChange={(e) =>
                  handleChange("assinatura_profissional", e.target.value)
                }
              />
            </div>
            {!avaliacaoTurmaInteira ? (
              <div>
                <Label htmlFor="assinatura_jovem">Nome do jovem</Label>
                <Input
                  id="assinatura_jovem"
                  value={formData.assinatura_jovem}
                  onChange={(e) =>
                    handleChange("assinatura_jovem", e.target.value)
                  }
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground sm:self-end">
                Em avaliação de turma, a assinatura do jovem não é necessária.
              </p>
            )}
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
            Registrar Avaliação
          </Button>
        </div>
      </form>
    </div>
  );
}

function KeywordInput({
  values,
  suggestions,
  onChange,
}: {
  values: string[];
  suggestions: string[];
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const normalizeKeyword = (raw: string) => raw.trim().replace(/\s+/g, " ");

  const addKeyword = (raw: string) => {
    const keyword = normalizeKeyword(raw);
    if (!keyword) return;
    if (values.some((item) => item.toLowerCase() === keyword.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...values, keyword]);
    setInput("");
  };

  const addFromText = (text: string) => {
    const keywords = text
      .split(/[,\n;]/)
      .map(normalizeKeyword)
      .filter(Boolean);

    if (keywords.length === 0) return;

    const existing = new Set(values.map((item) => item.toLowerCase()));
    const next = [...values];
    keywords.forEach((keyword) => {
      const key = keyword.toLowerCase();
      if (!existing.has(key)) {
        next.push(keyword);
        existing.add(key);
      }
    });
    onChange(next);
    setInput("");
  };

  const removeKeyword = (target: string) => {
    onChange(values.filter((item) => item !== target));
  };

  const availableSuggestions = suggestions.filter(
    (suggestion) =>
      !values.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <Input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addKeyword(input);
          }
          if (event.key === "Backspace" && !input && values.length > 0) {
            removeKeyword(values[values.length - 1]);
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (/[,\n;]/.test(text)) {
            event.preventDefault();
            addFromText(text);
          }
        }}
        onBlur={() => {
          if (input.trim()) addKeyword(input);
        }}
        placeholder="Digite uma dificuldade e pressione Enter"
      />

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/15"
              onClick={() => removeKeyword(keyword)}
              title="Remover dificuldade"
            >
              {keyword}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              onClick={() => addKeyword(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
