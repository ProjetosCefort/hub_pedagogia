import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Paperclip, Save, UploadCloud, X } from "lucide-react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/hooks/useAuditLog";
import {
  createDocumentoSignedUrl,
  DOCUMENTOS_BUCKET,
  sanitizeDocumentoFileName,
} from "@/lib/documentos";

const TYPE_OPTIONS = [
  { value: "intervencao", label: "Intervenção" },
  { value: "avaliacao_pedagogica", label: "Avaliação Pedagógica" },
  { value: "avaliacao_socioeconomica", label: "Avaliação Socioeconômica" },
  { value: "encaminhamento", label: "Encaminhamento" },
];
const TYPE_OPTIONS_PSICOSSOCIAL = [
  { value: "intervencao", label: "Intervenção" },
  { value: "avaliacao_pedagogica", label: "Avaliação Pedagógica" },
];
const TYPE_OPTIONS_SERVICO_SOCIAL = [
  { value: "avaliacao_socioeconomica", label: "Avaliação Socioeconômica" },
  { value: "encaminhamento", label: "Encaminhamento" },
];

const STATUS_OPTIONS = [
  { value: "agendado", label: "Agendado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
];
const MODALIDADE_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
];
const MODELO_AGENDAMENTO_OPTIONS = [
  { value: "avaliacao_inicial", label: "Avaliação inicial" },
  { value: "retorno", label: "Retorno" },
  { value: "orientacao_familiar", label: "Orientação familiar" },
  { value: "acompanhamento", label: "Acompanhamento" },
  { value: "outros", label: "Outros" },
];

/** Valor sentinela para "Não definido" no Select de responsável (Radix não permite value="" em SelectItem). */
const NENHUM_RESPONSAVEL = "__none__";
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

interface JovemOption {
  id: string;
  nome_completo: string;
  matricula: string | null;
}

interface ResponsavelOption {
  id: string;
  nome_completo: string;
}

interface AgendaAttachment {
  id: string;
  atendimento_id: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  anexado_por: string | null;
  anexado_em: string;
}

interface FormState {
  jovem_id: string;
  publico_tipo: "jovem" | "externo";
  publico_nome: string;
  publico_contato: string;
  publico_descricao: string;
  setor: "psicossocial" | "servico_social";
  tipo: "intervencao" | "avaliacao_pedagogica" | "avaliacao_socioeconomica" | "encaminhamento";
  modalidade: "presencial" | "remoto";
  local_atendimento: string;
  link_atendimento: string;
  modelo_agendamento: string;
  titulo: string;
  descricao: string;
  agendado_para: string;
  duracao_minutos: string;
  responsavel_id: string;
  status: "agendado" | "realizado" | "cancelado";
}

interface AgendaFormProps {
  sector?: "psicossocial" | "servico_social";
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "Tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AgendaForm({ sector }: AgendaFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [searchParams] = useSearchParams();
  const preselectedJovemId = searchParams.get("jovem_id");
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [jovens, setJovens] = useState<JovemOption[]>([]);
  const [responsaveis, setResponsaveis] = useState<ResponsavelOption[]>([]);
  const [loadingPage, setLoadingPage] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [initialRecord, setInitialRecord] = useState<any | null>(null);
  const [createdByName, setCreatedByName] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<AgendaAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const basePath = sector === "servico_social" ? "/servico-social/agenda" : "/psicossocial/agenda";
  const moduleLabel = sector === "servico_social" ? "Serviço Social" : "Psicossocial";
  const typeOptions =
    sector === "psicossocial"
      ? TYPE_OPTIONS_PSICOSSOCIAL
      : sector === "servico_social"
        ? TYPE_OPTIONS_SERVICO_SOCIAL
        : TYPE_OPTIONS;
  const defaultType = (typeOptions[0]?.value || "intervencao") as FormState["tipo"];

