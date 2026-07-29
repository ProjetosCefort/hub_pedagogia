import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Download, FileText, Info, MessageCircle, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DOCUMENTO_TIPOS,
  type DocumentoTipo,
  createDocumentoSignedUrl,
  deleteDocumentoArquivo,
  sanitizeDocumentoFileName,
  uploadDocumentoArquivo,
} from "@/lib/documentos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const STATUS_CONFIG: Record<
  Tables<"documentos_jovem">["status_validacao"],
  { label: string; className: string }
> = {
  pendente: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
  rejeitado: {
    label: "Rejeitado",
    className: "bg-rose-100 text-rose-900 border-rose-200",
  },
};

type DocumentoRecord = Tables<"documentos_jovem"> & {
  enviadoPorNome?: string | null;
  validadoPorNome?: string | null;
};
type DocumentoEmitidoRecord = Tables<"documentos_emitidos_jovem"> & {
  emitidoPorNome?: string | null;
  modeloNome?: string | null;
};
type JovemContact = {
  nome: string;
  telefone: string | null;
};

const DOCUMENTO_EMITIDO_TIPOS = [
  { value: "certificado", label: "Certificado" },
  { value: "comprovante_matricula", label: "Comprovante de matricula" },
  { value: "advertencia", label: "Advertencia" },
  { value: "outros", label: "Outros" },
] as const;
type DocumentoEmitidoTipo = (typeof DOCUMENTO_EMITIDO_TIPOS)[number]["value"];

interface JovemDocumentosTabProps {
  jovemId: string;
  onDocumentsChange?: () => void;
}

