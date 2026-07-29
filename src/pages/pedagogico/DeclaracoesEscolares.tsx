import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, Download, FileText, Mail, MessageCircle, UploadCloud } from "lucide-react";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { sendDocumentValidationEmail, sendDocumentsRenewalEmail } from "@/lib/email";
import {
  createDocumentoSignedUrl,
  deleteDocumentoArquivo,
  uploadDocumentoArquivo,
} from "@/lib/documentos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TIPO_DECLARACAO = "comprovante_escolaridade";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const FILTER_ALL = "__all__";
const ESCOLARIDADE_OPTIONS = [
  { value: "cursando_ensino_regular", label: "Cursando ensino regular" },
  { value: "ensino_medio_completo", label: "Ensino médio completo" },
] as const;

type DeclaracaoRow = {
  id: string;
  jovem_id: string | null;
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number | null;
  enviado_em: string;
  status_validacao: "pendente" | "aprovado" | "rejeitado";
  validade_em: string | null;
  observacao_validacao: string | null;
  jovem: {
    id: string;
    nome_completo: string;
    email: string | null;
    celular: string | null;
    telefone: string | null;
    status: string;
    escolaridade_regular_status: string | null;
    unidade_id: string | null;
    turma_id: string | null;
    unidade?: { nome: string | null } | null;
    turma?: { nome: string | null } | null;
  } | null;
};

interface UnidadeOption {
  id: string;
  nome: string;
}

interface TurmaOption {
  id: string;
  nome: string;
}

