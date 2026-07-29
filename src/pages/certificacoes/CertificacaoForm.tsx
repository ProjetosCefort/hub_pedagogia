import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Paperclip, Save, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDocumentoSignedUrl, deleteDocumentoArquivo, DOCUMENTOS_BUCKET, sanitizeDocumentoFileName } from "@/lib/documentos";

type Anexo = {
  id?: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string;
  tamanho_bytes: string;
};

export default function CertificacaoForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    orgao_emissor: "",
    data_emissao: "",
    data_validade: "",
    notificar_antes_dias: "30",
    status: "vigente",
    observacoes: "",
  });
  const [anexos, setAnexos] = useState<Anexo[]>([]);

  useEffect(() => {
    (async () => {
      await fetchRecordIfEdit();
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchRecordIfEdit() {
    if (!id) return;

    const [certRes, anexosRes] = await Promise.all([
      supabase.from("certificacoes" as any).select("*").eq("id", id).single(),
      supabase
        .from("certificacao_anexos" as any)
        .select("id, nome_arquivo, storage_path, mime_type, tamanho_bytes")
        .eq("certificacao_id", id),
    ]);

    if (certRes.error) {
      if (certRes.error.code === "42501") {
        setAccessDenied(true);
        return;
      }
      toast({ title: "Erro", description: "Certificação não encontrada", variant: "destructive" });
      navigate("/certificacoes");
      return;
    }

    setFormData({
      titulo: certRes.data.titulo || "",
      orgao_emissor: certRes.data.orgao_emissor || "",
      data_emissao: certRes.data.data_emissao || "",
      data_validade: certRes.data.data_validade || "",
      notificar_antes_dias: (certRes.data.notificar_antes_dias ?? 30).toString(),
      status: certRes.data.status || "vigente",
      observacoes: certRes.data.observacoes || "",
    });

    setAnexos(
      ((anexosRes.data as any[]) || []).map((item) => ({
        ...item,
        tamanho_bytes: item.tamanho_bytes?.toString() || "",
      })),
    );
  }

  const canSubmit = useMemo(
    () => formData.titulo.trim().length > 0 && formData.orgao_emissor.trim().length > 0,
    [formData.titulo, formData.orgao_emissor],
  );

  function updateAnexo(index: number, patch: Partial<Anexo>) {
    setAnexos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeAnexo(index: number) {
    setAnexos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const tempCertificacaoId = id || crypto.randomUUID();
      const attachmentId = crypto.randomUUID();
      const safeName = sanitizeDocumentoFileName(file.name);
      const storagePath = `certificacoes/${tempCertificacaoId}/${attachmentId}/${safeName}`;

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
          nome_arquivo: file.name,
          storage_path: storagePath,
          mime_type: file.type || "",
          tamanho_bytes: file.size.toString(),
        },
      ]);

      toast({
        title: "Arquivo enviado",
        description: "O anexo foi adicionado à certificação.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message || "Não foi possível enviar o anexo.",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachment(false);
      event.target.value = "";
    }
  }

  async function handleDownload(storagePath: string) {
    try {
      const url = await createDocumentoSignedUrl(storagePath, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast({
        title: "Erro ao baixar arquivo",
        description: error.message || "Não foi possível gerar o link do anexo.",
        variant: "destructive",
      });
    }
  }

  async function handleRemoveAnexo(index: number) {
    const target = anexos[index];
    if (!target) return;

    if (target.storage_path) {
      await deleteDocumentoArquivo(target.storage_path);
    }
    removeAnexo(index);
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
        tipo: "certificacao",
        titulo: formData.titulo.trim(),
        orgao_emissor: formData.orgao_emissor.trim(),
        data_emissao: formData.data_emissao || null,
        data_validade: formData.data_validade || null,
        notificar_antes_dias: formData.notificar_antes_dias
          ? Number(formData.notificar_antes_dias)
          : 30,
        status: formData.status,
        observacoes: formData.observacoes.trim() || null,
      };

      let certId = id;

      if (isEdit && id) {
        const { error } = await supabase.from("certificacoes" as any).update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("certificacoes" as any)
          .insert({ ...payload, created_by: user?.id || null })
          .select("id")
          .single();
        if (error) throw error;
        certId = inserted.id;
      }

      if (!certId) throw new Error("Certificação inválida");

      await supabase.from("certificacao_anexos" as any).delete().eq("certificacao_id", certId);

      const validAnexos = anexos
        .filter((item) => item.nome_arquivo.trim() && item.storage_path.trim())
        .map((item) => ({
          certificacao_id: certId,
          nome_arquivo: item.nome_arquivo.trim(),
          storage_path: item.storage_path.trim(),
          mime_type: item.mime_type.trim() || null,
          tamanho_bytes: item.tamanho_bytes ? Number(item.tamanho_bytes) : null,
          created_by: user?.id || null,
        }));

      if (validAnexos.length > 0) {
        const { error: anexosError } = await supabase.from("certificacao_anexos" as any).insert(validAnexos);
        if (anexosError) throw anexosError;
      }

      toast({ title: "Sucesso", description: isEdit ? "Certificação atualizada." : "Certificação criada." });
      navigate("/certificacoes");
    } catch (err: any) {
      toast({
        title: err?.code === "42501" ? "Sem permissão" : "Erro ao salvar",
        description:
          err?.code === "42501"
            ? "Você não tem permissão para gerenciar certificações."
            : err?.message || "Falha ao salvar certificação",
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
        <p className="text-destructive font-medium">Sem permissão para acessar certificações.</p>
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
          <h1 className="page-title">{isEdit ? "Editar certificação" : "Nova certificação"}</h1>
          <p className="page-description">Cadastro de certificação e anexos.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da certificação</CardTitle>
            <CardDescription>Informações principais e validade.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Título *</Label>
              <Input value={formData.titulo} onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))} />
            </div>
            <div>
              <Label>Órgão emissor *</Label>
              <Select
                value={formData.orgao_emissor}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, orgao_emissor: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o órgão emissor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A definir">A definir</SelectItem>
                  <SelectItem value="MTE">MTE</SelectItem>
                  <SelectItem value="MEC">MEC</SelectItem>
                  <SelectItem value="SEDUC">SEDUC</SelectItem>
                  <SelectItem value="SENAI">SENAI</SelectItem>
                  <SelectItem value="SENAC">SENAC</SelectItem>
                  <SelectItem value="SEBRAE">SEBRAE</SelectItem>
                  <SelectItem value="CIEE">CIEE</SelectItem>
                  <SelectItem value="Cefort">Cefort</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="vencido" disabled>
                    Vencido (automático)
                  </SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                O status passa para vencido automaticamente quando a validade expira.
              </p>
            </div>
            <div>
              <Label>Data de emissão</Label>
              <Input type="date" value={formData.data_emissao} onChange={(e) => setFormData((prev) => ({ ...prev, data_emissao: e.target.value }))} />
            </div>
            <div>
              <Label>Data de validade</Label>
              <Input type="date" value={formData.data_validade} onChange={(e) => setFormData((prev) => ({ ...prev, data_validade: e.target.value }))} />
            </div>
            <div>
              <Label>Notificar com antecedência (dias)</Label>
              <Input
                type="number"
                min={0}
                value={formData.notificar_antes_dias}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notificar_antes_dias: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={4} value={formData.observacoes} onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anexos</CardTitle>
            <CardDescription>
              Faça upload do documento e mantenha os arquivos vinculados à certificação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium">Adicionar arquivo</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, imagem ou documento de apoio. O arquivo é enviado para o storage do sistema.
                  </p>
                </div>
                <Button type="button" variant="outline" asChild disabled={uploadingAttachment}>
                  <label className="cursor-pointer">
                    {uploadingAttachment ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploadingAttachment ? "Enviando..." : "Selecionar arquivo"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                    />
                  </label>
                </Button>
              </div>
            </div>

            {anexos.map((item, index) => (
              <div key={`${item.id || "new"}-${index}`} className="rounded-md border p-3 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Nome arquivo *</Label>
                    <Input
                      value={item.nome_arquivo}
                      onChange={(e) => updateAnexo(index, { nome_arquivo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Storage path *</Label>
                    <Input
                      value={item.storage_path}
                      onChange={(e) => updateAnexo(index, { storage_path: e.target.value })}
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>MIME type</Label>
                    <Input
                      value={item.mime_type}
                      onChange={(e) => updateAnexo(index, { mime_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Tamanho (bytes)</Label>
                    <Input
                      value={item.tamanho_bytes}
                      onChange={(e) => updateAnexo(index, { tamanho_bytes: e.target.value })}
                      readOnly
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(item.storage_path)}
                    disabled={!item.storage_path}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAnexo(index)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}

            {anexos.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                <Paperclip className="w-4 h-4" />
                Nenhum anexo vinculado até o momento.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? "Salvar alterações" : "Criar certificação"}
          </Button>
        </div>
      </form>
    </div>
  );
}