export function JovemDocumentosTab({ jovemId, onDocumentsChange }: JovemDocumentosTabProps) {
  const [documents, setDocuments] = useState<DocumentoRecord[]>([]);
  const [emittedDocuments, setEmittedDocuments] = useState<DocumentoEmitidoRecord[]>([]);
  const [jovemContact, setJovemContact] = useState<JovemContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEmitted, setLoadingEmitted] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<DocumentoTipo>("rg");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [emitTipo, setEmitTipo] = useState<DocumentoEmitidoTipo>("certificado");
  const [emitFilterTipo, setEmitFilterTipo] = useState<"all" | DocumentoEmitidoTipo>("all");
  const [emitTitulo, setEmitTitulo] = useState("");
  const [emitObservacao, setEmitObservacao] = useState("");
  const [emitFile, setEmitFile] = useState<File | null>(null);
  const [emitModeloId, setEmitModeloId] = useState<string>("none");
  const [modelosDocumento, setModelosDocumento] = useState<
    Array<{ id: string; nome: string; tipo: DocumentoEmitidoTipo; ativo: boolean }>
  >([]);
  const [supportsEmittedDocuments, setSupportsEmittedDocuments] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [validationModal, setValidationModal] = useState<{
    open: boolean;
    mode: "approve" | "reject";
    documento: DocumentoRecord | null;
  }>({ open: false, mode: "approve", documento: null });
  const [validationReason, setValidationReason] = useState("");
  const [validationExpiryDate, setValidationExpiryDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emitFileInputRef = useRef<HTMLInputElement | null>(null);
  const { roles, user } = useAuth();
  const { toast } = useToast();

  const canValidate = useMemo(
    () => roles.includes("admin") || roles.includes("gestor"),
    [roles],
  );
  const documentosUploadUrl = useMemo(() => {
    if (typeof window === "undefined") return "/acesso-jovem";
    return `${window.location.origin}/acesso-jovem`;
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setPermissionDenied(false);
    try {
      const { data, error } = await supabase
        .from("documentos_jovem")
        .select("*")
        .eq("jovem_id", jovemId)
        .order("enviado_em", { ascending: false });

      if (error) {
        if (error.code === "42501" || /permission denied/i.test(error.message)) {
          setPermissionDenied(true);
          setDocuments([]);
          return;
        }
        throw error;
      }

      const docs = data ?? [];
      const userIds = new Set<string>();
      docs.forEach((doc) => {
        if (doc.enviado_por) userIds.add(doc.enviado_por);
        if (doc.validado_por) userIds.add(doc.validado_por);
      });

      const profilesMap = new Map<string, { nome_completo: string | null }>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", Array.from(userIds));

        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, { nome_completo: profile.nome_completo });
        });
      }

      const enriched = docs.map((doc) => ({
        ...doc,
        enviadoPorNome: doc.enviado_por
          ? profilesMap.get(doc.enviado_por)?.nome_completo ?? null
          : null,
        validadoPorNome: doc.validado_por
          ? profilesMap.get(doc.validado_por)?.nome_completo ?? null
          : null,
      }));

      setDocuments(enriched);
    } catch (error: any) {
      console.error("Erro ao carregar documentos:", error);
      toast({
        title: "Erro",
        description: error.message || "Nao foi possivel carregar os documentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [jovemId, toast]);

  const fetchJovemContact = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("jovens")
        .select("nome_completo, celular, telefone")
        .eq("id", jovemId)
        .maybeSingle();

      if (error) throw error;

      setJovemContact({
        nome: data?.nome_completo || "jovem",
        telefone: data?.celular || data?.telefone || null,
      });
    } catch (error) {
      console.error("Erro ao carregar contato do jovem:", error);
      setJovemContact(null);
    }
  }, [jovemId]);

  useEffect(() => {
    fetchDocuments();
    fetchJovemContact();
    if (supportsEmittedDocuments) {
      fetchModelosDocumento();
      fetchEmittedDocuments();
    } else {
      setModelosDocumento([]);
      setEmittedDocuments([]);
      setLoadingEmitted(false);
    }
  }, [fetchDocuments, fetchJovemContact]);

  useEffect(() => {
    if (!supportsEmittedDocuments) {
      setEmittedDocuments([]);
      return;
    }
    fetchEmittedDocuments();
  }, [modelosDocumento.length, jovemId, supportsEmittedDocuments]);

  async function fetchModelosDocumento() {
    try {
      const { data, error } = await supabase
        .from("config_modelos_documentos")
        .select("id, nome, tipo, ativo")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) {
        if (error.code === "PGRST205") {
          setSupportsEmittedDocuments(false);
          setModelosDocumento([]);
          return;
        }
        throw error;
      }
      setModelosDocumento((data || []) as Array<{ id: string; nome: string; tipo: DocumentoEmitidoTipo; ativo: boolean }>);
    } catch (error: any) {
      console.error("Erro ao carregar modelos de documento:", error);
    }
  }

  async function fetchEmittedDocuments() {
    setLoadingEmitted(true);
    try {
      const { data, error } = await supabase
        .from("documentos_emitidos_jovem")
        .select("*")
        .eq("jovem_id", jovemId)
        .order("emitido_em", { ascending: false });

      if (error) {
        if (error.code === "PGRST205") {
          setSupportsEmittedDocuments(false);
          setEmittedDocuments([]);
          return;
        }
        if (error.code === "42501" || /permission denied/i.test(error.message)) {
          setPermissionDenied(true);
          setEmittedDocuments([]);
          return;
        }
        throw error;
      }

      const emitidos = (data || []) as Tables<"documentos_emitidos_jovem">[];
      const userIds = new Set<string>();
      emitidos.forEach((doc) => {
        if (doc.emitido_por) userIds.add(doc.emitido_por);
      });

      const profilesMap = new Map<string, { nome_completo: string | null }>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", Array.from(userIds));
        profiles?.forEach((profile) => {
          profilesMap.set(profile.id, { nome_completo: profile.nome_completo });
        });
      }

      const modeloMap = new Map<string, string>();
      modelosDocumento.forEach((modelo) => {
        modeloMap.set(modelo.id, modelo.nome);
      });

      setEmittedDocuments(
        emitidos.map((doc) => ({
          ...doc,
          emitidoPorNome: doc.emitido_por
            ? profilesMap.get(doc.emitido_por)?.nome_completo ?? null
            : null,
          modeloNome: doc.modelo_id ? modeloMap.get(doc.modelo_id) || null : null,
        })),
      );
    } catch (error: any) {
      console.error("Erro ao carregar documentos emitidos:", error);
      toast({
        title: "Erro",
        description: error.message || "Nao foi possivel carregar o historico de documentos emitidos.",
        variant: "destructive",
      });
    } finally {
      setLoadingEmitted(false);
    }
  }

  function resetUploadForm() {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetEmitForm() {
    setEmitTitulo("");
    setEmitObservacao("");
    setEmitModeloId("none");
    setEmitFile(null);
    if (emitFileInputRef.current) {
      emitFileInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      toast({
        title: "Selecione os arquivos",
        description: "Escolha pelo menos um arquivo antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      toast({
        title: "Arquivo muito grande",
        description: `"${oversizedFile.name}" excede o limite de 10 MB.`,
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Sessao expirada",
        description: "Realize login novamente para enviar documentos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const uploadedPaths: string[] = [];
    const insertedIds: string[] = [];

    try {
      for (const file of selectedFiles) {
        const documentoId = crypto.randomUUID();
        const { storagePath } = await uploadDocumentoArquivo({
          jovemId,
          documentoId,
          file,
        });
        uploadedPaths.push(storagePath);

        const { error } = await supabase.from("documentos_jovem").insert({
          id: documentoId,
          jovem_id: jovemId,
          tipo: selectedTipo,
          nome_arquivo: file.name,
          storage_path: storagePath,
          mime_type: file.type || null,
          tamanho_bytes: file.size,
          enviado_por: user.id,
        });

        if (error) {
          throw error;
        }

        insertedIds.push(documentoId);
      }

      toast({
        title:
          selectedFiles.length === 1
            ? "Documento enviado"
            : `${selectedFiles.length} documentos enviados`,
      });
      resetUploadForm();
      await fetchDocuments();
      onDocumentsChange?.();
    } catch (error: any) {
      console.error("Erro ao enviar documento:", error);
      if (insertedIds.length > 0) {
        await supabase.from("documentos_jovem").delete().in("id", insertedIds);
      }
      if (uploadedPaths.length > 0) {
        await Promise.allSettled(uploadedPaths.map((path) => deleteDocumentoArquivo(path)));
      }
      toast({
        title: "Falha ao enviar",
        description: error.message || "Verifique o arquivo e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleEmitDocument() {
    if (!supportsEmittedDocuments) {
      toast({
        title: "Recurso indisponivel",
        description: "A emissao interna de documentos nao esta habilitada neste ambiente.",
        variant: "destructive",
      });
      return;
    }

    if (!emitFile) {
      toast({
        title: "Selecione um arquivo",
        description: "Escolha um arquivo antes de emitir o documento.",
        variant: "destructive",
      });
      return;
    }

    if (!emitTitulo.trim()) {
      toast({
        title: "Titulo obrigatorio",
        description: "Informe um titulo para o documento emitido.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Sessao expirada",
        description: "Realize login novamente para emitir documentos.",
        variant: "destructive",
      });
      return;
    }

    setEmitting(true);
    try {
      const documentoId = crypto.randomUUID();
      const safeName = sanitizeDocumentoFileName(emitFile.name);
      const storagePath = `emitidos/${jovemId}/${documentoId}/${safeName}`;

      const { error: uploadError } = await supabase.storage.from("documentos").upload(
        storagePath,
        emitFile,
        {
          upsert: false,
          contentType: emitFile.type || undefined,
          cacheControl: "3600",
        },
      );
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documentos_emitidos_jovem").insert({
        id: documentoId,
        jovem_id: jovemId,
        modelo_id: emitModeloId === "none" ? null : emitModeloId,
        tipo: emitTipo,
        titulo: emitTitulo.trim(),
        observacao: emitObservacao.trim() || null,
        nome_arquivo: emitFile.name,
        storage_path: storagePath,
        mime_type: emitFile.type || null,
        tamanho_bytes: emitFile.size,
        emitido_por: user.id,
      });

      if (insertError) {
        await deleteDocumentoArquivo(storagePath);
        throw insertError;
      }

      toast({ title: "Documento emitido com sucesso" });
      resetEmitForm();
      await fetchEmittedDocuments();
    } catch (error: any) {
      console.error("Erro ao emitir documento:", error);
      toast({
        title: "Falha ao emitir",
        description: error.message || "Nao foi possivel registrar o documento emitido.",
        variant: "destructive",
      });
    } finally {
      setEmitting(false);
    }
  }

  function openValidationModal(doc: DocumentoRecord, mode: "approve" | "reject") {
    setValidationModal({ open: true, mode, documento: doc });
    setValidationReason(doc.observacao_validacao ?? "");
    setValidationExpiryDate(doc.validade_em ?? "");
  }

  function closeValidationModal() {
    setValidationModal({ open: false, mode: "approve", documento: null });
    setValidationReason("");
    setValidationExpiryDate("");
    setActionLoading(false);
  }

  async function handleValidationSubmit() {
    if (!validationModal.documento || !user?.id) return;
    if (validationModal.mode === "reject" && !validationReason.trim()) {
      toast({
        title: "Informe o motivo",
        description: "O motivo da rejeicao e obrigatorio.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const status = validationModal.mode === "approve" ? "aprovado" : "rejeitado";
      const updatePayload: TablesUpdate<"documentos_jovem"> = {
        status_validacao: status,
        observacao_validacao: validationReason.trim() || null,
        validado_em: new Date().toISOString(),
        validado_por: user.id,
      };

      if (validationModal.mode === "approve") {
        updatePayload.validade_em = validationExpiryDate || null;
      }

      const { error } = await supabase
        .from("documentos_jovem")
        .update(updatePayload)
        .eq("id", validationModal.documento.id);

      if (error) {
        throw error;
      }

      toast({
        title: status === "aprovado" ? "Documento aprovado" : "Documento rejeitado",
      });
      closeValidationModal();
      await fetchDocuments();
      onDocumentsChange?.();
    } catch (error: any) {
      console.error("Erro ao validar documento:", error);
      toast({
        title: "Falha na validacao",
        description: error.message || "Nao foi possivel atualizar o status.",
        variant: "destructive",
      });
      setActionLoading(false);
    }
  }

  async function handleDownload(doc: { storage_path: string }) {
    try {
      const url = await createDocumentoSignedUrl(doc.storage_path);
      window.open(url, "_blank", "noopener");
    } catch (error: any) {
      toast({
        title: "Download indisponivel",
        description: error.message || "Nao foi possivel gerar o link temporario.",
        variant: "destructive",
      });
    }
  }

  function handleSendRenewalWhatsApp(doc: DocumentoRecord) {
    const telefone = formatWhatsAppPhone(jovemContact?.telefone ?? null);
    if (!telefone) {
      toast({
        title: "Telefone não informado",
        description: "Não foi possível abrir o WhatsApp sem telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const tipoLabel = getDocumentoTipoLabel(doc.tipo);
    const validade = formatDate(doc.validade_em);
    const nome = jovemContact?.nome || "jovem";
    const mensagem = [
      `Olá, ${nome}!`,
      `Identificamos que seu documento ${tipoLabel} venceu em ${validade}.`,
      "Para regularizar, acesse seu registro e envie um novo documento atualizado:",
      documentosUploadUrl,
      "",
      "Você deverá informar seu CPF e data de nascimento para acessar.",
    ].join("\n");

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const uploadDisabled = uploading || selectedFiles.length === 0;
  const filteredEmittedDocuments = emittedDocuments.filter((doc) =>
    emitFilterTipo === "all" ? true : doc.tipo === emitFilterTipo,
  );

  return (
    <div className="space-y-6">
      {permissionDenied ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription>
            Voce precisa de permissao de staff para visualizar os documentos deste jovem.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UploadCloud className="h-4 w-4" />
                Enviar documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipo de documento
                  </label>
                  <Select value={selectedTipo} onValueChange={(value) => setSelectedTipo(value as DocumentoTipo)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENTO_TIPOS.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Arquivo (PDF ou imagem)
                  </label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(event) =>
                      setSelectedFiles(Array.from(event.target.files ?? []))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} arquivo(s) selecionado(s)`
                      : "Max. 10 MB por arquivo"}
                  </p>
                </div>
              </div>
              <Button onClick={handleUpload} disabled={uploadDisabled}>
                {uploading
                  ? "Enviando..."
                  : selectedFiles.length > 1
                    ? "Enviar documentos"
                    : "Enviar documento"}
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos enviados ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Carregando documentos...
                </div>
              ) : documents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum documento enviado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Enviado por</TableHead>
                        <TableHead>Validacao</TableHead>
                        <TableHead className="text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{doc.nome_arquivo}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(doc.tamanho_bytes)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {DOCUMENTO_TIPOS.find((item) => item.value === doc.tipo)?.label || doc.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-xs",
                                STATUS_CONFIG[doc.status_validacao]?.className,
                              )}
                            >
                              {STATUS_CONFIG[doc.status_validacao]?.label ?? doc.status_validacao}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatDate(doc.validade_em)}</p>
                              {isExpired(doc.validade_em) && (
                                <p className="text-xs text-rose-700 mt-1 inline-flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Vencido
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{doc.enviadoPorNome || "-"}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(doc.enviado_em)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{doc.validadoPorNome || "-"}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(doc.validado_em)}
                              </p>
                              {doc.observacao_validacao && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {doc.observacao_validacao}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </Button>
                            {doc.status_validacao === "aprovado" && isExpired(doc.validade_em) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendRenewalWhatsApp(doc)}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                WhatsApp
                              </Button>
                            )}
                            {canValidate && (
                              <span className="inline-flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openValidationModal(doc, "approve")}
                                  title="Aprovar"
                                >
                                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openValidationModal(doc, "reject")}
                                  title="Rejeitar"
                                >
                                  <XCircle className="h-4 w-4 text-rose-600" />
                                </Button>
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {!supportsEmittedDocuments ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Emissao interna indisponivel</AlertTitle>
              <AlertDescription>
                Este ambiente ainda nao possui as tabelas de modelos e historico de documentos emitidos.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Emissao interna de documentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Tipo do documento
                      </label>
                      <Select
                        value={emitTipo}
                        onValueChange={(value) => setEmitTipo(value as DocumentoEmitidoTipo)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENTO_EMITIDO_TIPOS.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Modelo de documento (opcional)
                      </label>
                      <Select value={emitModeloId} onValueChange={setEmitModeloId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem modelo</SelectItem>
                          {modelosDocumento
                            .filter((modelo) => modelo.tipo === emitTipo || modelo.tipo === "outros")
                            .map((modelo) => (
                              <SelectItem key={modelo.id} value={modelo.id}>
                                {modelo.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Titulo
                      </label>
                      <Input
                        className="mt-1"
                        value={emitTitulo}
                        onChange={(event) => setEmitTitulo(event.target.value)}
                        placeholder="Ex.: Certificado de participacao"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Arquivo emitido (PDF ou imagem)
                      </label>
                      <Input
                        ref={emitFileInputRef}
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(event) => setEmitFile(event.target.files?.[0] ?? null)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Observacao (opcional)
                    </label>
                    <Textarea
                      className="mt-1"
                      rows={3}
                      value={emitObservacao}
                      onChange={(event) => setEmitObservacao(event.target.value)}
                    />
                  </div>
                  <Button onClick={handleEmitDocument} disabled={emitting || !emitFile || !emitTitulo.trim()}>
                    {emitting ? "Emitindo..." : "Registrar documento emitido"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Historico de documentos emitidos ({filteredEmittedDocuments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-w-sm">
                    <label className="text-sm font-medium text-muted-foreground">Filtrar por tipo</label>
                    <Select value={emitFilterTipo} onValueChange={(value) => setEmitFilterTipo(value as "all" | DocumentoEmitidoTipo)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {DOCUMENTO_EMITIDO_TIPOS.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {loadingEmitted ? (
                    <div className="py-8 text-center text-muted-foreground">Carregando historico...</div>
                  ) : filteredEmittedDocuments.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">Nenhum documento emitido encontrado.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Titulo</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Modelo</TableHead>
                            <TableHead>Emitido por</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Acoes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmittedDocuments.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{doc.titulo}</span>
                                  <span className="text-xs text-muted-foreground">{doc.nome_arquivo}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{getDocumentoEmitidoTipoLabel(doc.tipo)}</Badge>
                              </TableCell>
                              <TableCell>{doc.modeloNome || "-"}</TableCell>
                              <TableCell>{doc.emitidoPorNome || "-"}</TableCell>
                              <TableCell>{formatDateTime(doc.emitido_em)}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                                  <Download className="h-4 w-4 mr-1" />
                                  Baixar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      <Dialog open={validationModal.open} onOpenChange={(open) => !open && closeValidationModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {validationModal.mode === "approve" ? "Aprovar documento" : "Rejeitar documento"}
            </DialogTitle>
            <DialogDescription>
              {validationModal.mode === "approve"
                ? "Confirme a aprovacao do documento selecionado (opcionalmente informe uma observacao)."
                : "Informe o motivo para rejeitar este documento."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">{validationModal.documento?.nome_arquivo}</p>
              <p className="text-xs text-muted-foreground">
                Tipo: {validationModal.documento && DOCUMENTO_TIPOS.find((item) => item.value === validationModal.documento?.tipo)?.label}
              </p>
            </div>
            <Textarea
              value={validationReason}
              onChange={(event) => setValidationReason(event.target.value)}
              placeholder={
                validationModal.mode === "approve"
                  ? "Observacao opcional"
                  : "Descreva o que precisa ser corrigido"
              }
              rows={4}
            />
            {validationModal.mode === "approve" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Validade do documento (opcional)
                </label>
                <Input
                  type="date"
                  value={validationExpiryDate}
                  onChange={(event) => setValidationExpiryDate(event.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeValidationModal} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button onClick={handleValidationSubmit} disabled={actionLoading}>
              {actionLoading ? "Salvando..." : validationModal.mode === "approve" ? "Aprovar" : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  try {
    return format(new Date(`${value}T00:00:00`), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

function isExpired(value: string | null): boolean {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiresAt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt <= today;
}

function formatFileSize(value: number | null): string {
  if (!value || Number.isNaN(value)) return "Tamanho desconhecido";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentoEmitidoTipoLabel(tipo: string): string {
  return DOCUMENTO_EMITIDO_TIPOS.find((item) => item.value === tipo)?.label || tipo;
}

function getDocumentoTipoLabel(tipo: string): string {
  return DOCUMENTO_TIPOS.find((item) => item.value === tipo)?.label || tipo;
}

function formatWhatsAppPhone(value: string | null): string | null {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}