  const [formData, setFormData] = useState<FormState>({
    jovem_id: preselectedJovemId || "",
    publico_tipo: "jovem",
    publico_nome: "",
    publico_contato: "",
    publico_descricao: "",
    setor: sector || "psicossocial",
    tipo: defaultType,
    modalidade: "presencial",
    local_atendimento: "",
    link_atendimento: "",
    modelo_agendamento: "avaliacao_inicial",
    titulo: "",
    descricao: "",
    agendado_para: new Date().toISOString().slice(0, 16),
    duracao_minutos: "60",
    responsavel_id: "",
    status: "agendado",
  });

  useEffect(() => {
    fetchJovens();
    fetchResponsaveis();
  }, []);

  useEffect(() => {
    if (isEditing && id) {
      fetchAgendamento(id);
      fetchAttachments(id);
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (!isEditing && user?.id && !formData.responsavel_id) {
      setFormData((prev) => ({ ...prev, responsavel_id: user.id }));
    }
  }, [user?.id, isEditing, formData.responsavel_id]);

  useEffect(() => {
    setFormData((prev) => {
      const hasType = typeOptions.some((option) => option.value === prev.tipo);
      return {
        ...prev,
        setor: sector || prev.setor,
        tipo: hasType ? prev.tipo : defaultType,
      };
    });
  }, [sector, defaultType]);

  async function fetchJovens() {
    const { data, error } = await supabase
      .from("jovens")
      .select("id, nome_completo, matricula")
      .order("nome_completo");

    if (!error && data) {
      setJovens(data as JovemOption[]);
    }
  }

  async function fetchResponsaveis() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo, email")
        .order("nome_completo");

      if (error) throw error;

      const options: ResponsavelOption[] = (data || []).map((profile: any) => ({
        id: profile.id,
        nome_completo: profile.nome_completo || profile.email || "Sem nome",
      }));

      setResponsaveis(options);
    } catch (error) {
      console.error("Erro ao carregar responsáveis:", error);
      if (user?.id) {
        const metadata = user.user_metadata as Record<string, any> | undefined;
        const fallbackName =
          metadata?.nome_completo ||
          metadata?.full_name ||
          user.email ||
          "Responsável atual";
        setResponsaveis([{ id: user.id, nome_completo: fallbackName }]);
      }
    }
  }

  async function fetchAgendamento(recordId: string) {
    try {
      setLoadingPage(true);
      const { data, error } = await supabase
        .from("atendimentos_agendados")
        .select(
          "id, jovem_id, publico_externo, publico_nome, publico_contato, publico_descricao, setor, tipo, modalidade, local_atendimento, link_atendimento, modelo_agendamento, titulo, descricao, agendado_para, duracao_minutos, responsavel_id, status, created_by"
        )
        .eq("id", recordId)
        .single();

      if (error) throw error;

      setInitialRecord(data);
      setFormData({
        jovem_id: data.jovem_id || "",
        publico_tipo: data.publico_externo ? "externo" : "jovem",
        publico_nome: data.publico_nome || "",
        publico_contato: data.publico_contato || "",
        publico_descricao: data.publico_descricao || "",
        setor: data.setor || sector || "psicossocial",
        tipo: data.tipo,
        modalidade: data.modalidade || "presencial",
        local_atendimento: data.local_atendimento || "",
        link_atendimento: data.link_atendimento || "",
        modelo_agendamento: data.modelo_agendamento || "avaliacao_inicial",
        titulo: data.titulo,
        descricao: data.descricao || "",
        agendado_para: data.agendado_para
          ? new Date(data.agendado_para).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        duracao_minutos: data.duracao_minutos?.toString() || "60",
        responsavel_id: data.responsavel_id || "",
        status: data.status,
      });

      if (data.created_by) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("nome_completo, email")
          .eq("id", data.created_by)
          .maybeSingle();
        setCreatedByName(
          creatorProfile?.nome_completo || creatorProfile?.email || "Usuário do sistema",
        );
      }

      if (data.responsavel_id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, nome_completo, email")
            .eq("id", data.responsavel_id)
            .single();

          const nome =
            profile?.nome_completo || profile?.email || "Responsável atual";
          setResponsaveis((prev) => {
            if (prev.some((resp) => resp.id === data.responsavel_id)) {
              return prev;
            }
            return [...prev, { id: data.responsavel_id!, nome_completo: nome }];
          });
        } catch {
          setResponsaveis((prev) => {
            if (prev.some((resp) => resp.id === data.responsavel_id)) {
              return prev;
            }
            return [
              ...prev,
              { id: data.responsavel_id!, nome_completo: "Responsável atual" },
            ];
          });
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar agendamento:", error);
      toast({
        title: "Erro ao carregar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPage(false);
    }
  }

  async function fetchAttachments(recordId: string) {
    try {
      setLoadingAttachments(true);
      const { data, error } = await supabase
        .from("atendimentos_agendados_anexos")
        .select("id, atendimento_id, nome_arquivo, storage_path, mime_type, tamanho_bytes, anexado_por, anexado_em")
        .eq("atendimento_id", recordId)
        .order("anexado_em", { ascending: false });

      if (error) throw error;
      setAttachments((data || []) as AgendaAttachment[]);
    } catch (error: any) {
      console.error("Erro ao carregar anexos do agendamento:", error);
      toast({
        title: "Erro ao carregar anexos",
        description: error.message || "Não foi possível listar os anexos do agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoadingAttachments(false);
    }
  }

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  async function uploadAgendaAttachments(atendimentoId: string) {
    if (selectedFiles.length === 0) return;

    const uploadedPaths: string[] = [];
    const insertedIds: string[] = [];

    try {
      for (const file of selectedFiles) {
        const attachmentId = crypto.randomUUID();
        const safeName = sanitizeDocumentoFileName(file.name);
        const storagePath = `agenda/${atendimentoId}/${attachmentId}/${safeName}`;

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
          .from("atendimentos_agendados_anexos")
          .insert({
            id: attachmentId,
            atendimento_id: atendimentoId,
            nome_arquivo: file.name,
            storage_path: storagePath,
            mime_type: file.type || null,
            tamanho_bytes: file.size,
            anexado_por: user?.id || null,
          });

        if (insertError) throw insertError;
        insertedIds.push(attachmentId);
      }
    } catch (error) {
      if (insertedIds.length > 0) {
        await supabase
          .from("atendimentos_agendados_anexos")
          .delete()
          .in("id", insertedIds);
      }
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(DOCUMENTOS_BUCKET).remove(uploadedPaths);
      }
      throw error;
    }
  }

  async function handleDownloadAttachment(attachment: AgendaAttachment) {
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

  async function findResponsavelConflict(payload: {
    responsavel_id: string | null;
    agendado_para: string;
    duracao_minutos: number | null;
  }) {
    if (!payload.responsavel_id || !payload.agendado_para) return null;

    const start = new Date(payload.agendado_para);
    const duration = payload.duracao_minutos || 60;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const searchStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const searchEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("atendimentos_agendados")
      .select("id, titulo, agendado_para, duracao_minutos")
      .eq("responsavel_id", payload.responsavel_id)
      .neq("status", "cancelado")
      .gte("agendado_para", searchStart.toISOString())
      .lte("agendado_para", searchEnd.toISOString());

    if (error) throw error;

    return (data || []).find((item) => {
      if (id && item.id === id) return false;
      const itemStart = new Date(item.agendado_para);
      const itemEnd = new Date(
        itemStart.getTime() + (item.duracao_minutos || 60) * 60 * 1000,
      );
      return itemStart < end && itemEnd > start;
    }) || null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    if (formData.publico_tipo === "jovem" && !formData.jovem_id) {
      toast({
        title: "Jovem obrigatório",
        description: "Selecione o jovem ou altere o público do agendamento para público externo.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    if (formData.publico_tipo === "externo" && !formData.publico_nome.trim()) {
      toast({
        title: "Público externo obrigatório",
        description: "Informe o nome ou identificação do público externo.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    if (formData.modalidade === "presencial" && !formData.local_atendimento.trim()) {
      toast({
        title: "Local obrigatório",
        description: "Informe o local para agendamento presencial.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    if (formData.modalidade === "remoto" && !formData.link_atendimento.trim()) {
      toast({
        title: "Link obrigatório",
        description: "Informe o link para agendamento remoto.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const payload = {
      jovem_id: formData.publico_tipo === "jovem" ? formData.jovem_id : null,
      publico_externo: formData.publico_tipo === "externo",
      publico_nome:
        formData.publico_tipo === "externo" ? formData.publico_nome.trim() : null,
      publico_contato:
        formData.publico_tipo === "externo" ? formData.publico_contato.trim() || null : null,
      publico_descricao:
        formData.publico_tipo === "externo" ? formData.publico_descricao.trim() || null : null,
      tipo: formData.tipo,
      setor: formData.setor,
      modalidade: formData.modalidade,
      local_atendimento:
        formData.modalidade === "presencial" ? formData.local_atendimento.trim() : null,
      link_atendimento:
        formData.modalidade === "remoto" ? formData.link_atendimento.trim() : null,
      modelo_agendamento: formData.modelo_agendamento || null,
      titulo: formData.titulo,
      descricao: formData.descricao || null,
      agendado_para: formData.agendado_para,
      duracao_minutos: formData.duracao_minutos ? Number(formData.duracao_minutos) : null,
      responsavel_id: formData.responsavel_id || null,
      status: formData.status,
    };

    let appointmentPersisted = false;

    try {
      const conflict = await findResponsavelConflict(payload);
      if (conflict) {
        const conflictDate = new Date(conflict.agendado_para).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        });
        toast({
          title: "Conflito de agenda",
          description: `O responsável já possui "${conflict.titulo}" em ${conflictDate}.`,
          variant: "destructive",
        });
        return;
      }

      let savedRecordId = id || "";

      if (isEditing && id) {
        const { data, error } = await supabase
          .from("atendimentos_agendados")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        logAudit({
          entityType: "atendimentos_agendados",
          entityId: id,
          actionType: "update",
          oldData: initialRecord,
          newData: data,
        }).catch(() => {});
        savedRecordId = id;
        appointmentPersisted = true;
      } else {
        const { data, error } = await supabase
          .from("atendimentos_agendados")
          .insert({
            ...payload,
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;

        logAudit({
          entityType: "atendimentos_agendados",
          entityId: data.id,
          actionType: "create",
          newData: data,
        }).catch(() => {});

        savedRecordId = data.id;
        appointmentPersisted = true;
      }

      await uploadAgendaAttachments(savedRecordId);

      toast({
        title: isEditing
          ? "Agendamento atualizado com sucesso"
          : "Agendamento criado com sucesso",
        description:
          selectedFiles.length > 0
            ? `${selectedFiles.length} anexo(s) enviado(s).`
            : undefined,
      });

      if (preselectedJovemId) {
        navigate(`/jovens/${preselectedJovemId}`);
      } else {
        navigate(basePath);
      }
    } catch (error: any) {
      console.error("Erro ao salvar agendamento:", error);
      toast({
        title: appointmentPersisted
          ? "Agendamento salvo, mas houve erro nos anexos"
          : "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const currentUserName = (() => {
    const metadata = user?.user_metadata as Record<string, any> | undefined;
    return (
      createdByName ||
      metadata?.nome_completo ||
      metadata?.full_name ||
      user?.email ||
      "Usuário atual"
    );
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="page-header mb-0">
          <h1 className="page-title">
            {isEditing ? "Editar agendamento" : "Novo agendamento"}
          </h1>
          <p className="page-description">
            {isEditing
              ? `Atualize os detalhes do atendimento (${moduleLabel})`
              : `Agende um novo atendimento (${moduleLabel})`}
          </p>
        </div>
      </div>

      {loadingPage ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-muted-foreground">Carregando informações...</p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados principais</CardTitle>
              <CardDescription>Informe o público e o tipo de atendimento</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="publico_tipo">Público do agendamento *</Label>
                <Select
                  value={formData.publico_tipo}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      publico_tipo: value as FormState["publico_tipo"],
                      jovem_id: value === "externo" ? "" : prev.jovem_id,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jovem">Jovem vinculado</SelectItem>
                    {sector === "servico_social" && (
                      <SelectItem value="externo">Público externo</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {formData.publico_tipo === "jovem" ? (
              <div>
                <Label htmlFor="jovem_id">Jovem *</Label>
                <Select
                  value={formData.jovem_id}
                  onValueChange={(value) => handleChange("jovem_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o jovem" />
                  </SelectTrigger>
                  <SelectContent>
                    {jovens.map((jovem) => (
                      <SelectItem key={jovem.id} value={jovem.id}>
                        {jovem.nome_completo}
                        {jovem.matricula && ` (${jovem.matricula})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="publico_nome">Nome do público *</Label>
                    <Input
                      id="publico_nome"
                      value={formData.publico_nome}
                      onChange={(event) =>
                        handleChange("publico_nome", event.target.value)
                      }
                      placeholder="Ex.: Família Silva, comunidade externa..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="publico_contato">Contato</Label>
                    <Input
                      id="publico_contato"
                      value={formData.publico_contato}
                      onChange={(event) =>
                        handleChange("publico_contato", event.target.value)
                      }
                      placeholder="Telefone, e-mail ou referência"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="publico_descricao">Descrição do público</Label>
                    <Textarea
                      id="publico_descricao"
                      rows={3}
                      value={formData.publico_descricao}
                      onChange={(event) =>
                        handleChange("publico_descricao", event.target.value)
                      }
                      placeholder="Descreva qual público foi atendido e o contexto do agendamento"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleChange("tipo", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="modelo_agendamento">Modelo de agendamento</Label>
                <Select
                  value={formData.modelo_agendamento}
                  onValueChange={(value) => handleChange("modelo_agendamento", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELO_AGENDAMENTO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="modalidade">Modalidade *</Label>
                <Select
                  value={formData.modalidade}
                  onValueChange={(value) => handleChange("modalidade", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(event) => handleChange("titulo", event.target.value)}
                  placeholder="Ex: Avaliação com família, retorno psicossocial..."
                  required
                />
              </div>
              {formData.modalidade === "presencial" ? (
                <div>
                  <Label htmlFor="local_atendimento">Local *</Label>
                  <Input
                    id="local_atendimento"
                    value={formData.local_atendimento}
                    onChange={(event) => handleChange("local_atendimento", event.target.value)}
                    placeholder="Ex.: Sala 3 - Unidade Centro"
                    required
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="link_atendimento">Link da reunião *</Label>
                  <Input
                    id="link_atendimento"
                    type="url"
                    value={formData.link_atendimento}
                    onChange={(event) => handleChange("link_atendimento", event.target.value)}
                    placeholder="https://..."
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="agendado_para">Data e hora *</Label>
                <Input
                  id="agendado_para"
                  type="datetime-local"
                  value={formData.agendado_para}
                  onChange={(event) => handleChange("agendado_para", event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duracao">Duração (minutos)</Label>
                <Input
                  id="duracao"
                  type="number"
                  min={15}
                  step={15}
                  value={formData.duracao_minutos}
                  onChange={(event) => handleChange("duracao_minutos", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responsável</CardTitle>
              <CardDescription>Quem conduzirá o atendimento e quem realizou o agendamento</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="responsavel_id">Responsável</Label>
                <Select
                  value={formData.responsavel_id || NENHUM_RESPONSAVEL}
                  onValueChange={(value) =>
                    handleChange("responsavel_id", value === NENHUM_RESPONSAVEL ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM_RESPONSAVEL}>Não definido</SelectItem>
                    {responsaveis.map((resp) => (
                      <SelectItem key={resp.id} value={resp.id}>
                        {resp.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agendado por</Label>
                <Input value={currentUserName} readOnly />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Descrição</CardTitle>
              <CardDescription>Contexto adicional sobre o atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="descricao"
                rows={4}
                value={formData.descricao}
                onChange={(event) => handleChange("descricao", event.target.value)}
                placeholder="Detalhe objetivos, participantes e anexos relevantes..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-primary" />
                Anexos
              </CardTitle>
              <CardDescription>Documentos relacionados ao agendamento</CardDescription>
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

              {isEditing && (
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

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? "Salvar alterações" : "Criar agendamento"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