export default function DeclaracoesEscolares() {
  const { toast } = useToast();
  const { user, roles } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [rows, setRows] = useState<DeclaracaoRow[]>([]);
  const [jovens, setJovens] = useState<
    Array<{
      id: string;
      nome_completo: string;
      celular: string | null;
      telefone: string | null;
      escolaridade_regular_status: string | null;
    }>
  >([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [jovemId, setJovemId] = useState<string>(FILTER_ALL);
  const [unidadeId, setUnidadeId] = useState<string>(FILTER_ALL);
  const [turmaId, setTurmaId] = useState<string>(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [escolaridadeStatus, setEscolaridadeStatus] =
    useState<(typeof ESCOLARIDADE_OPTIONS)[number]["value"]>("cursando_ensino_regular");

  const canValidate = roles.includes("admin") || roles.includes("gestor");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: docs, error: docsError }, { data: jovensData }, { data: unidadesData }, { data: turmasData }] =
        await Promise.all([
          supabase
            .from("documentos_jovem")
            .select(
              `
                id,
                jovem_id,
                nome_arquivo,
                storage_path,
                tamanho_bytes,
                enviado_em,
                status_validacao,
                validade_em,
                observacao_validacao,
                jovem:jovens(
                  id,
                  nome_completo,
                  email,
                  celular,
                  telefone,
                  status,
                  escolaridade_regular_status,
                  unidade_id,
                  turma_id,
                  unidade:unidades(nome),
                  turma:turmas(nome)
                )
              `,
            )
            .eq("tipo", TIPO_DECLARACAO)
            .order("enviado_em", { ascending: false }),
          supabase
            .from("jovens")
            .select("id, nome_completo, celular, telefone, escolaridade_regular_status")
            .order("nome_completo"),
          supabase.from("unidades").select("id, nome").order("nome"),
          supabase.from("turmas").select("id, nome").order("nome"),
        ]);

      if (docsError) throw docsError;

      setRows((docs || []) as unknown as DeclaracaoRow[]);
      setJovens(
        (jovensData || []) as Array<{
          id: string;
          nome_completo: string;
          celular: string | null;
          telefone: string | null;
          escolaridade_regular_status: string | null;
        }>,
      );
      setUnidades((unidadesData || []) as UnidadeOption[]);
      setTurmas((turmasData || []) as TurmaOption[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar declarações escolares",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      const matchesJovem = jovemId === FILTER_ALL || item.jovem_id === jovemId;
      const matchesUnidade =
        unidadeId === FILTER_ALL || item.jovem?.unidade_id === unidadeId;
      const matchesTurma = turmaId === FILTER_ALL || item.jovem?.turma_id === turmaId;
      const matchesStatus =
        statusFilter === FILTER_ALL || item.status_validacao === statusFilter;
      return matchesJovem && matchesUnidade && matchesTurma && matchesStatus;
    });
  }, [jovemId, rows, statusFilter, turmaId, unidadeId]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status_validacao === "pendente") acc.pendentes += 1;
        if (item.status_validacao === "aprovado") acc.aprovadas += 1;
        if (
          item.jovem?.escolaridade_regular_status !== "ensino_medio_completo" &&
          isExpired(item.validade_em)
        ) {
          acc.vencidas += 1;
        }
        return acc;
      },
      { total: 0, pendentes: 0, aprovadas: 0, vencidas: 0 },
    );
  }, [filteredRows]);

  const selectedJovem = useMemo(
    () => jovens.find((item) => item.id === jovemId) || null,
    [jovemId, jovens],
  );

  useEffect(() => {
    if (selectedJovem?.escolaridade_regular_status === "ensino_medio_completo") {
      setEscolaridadeStatus("ensino_medio_completo");
    } else {
      setEscolaridadeStatus("cursando_ensino_regular");
    }
  }, [selectedJovem?.id, selectedJovem?.escolaridade_regular_status]);

  const declaracaoUploadUrl = `${window.location.origin}/acesso-jovem?tipo=${TIPO_DECLARACAO}`;

  async function copyDeclaracaoLink() {
    await navigator.clipboard.writeText(declaracaoUploadUrl);
    toast({
      title: "Link copiado",
      description: "O link externo para envio da declaração escolar foi copiado.",
    });
  }

  function sendDeclaracaoLinkByWhatsApp() {
    if (!selectedJovem) {
      toast({
        title: "Selecione o jovem",
        description: "Escolha um jovem para enviar o link por WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    const rawPhone = selectedJovem.celular || selectedJovem.telefone || "";
    const digits = rawPhone.replace(/\D/g, "");
    if (!digits) {
      toast({
        title: "Telefone não informado",
        description: "O jovem selecionado não possui telefone/celular cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const phone = digits.length <= 11 ? `55${digits}` : digits;
    const message = [
      `Olá, ${selectedJovem.nome_completo}!`,
      "Segue o link para envio da sua declaração escolar:",
      declaracaoUploadUrl,
    ].join("\n");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleUpload() {
    if (!user?.id) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para enviar a declaração.",
        variant: "destructive",
      });
      return;
    }

    if (jovemId === FILTER_ALL) {
      toast({
        title: "Selecione o jovem",
        description: "Escolha um jovem específico para anexar a declaração escolar.",
        variant: "destructive",
      });
      return;
    }

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

    setUploading(true);
    const uploadedPaths: string[] = [];
    const insertedIds: string[] = [];

    try {
      await updateJovemEscolaridade(jovemId, escolaridadeStatus);

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
          tipo: TIPO_DECLARACAO,
          nome_arquivo: file.name,
          storage_path: storagePath,
          mime_type: file.type || null,
          tamanho_bytes: file.size,
          enviado_por: user.id,
        });

        if (error) throw error;
        insertedIds.push(documentoId);
      }

      toast({ title: "Declaração escolar enviada com sucesso" });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchData();
    } catch (error: any) {
      if (insertedIds.length > 0) {
        await supabase.from("documentos_jovem").delete().in("id", insertedIds);
      }
      if (uploadedPaths.length > 0) {
        await Promise.allSettled(uploadedPaths.map((path) => deleteDocumentoArquivo(path)));
      }
      toast({
        title: "Falha ao enviar",
        description: error.message || "Não foi possível enviar a declaração escolar.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function updateJovemEscolaridade(jovemTargetId: string, status: string) {
    const { error } = await supabase
      .from("jovens" as any)
      .update({ escolaridade_regular_status: status })
      .eq("id", jovemTargetId);

    if (error) throw error;
  }

  async function handleValidate(row: DeclaracaoRow, status: "aprovado" | "rejeitado") {
    if (!user?.id) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para validar documentos.",
        variant: "destructive",
      });
      return;
    }

    const observacao =
      status === "rejeitado"
        ? window.prompt("Informe o motivo da rejeição para o jovem:", row.observacao_validacao || "") || ""
        : "";

    if (status === "rejeitado" && !observacao.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo para rejeitar a declaração.",
        variant: "destructive",
      });
      return;
    }

    const escolaridade = row.jovem?.escolaridade_regular_status;
    const validade =
      status === "aprovado" && escolaridade !== "ensino_medio_completo"
        ? format(addMonths(new Date(row.enviado_em), 6), "yyyy-MM-dd")
        : null;

    try {
      const { error } = await supabase
        .from("documentos_jovem")
        .update({
          status_validacao: status,
          observacao_validacao: observacao.trim() || null,
          validado_em: new Date().toISOString(),
          validado_por: user.id,
          validade_em: validade,
        })
        .eq("id", row.id);

      if (error) throw error;

      if (row.jovem?.email) {
        await sendDocumentValidationEmail({
          email: row.jovem.email,
          nome: row.jovem.nome_completo,
          tipoDocumento: "Declaração escolar",
          status,
          observacao,
        });
      }

      toast({
        title: status === "aprovado" ? "Declaração aprovada" : "Declaração rejeitada",
        description: row.jovem?.email
          ? "O jovem foi notificado por e-mail."
          : "O jovem não possui e-mail cadastrado para notificação.",
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao validar declaração",
        description: error.message || "Não foi possível atualizar o documento.",
        variant: "destructive",
      });
    }
  }

  async function handleDownload(storagePath: string) {
    try {
      const url = await createDocumentoSignedUrl(storagePath);
      window.open(url, "_blank", "noopener");
    } catch (error: any) {
      toast({
        title: "Download indisponível",
        description: error.message || "Não foi possível gerar o link temporário.",
        variant: "destructive",
      });
    }
  }

  async function handleSendReminder(row: DeclaracaoRow) {
    if (!row.jovem?.email) {
      toast({
        title: "E-mail não encontrado",
        description: "O jovem não possui e-mail cadastrado para receber o lembrete.",
        variant: "destructive",
      });
      return;
    }

    setSendingReminderId(row.id);
    try {
      const ok = await sendDocumentsRenewalEmail({
        email: row.jovem.email,
        nome: row.jovem.nome_completo,
        link: `${window.location.origin}/acesso-jovem`,
        tipoDocumento: "Declaração escolar",
      });

      if (!ok) {
        throw new Error("Falha ao disparar o e-mail de renovação.");
      }

      toast({
        title: "Lembrete enviado",
        description: "O jovem recebeu um e-mail para renovar a declaração escolar.",
      });
    } catch (error: any) {
      toast({
        title: "Falha ao enviar lembrete",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSendingReminderId(null);
    }
  }

  function handleSendWhatsAppReminder(row: DeclaracaoRow) {
    const rawPhone = row.jovem?.celular || row.jovem?.telefone || "";
    const digits = rawPhone.replace(/\D/g, "");

    if (!digits) {
      toast({
        title: "Telefone não informado",
        description: "O jovem não possui telefone/celular cadastrado para receber a cobrança.",
        variant: "destructive",
      });
      return;
    }

    const phone = digits.length <= 11 ? `55${digits}` : digits;
    const link = `${window.location.origin}/acesso-jovem?tipo=${TIPO_DECLARACAO}`;
    const nome = row.jovem?.nome_completo || "jovem";
    const message = [
      `Olá, ${nome}!`,
      "Sua declaração escolar venceu e precisa ser atualizada.",
      "Envie o novo comprovante pelo link:",
      link,
    ].join("\n");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header mb-0">
        <h1 className="page-title">Declaração escolar</h1>
        <p className="page-description">
          Fluxo explícito para upload, acompanhamento de validade e renovação do comprovante de escolaridade/matrícula.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de registros</CardDescription>
            <CardTitle className="text-2xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes de validação</CardDescription>
            <CardTitle className="text-2xl">{summary.pendentes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aprovadas</CardDescription>
            <CardTitle className="text-2xl">{summary.aprovadas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vencidas</CardDescription>
            <CardTitle className="text-2xl">{summary.vencidas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            Novo upload de declaração escolar
          </CardTitle>
          <CardDescription>
            Use este fluxo quando a equipe pedagógica precisar anexar ou substituir diretamente a declaração do jovem.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[240px_240px_1fr_auto]">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jovem</span>
            <Select value={jovemId} onValueChange={setJovemId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Selecione o jovem</SelectItem>
                {jovens.map((jovem) => (
                  <SelectItem key={jovem.id} value={jovem.id}>
                    {jovem.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Situação escolar
            </span>
            <Select value={escolaridadeStatus} onValueChange={(value) => setEscolaridadeStatus(value as typeof escolaridadeStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESCOLARIDADE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Arquivo</span>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "Enviando..." : "Enviar"}
            </Button>
          </div>
          <div className="md:col-span-4 flex flex-wrap items-center gap-2 rounded-md border p-3">
            <code className="max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-muted px-2 py-1 text-xs">
              {declaracaoUploadUrl}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copyDeclaracaoLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sendDeclaracaoLinkByWhatsApp}
              disabled={jovemId === FILTER_ALL}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Gestão de declarações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidade</span>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todas as unidades</SelectItem>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Turma</span>
              <Select value={turmaId} onValueChange={setTurmaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todas as turmas</SelectItem>
                  {turmas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jovem</span>
              <Select value={jovemId} onValueChange={setJovemId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todos os jovens</SelectItem>
                  {jovens.map((jovem) => (
                    <SelectItem key={jovem.id} value={jovem.id}>
                      {jovem.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando declarações...</div>
          ) : filteredRows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Nenhuma declaração escolar encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jovem</TableHead>
                    <TableHead>Unidade/Turma</TableHead>
                    <TableHead>Situação escolar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Envio / Próximo envio</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{row.jovem?.nome_completo || "Sem jovem"}</span>
                          <span className="text-xs text-muted-foreground">
                            {jovemStatusLabel(row.jovem?.status)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{row.jovem?.unidade?.nome || "Sem unidade"}</p>
                          <p className="text-muted-foreground">{row.jovem?.turma?.nome || "Sem turma"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {escolaridadeLabel(row.jovem?.escolaridade_regular_status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.status_validacao === "pendente"
                            ? "Pendente"
                            : row.status_validacao === "aprovado"
                              ? "Aprovado"
                              : "Rejeitado"}
                        </Badge>
                        {canValidate && row.status_validacao === "pendente" && (
                          <p className="mt-1 text-xs text-muted-foreground">Validar no prontuário do jovem</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Enviado: {formatDate(row.enviado_em)}</p>
                          <p className="text-muted-foreground">
                            Próximo: {nextSendLabel(row)}
                          </p>
                          {row.jovem?.escolaridade_regular_status !== "ensino_medio_completo" && isExpired(row.validade_em) && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              Vencida
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{row.nome_arquivo}</p>
                          <p className="text-muted-foreground">
                            {formatFileSize(row.tamanho_bytes)} · {formatDateTime(row.enviado_em)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(row.storage_path)}>
                          <Download className="mr-1 h-4 w-4" />
                          Baixar
                        </Button>
                        {canValidate && row.status_validacao === "pendente" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleValidate(row, "aprovado")}>
                              Validar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleValidate(row, "rejeitado")}>
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {isExpired(row.validade_em) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(row)}
                              disabled={sendingReminderId === row.id}
                            >
                              <Mail className="mr-1 h-4 w-4" />
                              {sendingReminderId === row.id ? "Enviando..." : "E-mail"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendWhatsAppReminder(row)}
                            >
                              <MessageCircle className="mr-1 h-4 w-4" />
                              WhatsApp
                            </Button>
                          </>
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
    </div>
  );
}

function isExpired(date: string | null) {
  if (!date) return false;
  return new Date(date) <= new Date();
}

function escolaridadeLabel(status: string | null | undefined) {
  if (status === "ensino_medio_completo") return "Ensino médio completo";
  if (status === "cursando_ensino_regular") return "Cursando ensino regular";
  return "Não informada";
}

function jovemStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    completed: "Cadastro concluído",
    talent_bank: "Banco de talentos",
    under_analysis: "Em análise",
    pending_documents: "Documentação pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    active_apprentice: "Aprendiz ativo",
    inactive: "Inativo",
    terminated: "Desligado",
    completed_program: "Programa concluído",
    ativo: "Ativo",
  };

  if (!status) return "-";
  return labels[status] || "Status não identificado";
}

function nextSendLabel(row: DeclaracaoRow) {
  if (row.jovem?.escolaridade_regular_status === "ensino_medio_completo") {
    return "Não cobrar novamente";
  }
  if (row.status_validacao !== "aprovado") {
    return "Após validação";
  }
  return formatDate(row.validade_em);
}

function formatDate(date: string | null) {
  if (!date) return "Não definida";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

function formatDateTime(date: string | null) {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
