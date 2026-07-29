import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Paperclip, Plus, Save, Trash2, UploadCloud, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createDocumentoSignedUrl,
  DOCUMENTOS_BUCKET,
  sanitizeDocumentoFileName,
} from "@/lib/documentos";

type TurmaOption = { id: string; nome: string };
type JovemOption = { id: string; nome_completo: string };
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

type Registro = {
  id?: string;
  jovem_id: string;
  participante_nome: string;
  descricao: string;
  dificuldades: string[];
  plano_acao: string;
};

type ConselhoAttachment = {
  id: string;
  conselho_id: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  anexado_por: string | null;
  anexado_em: string;
};

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "Tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ConselhoClasseForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = Boolean(id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [jovens, setJovens] = useState<JovemOption[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<ConselhoAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const [formData, setFormData] = useState({
    turma_id: "",
    periodo: "",
    data_reuniao: "",
    pauta: "",
    parecer: "",
    plano_acao_turma: "",
    status: "aberto",
  });
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchOptions(), fetchRecordIfEdit()]);
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchOptions() {
    const [turmasRes, jovensRes] = await Promise.all([
      supabase.from("turmas").select("id, nome").order("nome"),
      supabase.from("jovens").select("id, nome_completo").order("nome_completo"),
    ]);

    if (turmasRes.error?.code === "42501" || jovensRes.error?.code === "42501") {
      setAccessDenied(true);
      return;
    }

    setTurmas((turmasRes.data as TurmaOption[]) ?? []);
    setJovens((jovensRes.data as JovemOption[]) ?? []);
  }

  async function fetchRecordIfEdit() {
    if (!id) return;

    setLoadingAttachments(true);
    const [conselhoRes, registrosRes, anexosRes] = await Promise.all([
      supabase.from("conselho_classe" as any).select("*").eq("id", id).single(),
      supabase
        .from("conselho_classe_registros" as any)
        .select("id, jovem_id, participante_nome, descricao, dificuldades, plano_acao")
        .eq("conselho_id", id),
      supabase
        .from("conselho_classe_anexos" as any)
        .select("id, conselho_id, nome_arquivo, storage_path, mime_type, tamanho_bytes, anexado_por, anexado_em")
        .eq("conselho_id", id)
        .order("anexado_em", { ascending: false }),
    ]);

    if (conselhoRes.error) {
      if (conselhoRes.error.code === "42501") {
        setAccessDenied(true);
        setLoadingAttachments(false);
        return;
      }
      toast({ title: "Erro", description: "Conselho não encontrado", variant: "destructive" });
      setLoadingAttachments(false);
      navigate("/conselho-classe");
      return;
    }

    setFormData({
      turma_id: conselhoRes.data.turma_id || "",
      periodo: conselhoRes.data.periodo || "",
      data_reuniao: conselhoRes.data.data_reuniao || "",
      pauta: conselhoRes.data.pauta || "",
      parecer: conselhoRes.data.parecer || "",
      plano_acao_turma: conselhoRes.data.plano_acao_turma || "",
      status: conselhoRes.data.status || "aberto",
    });

    const registrosRaw = ((registrosRes.data as any[]) ?? []).map((item) => ({
      id: item.id,
      jovem_id: item.jovem_id || "",
      participante_nome: item.participante_nome || "",
      descricao: item.descricao || "",
      dificuldades: Array.isArray(item.dificuldades) ? item.dificuldades.filter(Boolean) : [],
      plano_acao: item.plano_acao || "",
    }));
    setRegistros(registrosRaw as Registro[]);

    if (anexosRes.error?.code === "42501") {
      setAccessDenied(true);
      setLoadingAttachments(false);
      return;
    }
    setAttachments(((anexosRes.data as ConselhoAttachment[]) || []));
    setLoadingAttachments(false);
  }

  const canSubmit = useMemo(() => formData.data_reuniao.trim().length > 0, [formData.data_reuniao]);

  function addRegistro() {
    setRegistros((prev) => [
      ...prev,
      { jovem_id: "", participante_nome: "", descricao: "", dificuldades: [], plano_acao: "" },
    ]);
  }

  function updateRegistro(index: number, patch: Partial<Registro>) {
    setRegistros((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeRegistro(index: number) {
    setRegistros((prev) => prev.filter((_, i) => i !== index));
  }

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const oversizedFiles = files.filter((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES);
    const validFiles = files.filter((file) => file.size <= MAX_ATTACHMENT_SIZE_BYTES);

    if (oversizedFiles.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: `Cada anexo deve ter no máximo 10 MB. Revise: ${oversizedFiles
          .map((file) => file.name)
          .join(", ")}`,
        variant: "destructive",
      });
    }

    setSelectedFiles((prev) => {
      const existingKeys = new Set(
        prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );
      const next = [...prev];
      validFiles.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingKeys.has(key)) {
          next.push(file);
          existingKeys.add(key);
        }
      });
      return next;
    });

    event.target.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  async function uploadConselhoAttachments(conselhoId: string, userId?: string | null) {
    if (selectedFiles.length === 0) return;

    const uploadedPaths: string[] = [];
    const insertedIds: string[] = [];

    try {
      for (const file of selectedFiles) {
        const attachmentId = crypto.randomUUID();
        const safeName = sanitizeDocumentoFileName(file.name);
        const storagePath = `conselho-classe/${conselhoId}/${attachmentId}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(DOCUMENTOS_BUCKET)
          .upload(storagePath, file, {
            upsert: false,
            contentType: file.type || undefined,
            cacheControl: "3600",
          });

        if (uploadError) throw uploadError;
        uploadedPaths.push(storagePath);

        const { error: insertError } = await supabase
          .from("conselho_classe_anexos" as any)
          .insert({
            id: attachmentId,
            conselho_id: conselhoId,
            nome_arquivo: file.name,
            storage_path: storagePath,
            mime_type: file.type || null,
            tamanho_bytes: file.size,
            anexado_por: userId || null,
          });

        if (insertError) throw insertError;
        insertedIds.push(attachmentId);
      }
    } catch (error) {
      if (insertedIds.length > 0) {
        await supabase
          .from("conselho_classe_anexos" as any)
          .delete()
          .in("id", insertedIds);
      }
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(DOCUMENTOS_BUCKET).remove(uploadedPaths);
      }
      throw error;
    }
  }

  async function handleDownloadAttachment(attachment: ConselhoAttachment) {
    try {
      const signedUrl = await createDocumentoSignedUrl(attachment.storage_path, 300);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast({
        title: "Erro ao abrir anexo",
        description: error.message || "Não foi possível gerar o link do arquivo.",
        variant: "destructive",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    let conselhoPersistido = false;
    let salvandoAnexos = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        turma_id: formData.turma_id || null,
        periodo: formData.periodo.trim() || null,
        data_reuniao: formData.data_reuniao,
        pauta: formData.pauta.trim() || null,
        parecer: formData.parecer.trim() || null,
        plano_acao_turma: formData.plano_acao_turma.trim() || null,
        status: formData.status,
      };

      let conselhoId = id;

      if (isEdit && id) {
        const { error } = await supabase.from("conselho_classe" as any).update(payload).eq("id", id);
        if (error) throw error;
        conselhoPersistido = true;
      } else {
        const { data: inserted, error } = await supabase
          .from("conselho_classe" as any)
          .insert({ ...payload, created_by: user?.id || null })
          .select("id")
          .single();

        if (error) throw error;
        conselhoId = inserted.id;
        conselhoPersistido = true;
      }

      if (!conselhoId) throw new Error("Conselho inválido");

      await supabase.from("conselho_classe_registros" as any).delete().eq("conselho_id", conselhoId);

      const validRegistros = registros
        .filter((item) => item.jovem_id || item.participante_nome.trim() || item.descricao.trim())
        .map((item) => ({
          conselho_id: conselhoId,
          jovem_id: item.jovem_id || null,
          participante_nome: item.jovem_id ? null : item.participante_nome.trim() || null,
          descricao: item.descricao.trim() || null,
          dificuldades: item.dificuldades || [],
          plano_acao: item.plano_acao.trim() || null,
          created_by: user?.id || null,
        }));

      if (validRegistros.length > 0) {
        const { error: registrosError } = await supabase
          .from("conselho_classe_registros" as any)
          .insert(validRegistros);
        if (registrosError) throw registrosError;
      }

      salvandoAnexos = true;
      await uploadConselhoAttachments(conselhoId, user?.id || null);

      toast({
        title: "Sucesso",
        description:
          selectedFiles.length > 0
            ? `${isEdit ? "Conselho atualizado" : "Conselho criado"} com ${selectedFiles.length} anexo(s).`
            : isEdit
              ? "Conselho atualizado."
              : "Conselho criado.",
      });
      navigate("/conselho-classe");
    } catch (err: any) {
      toast({
        title:
          err?.code === "42501"
            ? "Sem permissão"
            : conselhoPersistido && salvandoAnexos
              ? "Conselho salvo, mas houve erro nos anexos"
              : "Erro ao salvar",
        description:
          err?.code === "42501"
            ? "Você não tem permissão para gerenciar conselho de classe."
            : err?.message || "Falha ao salvar conselho",
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
        <p className="text-destructive font-medium">Sem permissão para acessar conselho de classe.</p>
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
          <h1 className="page-title">{isEdit ? "Editar conselho" : "Novo conselho"}</h1>
          <p className="page-description">Cadastro de reunião de conselho de classe.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da reunião</CardTitle>
            <CardDescription>Turma, período e parecer geral.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Turma</Label>
              <Select value={formData.turma_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, turma_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Período</Label>
              <Input value={formData.periodo} onChange={(e) => setFormData((prev) => ({ ...prev, periodo: e.target.value }))} />
            </div>
            <div>
              <Label>Data da reunião *</Label>
              <Input type="date" value={formData.data_reuniao} onChange={(e) => setFormData((prev) => ({ ...prev, data_reuniao: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Pauta</Label>
              <Textarea rows={3} value={formData.pauta} onChange={(e) => setFormData((prev) => ({ ...prev, pauta: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Parecer geral</Label>
              <Textarea rows={4} value={formData.parecer} onChange={(e) => setFormData((prev) => ({ ...prev, parecer: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Plano de ação da classe</Label>
              <Textarea
                rows={4}
                value={formData.plano_acao_turma}
                onChange={(e) => setFormData((prev) => ({ ...prev, plano_acao_turma: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-primary" />
              Anexos
            </CardTitle>
            <CardDescription>Documentos relacionados ao conselho de classe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 rounded-md border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Selecionar arquivos</p>
                  <p className="text-xs text-muted-foreground">
                    PDF, imagens ou documentos. Até 10 MB por arquivo.
                  </p>
                </div>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
                onChange={handleFilesSelected}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Anexar documentos
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Arquivos selecionados</p>
                <div className="grid gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSelectedFile(index)}
                        title="Remover arquivo"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEdit && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Arquivos já anexados</p>
                {loadingAttachments ? (
                  <p className="text-sm text-muted-foreground">Carregando anexos...</p>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum anexo enviado.</p>
                ) : (
                  <div className="grid gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {attachment.nome_arquivo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.tamanho_bytes)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registros da reunião</CardTitle>
            <CardDescription>Participantes e registros individuais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {registros.map((item, index) => (
              <div key={`${item.id || "new"}-${index}`} className="rounded-md border p-3 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Jovem (opcional)</Label>
                    <Select value={item.jovem_id} onValueChange={(value) => updateRegistro(index, { jovem_id: value })}>
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
                      onChange={(e) => updateRegistro(index, { participante_nome: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Campo descritivo</Label>
                    <Textarea
                      rows={3}
                      value={item.descricao}
                      onChange={(e) => updateRegistro(index, { descricao: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dificuldades (palavras-chave)</Label>
                    <KeywordInput
                      values={item.dificuldades}
                      onChange={(values) => updateRegistro(index, { dificuldades: values })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Plano de ação</Label>
                    <Textarea
                      rows={3}
                      value={item.plano_acao}
                      onChange={(e) => updateRegistro(index, { plano_acao: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeRegistro(index)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addRegistro}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar registro
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? "Salvar alterações" : "Criar conselho"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function KeywordInput({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addKeyword = (raw: string) => {
    const keyword = raw.trim();
    if (!keyword) return;
    if (values.some((item) => item.toLowerCase() === keyword.toLowerCase())) return;
    onChange([...values, keyword]);
    setInput("");
  };

  const removeKeyword = (target: string) => {
    onChange(values.filter((item) => item !== target));
  };

  return (
    <div className="space-y-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addKeyword(input);
          }
          if (e.key === "Backspace" && !input && values.length > 0) {
            removeKeyword(values[values.length - 1]);
          }
        }}
        onBlur={() => {
          if (input.trim()) addKeyword(input);
        }}
        placeholder="Digite e pressione Enter"
      />
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className="text-xs px-2 py-1 rounded-full border bg-muted hover:bg-muted/80"
              onClick={() => removeKeyword(keyword)}
              title="Remover"
            >
              {keyword} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
