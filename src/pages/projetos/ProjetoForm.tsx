import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Image, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDocumentoSignedUrl, deleteDocumentoArquivo, DOCUMENTOS_BUCKET, sanitizeDocumentoFileName } from "@/lib/documentos";

type JovemOption = { id: string; nome_completo: string };
type ProjetoAnexoTipo = "texto_projeto" | "foto" | "anexo";

type Participante = {
  id?: string;
  jovem_id: string;
  participante_nome: string;
  participante_contato: string;
  papel: string;
};

type Orcamento = {
  id?: string;
  fornecedor: string;
  valor: string;
  descritivo: string;
};

type ProjetoAnexo = {
  id?: string;
  tipo: ProjetoAnexoTipo;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string;
  tamanho_bytes: string;
};

const ANEXO_TIPO_LABEL: Record<ProjetoAnexoTipo, string> = {
  texto_projeto: "Texto do projeto",
  foto: "Foto",
  anexo: "Anexo",
};

const SETOR_LABEL: Record<string, string> = {
  servico_social: "Serviço Social",
  pedagogico: "Pedagógico",
  psicossocial: "Psicossocial",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface ProjetoFormProps {
  context?: "servico_social" | "pedagogico";
  basePath?: string;
}

export default function ProjetoForm({
  context = "servico_social",
  basePath = "/projetos",
}: ProjetoFormProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [jovens, setJovens] = useState<JovemOption[]>([]);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    setor: context,
    status: "planejado",
    data_inicio: "",
    data_fim: "",
  });
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [anexos, setAnexos] = useState<ProjetoAnexo[]>([]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchJovens(), fetchProjetoIfEdit()]);
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchJovens() {
    const { data, error } = await supabase
      .from("jovens")
      .select("id, nome_completo")
      .order("nome_completo");

    if (error?.code === "42501") {
      setAccessDenied(true);
      return;
    }

    setJovens((data as JovemOption[]) ?? []);
  }

  async function fetchProjetoIfEdit() {
    if (!id) return;

    const [projetoRes, participantesRes, orcamentosRes, anexosRes] = await Promise.all([
      supabase.from("projetos" as any).select("*").eq("id", id).single(),
      supabase
        .from("projeto_participantes" as any)
        .select("id, jovem_id, participante_nome, participante_contato, papel")
        .eq("projeto_id", id),
      supabase
        .from("projeto_orcamentos" as any)
        .select("id, fornecedor, valor, descritivo")
        .eq("projeto_id", id),
      supabase
        .from("projeto_anexos" as any)
        .select("id, tipo, nome_arquivo, storage_path, mime_type, tamanho_bytes")
        .eq("projeto_id", id),
    ]);

    if (projetoRes.error) {
      if (projetoRes.error.code === "42501") {
        setAccessDenied(true);
        return;
      }
      toast({ title: "Erro", description: "Projeto não encontrado", variant: "destructive" });
      navigate(basePath);
      return;
    }

    setFormData({
      nome: projetoRes.data.nome || "",
      descricao: projetoRes.data.descricao || "",
      setor: projetoRes.data.setor || "",
      status: projetoRes.data.status || "planejado",
      data_inicio: projetoRes.data.data_inicio || "",
      data_fim: projetoRes.data.data_fim || "",
    });

    setParticipantes((participantesRes.data as Participante[]) ?? []);
    setOrcamentos(
      ((orcamentosRes.data as any[]) || []).map((item) => ({
        id: item.id,
        fornecedor: item.fornecedor || "",
        valor: item.valor !== null && item.valor !== undefined ? String(item.valor) : "",
        descritivo: item.descritivo || "",
      })),
    );
    setAnexos(
      ((anexosRes.data as any[]) || []).map((item) => ({
        ...item,
        tamanho_bytes: item.tamanho_bytes?.toString() || "",
      })),
    );
  }

  const canSubmit = useMemo(() => formData.nome.trim().length > 0, [formData.nome]);

  function addParticipante() {
    setParticipantes((prev) => [
      ...prev,
      { jovem_id: "", participante_nome: "", participante_contato: "", papel: "" },
    ]);
  }

  function updateParticipante(index: number, patch: Partial<Participante>) {
    setParticipantes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeParticipante(index: number) {
    setParticipantes((prev) => prev.filter((_, i) => i !== index));
  }

  function addOrcamento() {
    setOrcamentos((prev) => [
      ...prev,
      { fornecedor: "", valor: "", descritivo: "" },
    ]);
  }

  function updateOrcamento(index: number, patch: Partial<Orcamento>) {
    setOrcamentos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeOrcamento(index: number) {
    setOrcamentos((prev) => prev.filter((_, i) => i !== index));
  }

  const valorTotalOrcamento = useMemo(
    () =>
      orcamentos.reduce((total, item) => {
        const value = Number(item.valor || 0);
        return total + (Number.isFinite(value) ? value : 0);
      }, 0),
    [orcamentos],
  );

  function updateAnexo(index: number, patch: Partial<ProjetoAnexo>) {
    setAnexos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  async function handleAttachmentUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    tipo: ProjetoAnexoTipo,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const tempProjetoId = id || crypto.randomUUID();
      const anexoId = crypto.randomUUID();
      const safeName = sanitizeDocumentoFileName(file.name);
      const storagePath = `projetos/${tempProjetoId}/${tipo}/${anexoId}/${safeName}`;

      const { error } = await supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || undefined,
          cacheControl: "3600",
        });

      if (error) throw error;

      setAnexos((prev) => [
        ...prev,
        {
          tipo,
          nome_arquivo: file.name,
          storage_path: storagePath,
          mime_type: file.type || "",
          tamanho_bytes: file.size.toString(),
        },
      ]);

      toast({
        title: "Arquivo enviado",
        description: `${ANEXO_TIPO_LABEL[tipo]} adicionado ao projeto.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message || "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachment(false);
      event.target.value = "";
    }
  }

  async function handleRemoveAnexo(index: number) {
    const target = anexos[index];
    if (!target) return;

    if (target.storage_path) {
      await deleteDocumentoArquivo(target.storage_path);
    }

    setAnexos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDownloadAnexo(storagePath: string) {
    try {
      const url = await createDocumentoSignedUrl(storagePath, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast({
        title: "Erro ao baixar arquivo",
        description: error.message || "Não foi possível gerar o link do arquivo.",
        variant: "destructive",
      });
    }
  }

  async function handleDownloadAll() {
    if (anexos.length === 0) {
      toast({
        title: "Sem arquivos",
        description: "Nenhum material foi anexado ao projeto.",
      });
      return;
    }

    try {
      const urls = await Promise.all(
        anexos.map((item) => createDocumentoSignedUrl(item.storage_path, 300)),
      );

      urls.forEach((url, index) => {
        window.setTimeout(() => {
          window.open(url, "_blank", "noopener,noreferrer");
        }, index * 250);
      });

      toast({
        title: "Download iniciado",
        description: "Os arquivos do projeto estão sendo abertos em sequência.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao baixar materiais",
        description: error.message || "Não foi possível iniciar o download total.",
        variant: "destructive",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        setor: formData.setor || null,
        status: formData.status,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
      };

      let projetoId = id;

      if (isEdit && id) {
        const { error } = await supabase
          .from("projetos" as any)
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("projetos" as any)
          .insert({ ...payload, created_by: user?.id || null })
          .select("id")
          .single();

        if (error) throw error;
        projetoId = inserted.id;
      }

      if (!projetoId) throw new Error("Projeto inválido");

      // Sincroniza participantes (MVP: replace-all)
      await supabase.from("projeto_participantes" as any).delete().eq("projeto_id", projetoId);

      const validParticipantes = participantes
        .filter((item) => item.jovem_id || item.participante_nome.trim())
        .map((item) => ({
          projeto_id: projetoId,
          jovem_id: item.jovem_id || null,
          participante_nome: item.jovem_id ? null : item.participante_nome.trim() || null,
          participante_contato: item.participante_contato.trim() || null,
          papel: item.papel.trim() || null,
          created_by: user?.id || null,
        }));

      if (validParticipantes.length > 0) {
        const { error: participantsError } = await supabase
          .from("projeto_participantes" as any)
          .insert(validParticipantes);
        if (participantsError) throw participantsError;
      }

      await supabase.from("projeto_orcamentos" as any).delete().eq("projeto_id", projetoId);

      const validOrcamentos = orcamentos
        .filter((item) => item.fornecedor.trim() || item.descritivo.trim() || item.valor)
        .map((item) => ({
          projeto_id: projetoId,
          fornecedor: item.fornecedor.trim() || "Fornecedor não informado",
          valor: item.valor ? Number(item.valor) : 0,
          descritivo: item.descritivo.trim() || null,
          created_by: user?.id || null,
        }));

      if (validOrcamentos.length > 0) {
        const { error: orcamentosError } = await supabase
          .from("projeto_orcamentos" as any)
          .insert(validOrcamentos);
        if (orcamentosError) throw orcamentosError;
      }

      await supabase.from("projeto_anexos" as any).delete().eq("projeto_id", projetoId);

      const validAnexos = anexos
        .filter((item) => item.nome_arquivo.trim() && item.storage_path.trim())
        .map((item) => ({
          projeto_id: projetoId,
          tipo: item.tipo,
          nome_arquivo: item.nome_arquivo.trim(),
          storage_path: item.storage_path.trim(),
          mime_type: item.mime_type.trim() || null,
          tamanho_bytes: item.tamanho_bytes ? Number(item.tamanho_bytes) : null,
          created_by: user?.id || null,
        }));

      if (validAnexos.length > 0) {
        const { error: anexosError } = await supabase
          .from("projeto_anexos" as any)
          .insert(validAnexos);
        if (anexosError) throw anexosError;
      }

      toast({ title: "Sucesso", description: isEdit ? "Projeto atualizado." : "Projeto criado." });
      navigate(basePath);
    } catch (err: any) {
      toast({
        title: err?.code === "42501" ? "Sem permissão" : "Erro ao salvar",
        description:
          err?.code === "42501"
            ? "Você não tem permissão para gerenciar projetos."
            : err?.message || "Falha ao salvar projeto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-destructive font-medium">Sem permissão para acessar projetos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="page-header mb-0">
          <h1 className="page-title">{isEdit ? "Editar projeto" : "Novo projeto"}</h1>
          <p className="page-description">
            {context === "pedagogico"
              ? "Cadastro de projeto pedagógico e participantes."
              : "Cadastro de projeto do Serviço Social e participantes."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do projeto</CardTitle>
            <CardDescription>Informações principais do projeto.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={4} value={formData.descricao} onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))} />
            </div>
            <div>
              <Label>Setor</Label>
              <Input value={SETOR_LABEL[formData.setor] || "Não informado"} disabled />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data início</Label>
              <Input type="date" value={formData.data_inicio} onChange={(e) => setFormData((prev) => ({ ...prev, data_inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input type="date" value={formData.data_fim} onChange={(e) => setFormData((prev) => ({ ...prev, data_fim: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Orçamento</CardTitle>
                <CardDescription>
                  Fornecedores, valores e descritivos previstos para o projeto.
                </CardDescription>
              </div>
              <div className="text-sm font-medium">
                Total: {formatCurrency(valorTotalOrcamento)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {orcamentos.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Nenhum item de orçamento adicionado.
              </div>
            ) : (
              <div className="space-y-3">
                {orcamentos.map((item, index) => (
                  <div key={`${item.id || "new"}-${index}`} className="rounded-md border p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_1.5fr_auto] md:items-end">
                      <div>
                        <Label>Fornecedor</Label>
                        <Input
                          value={item.fornecedor}
                          onChange={(event) =>
                            updateOrcamento(index, { fornecedor: event.target.value })
                          }
                          placeholder="Nome do fornecedor"
                        />
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valor}
                          onChange={(event) =>
                            updateOrcamento(index, { valor: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Descritivo</Label>
                        <Input
                          value={item.descritivo}
                          onChange={(event) =>
                            updateOrcamento(index, { descritivo: event.target.value })
                          }
                          placeholder="Descrição do item"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOrcamento(index)}
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="outline" onClick={addOrcamento}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participantes</CardTitle>
            <CardDescription>Jovens vinculados ou participantes externos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {participantes.map((item, index) => (
              <div key={`${item.id || "new"}-${index}`} className="rounded-md border p-3 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Jovem (opcional)</Label>
                    <Select
                      value={item.jovem_id}
                      onValueChange={(value) => updateParticipante(index, { jovem_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar jovem" />
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
                    <Label>Participante externo</Label>
                    <Input
                      disabled={!!item.jovem_id}
                      value={item.participante_nome}
                      onChange={(e) => updateParticipante(index, { participante_nome: e.target.value })}
                      placeholder="Nome"
                    />
                  </div>
                  <div>
                    <Label>Contato</Label>
                    <Input
                      value={item.participante_contato}
                      onChange={(e) => updateParticipante(index, { participante_contato: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Papel</Label>
                    <Input
                      value={item.papel}
                      onChange={(e) => updateParticipante(index, { papel: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeParticipante(index)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addParticipante}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar participante
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Materiais do projeto</CardTitle>
                <CardDescription>
                  Faça upload do texto do projeto, fotos e anexos gerais.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={handleDownloadAll}>
                <Download className="w-4 h-4 mr-2" />
                Baixar tudo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Button type="button" variant="outline" asChild disabled={uploadingAttachment}>
                <label className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Texto do projeto
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.odt"
                    onChange={(event) => handleAttachmentUpload(event, "texto_projeto")}
                  />
                </label>
              </Button>
              <Button type="button" variant="outline" asChild disabled={uploadingAttachment}>
                <label className="cursor-pointer">
                  <Image className="w-4 h-4 mr-2" />
                  Foto
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(event) => handleAttachmentUpload(event, "foto")}
                  />
                </label>
              </Button>
              <Button type="button" variant="outline" asChild disabled={uploadingAttachment}>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Outro anexo
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => handleAttachmentUpload(event, "anexo")}
                  />
                </label>
              </Button>
            </div>

            {uploadingAttachment ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando material...
              </div>
            ) : null}

            {anexos.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Nenhum material anexado ao projeto.
              </div>
            ) : (
              <div className="space-y-3">
                {anexos.map((item, index) => (
                  <div
                    key={`${item.id || "new"}-${index}`}
                    className="rounded-md border p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[160px_1fr_220px] md:items-center">
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={item.tipo}
                          onValueChange={(value: ProjetoAnexoTipo) =>
                            updateAnexo(index, { tipo: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="texto_projeto">Texto do projeto</SelectItem>
                            <SelectItem value="foto">Foto</SelectItem>
                            <SelectItem value="anexo">Anexo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Arquivo</Label>
                        <Input
                          value={item.nome_arquivo}
                          onChange={(e) =>
                            updateAnexo(index, { nome_arquivo: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAnexo(item.storage_path)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAnexo(index)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {ANEXO_TIPO_LABEL[item.tipo]} • {item.mime_type || "tipo não informado"} •{" "}
                      {item.tamanho_bytes || "0"} bytes
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? "Salvar alterações" : "Criar projeto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
