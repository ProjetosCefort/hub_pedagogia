import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRegistrosSociais } from "@/hooks/useConfiguracoes";
import { logAudit } from "@/hooks/useAuditLog";

interface Jovem {
  id: string;
  nome_completo: string;
  matricula: string | null;
  cpf: string | null;
  email: string | null;
}

interface FamilyMemberInput {
  id: string;
  nome: string;
  parentesco: string;
  idade: string;
  escolaridade: string;
  ocupacao: string;
  renda: string;
}

export default function AvaliacaoSocioeconomicaForm() {
  const navigate = useNavigate();
  const { id: avaliacaoId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [jovens, setJovens] = useState<Jovem[]>([]);
  const [selectedRegistrosSociais, setSelectedRegistrosSociais] = useState<
    string[]
  >([]);
  const [initialRegistrosSociais, setInitialRegistrosSociais] = useState<
    string[]
  >([]);
  const [initialRecord, setInitialRecord] = useState<Record<string, any> | null>(
    null,
  );
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberInput[]>([]);
  const [publicSocioInfo, setPublicSocioInfo] = useState<string | null>(null);

  const preselectedJovemId = searchParams.get("jovem_id");
  const isEditing = Boolean(avaliacaoId);

  // Carrega registros sociais (apenas ativos)
  const { data: registrosSociais, isLoading: loadingRegistros } =
    useRegistrosSociais(!isEditing);

  const [formData, setFormData] = useState({
    jovem_id: preselectedJovemId || "",
    data_avaliacao: new Date().toISOString().slice(0, 16),
    pcd_status: "",
    tipo_deficiencia: "",
    problemas_saude: "",
    renda_familiar: "",
    quantidade_membros: "",
    moradia_tipo: "",
    situacao_moradia: "",
    possui_saneamento: true,
    possui_energia: true,
    nis: "",
    cadunico_status: "",
    cras: "",
    creas: "",
    beneficios_sociais: "",
    observacoes: "",
  });

  useEffect(() => {
    fetchJovens();
  }, []);

  useEffect(() => {
    if (avaliacaoId) {
      fetchAvaliacao(avaliacaoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliacaoId]);

  useEffect(() => {
    if (isEditing) return;

    if (formData.jovem_id && jovens.length > 0) {
      loadSocioeconomicoPublico(formData.jovem_id);
    } else {
      setPublicSocioInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.jovem_id, jovens.length]);

  async function fetchJovens() {
    const { data } = await supabase
      .from("jovens")
      .select("id, nome_completo, matricula, cpf, email")
      .order("nome_completo");

    if (data) setJovens(data);
  }

  async function fetchAvaliacao(id: string) {
    setLoadingRecord(true);
    try {
      const { data, error } = await supabase
        .from("avaliacoes_socioeconomicas")
        .select(
          `
            id,
            jovem_id,
            data_avaliacao,
            pcd_status,
            tipo_deficiencia,
            problemas_saude,
            renda_familiar,
            quantidade_membros,
            moradia_tipo,
            situacao_moradia,
            possui_saneamento,
            possui_energia,
            nis,
            cadunico_status,
            cras,
            creas,
            beneficios_sociais,
            observacoes,
            composicao_familiar
          `,
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Avaliação não encontrada",
          description: "Não foi possível localizar o preenchimento informado.",
          variant: "destructive",
        });
        navigate("/avaliacoes-socioeconomicas");
        return;
      }

      setInitialRecord(data as Record<string, any>);
      setFormData({
        jovem_id: data.jovem_id,
        data_avaliacao: toDateTimeLocalValue(data.data_avaliacao),
        pcd_status: data.pcd_status || "",
        tipo_deficiencia: data.tipo_deficiencia || "",
        problemas_saude: data.problemas_saude || "",
        renda_familiar:
          data.renda_familiar !== null && data.renda_familiar !== undefined
            ? String(data.renda_familiar)
            : "",
        quantidade_membros:
          data.quantidade_membros !== null && data.quantidade_membros !== undefined
            ? String(data.quantidade_membros)
            : "",
        moradia_tipo: data.moradia_tipo || "",
        situacao_moradia: data.situacao_moradia || "",
        possui_saneamento: data.possui_saneamento ?? true,
        possui_energia: data.possui_energia ?? true,
        nis: data.nis || "",
        cadunico_status: data.cadunico_status || "",
        cras: data.cras || "",
        creas: data.creas || "",
        beneficios_sociais: data.beneficios_sociais || "",
        observacoes: data.observacoes || "",
      });

      const composicao = Array.isArray(data.composicao_familiar)
        ? data.composicao_familiar
        : [];
      setFamilyMembers(
        composicao.map((member: any) => ({
          id: generateFamilyMemberId(),
          nome: member.nome || "",
          parentesco: member.parentesco || "",
          idade:
            member.idade !== null && member.idade !== undefined
              ? String(member.idade)
              : "",
          escolaridade: member.escolaridade || "",
          ocupacao: member.ocupacao || "",
          renda:
            member.renda !== null && member.renda !== undefined
              ? String(member.renda)
              : "",
        })),
      );

      const { data: registros, error: registrosError } = await (supabase
        .from("avaliacoes_socioeconomicas_registros_sociais" as any)
        .select("registro_social_id")
        .eq("avaliacao_socioeconomica_id", id) as any);

      if (registrosError) throw registrosError;

      const registroIds = ((registros || []) as Array<{
        registro_social_id: string;
      }>).map((registro) => registro.registro_social_id);
      setSelectedRegistrosSociais(registroIds);
      setInitialRegistrosSociais(registroIds);
      setPublicSocioInfo(null);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar avaliação",
        description: error.message || "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoadingRecord(false);
    }
  }

  const toDateTimeLocalValue = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
  };

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleRegistroSocial = (registroId: string) => {
    setSelectedRegistrosSociais((prev) =>
      prev.includes(registroId)
        ? prev.filter((id) => id !== registroId)
        : [...prev, registroId],
    );
  };

  async function loadSocioeconomicoPublico(jovemId: string) {
    const jovem = jovens.find((item) => item.id === jovemId);
    if (!jovem) return;

    try {
      let inscricao: any | null = null;

      const byJovem = await supabase
        .from("inscricoes_jovens_aprendizes" as any)
        .select(
          "id, quantidade_membros, renda_familiar, composicao_familiar, tipo_moradia, situacao_moradia, possui_saneamento, possui_energia, possui_doenca_cronica, descricao_doenca, possui_deficiencia, descricao_deficiencia, acompanhamento_medico, descricao_acompanhamento, recebe_beneficio, descricao_beneficio, participa_programa_social, descricao_programa, observacoes, updated_at",
        )
        .eq("jovem_id", jovemId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!byJovem.error && byJovem.data) {
        inscricao = byJovem.data;
      }

      if (!inscricao && (jovem.cpf || jovem.email)) {
        const filters = [
          jovem.cpf ? `cpf.eq.${jovem.cpf}` : "",
          jovem.email ? `email.eq.${jovem.email}` : "",
        ].filter(Boolean);

        if (filters.length > 0) {
          const byIdentity = await supabase
            .from("inscricoes_jovens_aprendizes" as any)
            .select(
              "id, quantidade_membros, renda_familiar, composicao_familiar, tipo_moradia, situacao_moradia, possui_saneamento, possui_energia, possui_doenca_cronica, descricao_doenca, possui_deficiencia, descricao_deficiencia, acompanhamento_medico, descricao_acompanhamento, recebe_beneficio, descricao_beneficio, participa_programa_social, descricao_programa, observacoes, updated_at",
            )
            .or(filters.join(","))
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!byIdentity.error && byIdentity.data) {
            inscricao = byIdentity.data;
          }
        }
      }

      if (!inscricao) {
        setPublicSocioInfo("Nenhum dado socioeconômico público encontrado para este jovem.");
        return;
      }

      const problemasSaude = [
        inscricao.possui_doenca_cronica ? inscricao.descricao_doenca || "Possui doença crônica" : "",
        inscricao.acompanhamento_medico ? inscricao.descricao_acompanhamento || "Possui acompanhamento médico" : "",
      ].filter(Boolean).join(" | ");
      const beneficios = [
        inscricao.recebe_beneficio ? inscricao.descricao_beneficio || "Recebe benefício social" : "",
        inscricao.participa_programa_social ? inscricao.descricao_programa || "Participa de programa social" : "",
      ].filter(Boolean).join(" | ");

      setFormData((prev) => ({
        ...prev,
        pcd_status: prev.pcd_status || (inscricao.possui_deficiencia ? "pcd" : "nao_pcd"),
        tipo_deficiencia: prev.tipo_deficiencia || inscricao.descricao_deficiencia || "",
        problemas_saude: prev.problemas_saude || problemasSaude,
        renda_familiar:
          prev.renda_familiar || (inscricao.renda_familiar != null ? String(inscricao.renda_familiar) : ""),
        quantidade_membros:
          prev.quantidade_membros || (inscricao.quantidade_membros != null ? String(inscricao.quantidade_membros) : ""),
        moradia_tipo: prev.moradia_tipo || inscricao.tipo_moradia || "",
        situacao_moradia: prev.situacao_moradia || inscricao.situacao_moradia || "",
        possui_saneamento: inscricao.possui_saneamento ?? prev.possui_saneamento,
        possui_energia: inscricao.possui_energia ?? prev.possui_energia,
        beneficios_sociais: prev.beneficios_sociais || beneficios,
        observacoes: prev.observacoes || inscricao.observacoes || "",
      }));

      if (Array.isArray(inscricao.composicao_familiar) && inscricao.composicao_familiar.length > 0) {
        setFamilyMembers(
          inscricao.composicao_familiar.map((member: any) => ({
            id: generateFamilyMemberId(),
            nome: member.nome || "",
            parentesco: member.parentesco || "",
            idade: member.idade ? String(member.idade) : "",
            escolaridade: member.escolaridade || "",
            ocupacao: member.ocupacao || "",
            renda: member.renda ? String(member.renda) : "",
          })),
        );
      }

      setPublicSocioInfo("Dados socioeconômicos do cadastro público carregados automaticamente.");
    } catch (error) {
      console.error("Erro ao carregar socioeconômico público:", error);
      setPublicSocioInfo("Não foi possível carregar automaticamente os dados do cadastro público.");
    }
  }

  const generateFamilyMemberId = () =>
    Math.random().toString(36).slice(2, 10) + Date.now().toString();

  const addFamilyMember = () => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: generateFamilyMemberId(),
        nome: "",
        parentesco: "",
        idade: "",
        escolaridade: "",
        ocupacao: "",
        renda: "",
      },
    ]);
  };

  const updateFamilyMember = (
    memberId: string,
    field: keyof Omit<FamilyMemberInput, "id">,
    value: string,
  ) => {
    setFamilyMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, [field]: value } : member,
      ),
    );
  };

  const removeFamilyMember = (memberId: string) => {
    setFamilyMembers((prev) => prev.filter((member) => member.id !== memberId));
  };

  const normalizeText = (value: string) =>
    value.trim() === "" ? null : value.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const composicaoFamiliarPayload =
        familyMembers.length > 0
          ? familyMembers.map(({ id, ...member }) => member)
          : [];
      const quantidadeMembrosCalculada = formData.quantidade_membros
        ? parseInt(formData.quantidade_membros, 10)
        : composicaoFamiliarPayload.length > 0
          ? composicaoFamiliarPayload.length
          : null;
      const payload = {
        jovem_id: formData.jovem_id,
        data_avaliacao: formData.data_avaliacao,
        pcd_status: normalizeText(formData.pcd_status),
        tipo_deficiencia: normalizeText(formData.tipo_deficiencia),
        problemas_saude: normalizeText(formData.problemas_saude),
        renda_familiar: formData.renda_familiar
          ? parseFloat(formData.renda_familiar)
          : null,
        quantidade_membros: quantidadeMembrosCalculada,
        moradia_tipo: normalizeText(formData.moradia_tipo),
        situacao_moradia: normalizeText(formData.situacao_moradia),
        possui_saneamento: formData.possui_saneamento,
        possui_energia: formData.possui_energia,
        nis: normalizeText(formData.nis),
        cadunico_status: normalizeText(formData.cadunico_status),
        cras: normalizeText(formData.cras),
        creas: normalizeText(formData.creas),
        beneficios_sociais: normalizeText(formData.beneficios_sociais),
        observacoes: normalizeText(formData.observacoes),
        composicao_familiar: composicaoFamiliarPayload,
        responsavel_id: user?.id,
      };

      const { data: avaliacao, error: errorAvaliacao } = isEditing
        ? await supabase
            .from("avaliacoes_socioeconomicas")
            .update(payload)
            .eq("id", avaliacaoId)
            .select()
            .single()
        : await supabase
            .from("avaliacoes_socioeconomicas")
            .insert({ ...payload, created_by: user?.id })
            .select()
            .single();

      if (errorAvaliacao) throw errorAvaliacao;

      const registrosToRemove = initialRegistrosSociais.filter(
        (registroId) => !selectedRegistrosSociais.includes(registroId),
      );
      const registrosToAdd = selectedRegistrosSociais.filter(
        (registroId) => !initialRegistrosSociais.includes(registroId),
      );

      if (registrosToRemove.length > 0 && avaliacao) {
        const { error: errorRegistrosRemove } = await (supabase
          .from("avaliacoes_socioeconomicas_registros_sociais" as any)
          .delete()
          .eq("avaliacao_socioeconomica_id", avaliacao.id)
          .in("registro_social_id", registrosToRemove) as any);

        if (errorRegistrosRemove) throw errorRegistrosRemove;
      }

      if (registrosToAdd.length > 0 && avaliacao) {
        const registrosToInsert = registrosToAdd.map((registroId) => ({
          avaliacao_socioeconomica_id: avaliacao.id,
          registro_social_id: registroId,
        }));

        const { error: errorRegistrosAdd } = await (supabase
          .from("avaliacoes_socioeconomicas_registros_sociais" as any)
          .insert(registrosToInsert) as any);

        if (errorRegistrosAdd) throw errorRegistrosAdd;
      }

      // Registrar log de auditoria
      if (avaliacao?.id) {
        await logAudit({
          entityType: "avaliacoes_socioeconomicas",
          entityId: avaliacao.id,
          actionType: isEditing ? "update" : "create",
          oldData: isEditing ? initialRecord : null,
          newData: avaliacao,
          metadata: {
            registros_sociais_ids: selectedRegistrosSociais,
          },
        });
      }

      toast({
        title: isEditing
          ? "Avaliação socioeconômica atualizada!"
          : "Avaliação socioeconômica registrada!",
      });

      if (preselectedJovemId || formData.jovem_id) {
        navigate(`/jovens/${preselectedJovemId || formData.jovem_id}`);
      } else {
        navigate("/avaliacoes-socioeconomicas");
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
          <h1 className="page-title">Avaliação Socioeconômica</h1>
          <p className="page-description">
            {isEditing
              ? "Edite o preenchimento da avaliação socioeconômica"
              : "Registre uma avaliação socioeconômica completa"}
          </p>
        </div>
      </div>

      {loadingRecord ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando avaliação...
          </CardContent>
        </Card>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
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

        {publicSocioInfo && (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              {publicSocioInfo}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Condição de Saúde e Situação PCD
            </CardTitle>
            <CardDescription>
              Informe a condição do jovem e observações relevantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pcd_status">Situação PCD</Label>
              <Select
                value={formData.pcd_status}
                onValueChange={(v) => handleChange("pcd_status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcd">PCD</SelectItem>
                  <SelectItem value="nao_pcd">Não PCD</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tipo_deficiencia">Tipo de deficiência</Label>
              <Input
                id="tipo_deficiencia"
                value={formData.tipo_deficiencia}
                onChange={(e) =>
                  handleChange("tipo_deficiencia", e.target.value)
                }
                placeholder="Informe o tipo de deficiência, se houver"
              />
            </div>
            <div>
              <Label htmlFor="problemas_saude">
                Problemas de saúde / observações clínicas
              </Label>
              <Textarea
                id="problemas_saude"
                value={formData.problemas_saude}
                onChange={(e) =>
                  handleChange("problemas_saude", e.target.value)
                }
                rows={4}
                placeholder="Descreva condições de saúde, tratamentos e observações relevantes"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Composição Familiar</CardTitle>
            <CardDescription>
              Informe os membros do núcleo familiar e dados socioeconômicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="quantidade_membros">
                  Quantidade de membros
                </Label>
                <Input
                  id="quantidade_membros"
                  type="number"
                  min="1"
                  value={formData.quantidade_membros}
                  onChange={(e) =>
                    handleChange("quantidade_membros", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="renda_familiar">Renda familiar (R$)</Label>
                <Input
                  id="renda_familiar"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.renda_familiar}
                  onChange={(e) =>
                    handleChange("renda_familiar", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Integrantes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFamilyMember}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar membro
                </Button>
              </div>
              {familyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum membro adicionado. Utilize o botão acima para incluir os
                  integrantes da família.
                </p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Parentesco</TableHead>
                        <TableHead>Idade</TableHead>
                        <TableHead>Escolaridade</TableHead>
                        <TableHead>Ocupação</TableHead>
                        <TableHead>Renda (R$)</TableHead>
                        <TableHead className="w-[60px] text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {familyMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Input
                              value={member.nome}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "nome",
                                  e.target.value,
                                )
                              }
                              placeholder="Nome completo"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={member.parentesco}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "parentesco",
                                  e.target.value,
                                )
                              }
                              placeholder="Parentesco"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={member.idade}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "idade",
                                  e.target.value,
                                )
                              }
                              placeholder="Idade"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={member.escolaridade}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "escolaridade",
                                  e.target.value,
                                )
                              }
                              placeholder="Escolaridade"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={member.ocupacao}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "ocupacao",
                                  e.target.value,
                                )
                              }
                              placeholder="Ocupação"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={member.renda}
                              onChange={(e) =>
                                updateFamilyMember(
                                  member.id,
                                  "renda",
                                  e.target.value,
                                )
                              }
                              placeholder="Renda"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFamilyMember(member.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Condições de Moradia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
              <Label htmlFor="moradia_tipo">Tipo de moradia</Label>
              <Select
                value={formData.moradia_tipo}
                onValueChange={(v) => handleChange("moradia_tipo", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="kitnet">Kitnet</SelectItem>
                    <SelectItem value="comodo">Cômodo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="situacao_moradia">Situação</Label>
                <Select
                  value={formData.situacao_moradia}
                  onValueChange={(v) => handleChange("situacao_moradia", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="propria">Própria</SelectItem>
                    <SelectItem value="alugada">Alugada</SelectItem>
                    <SelectItem value="cedida">Cedida</SelectItem>
                    <SelectItem value="financiada">Financiada</SelectItem>
                    <SelectItem value="ocupacao">Ocupação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Possui saneamento básico?</Label>
              <Switch
                checked={formData.possui_saneamento}
                onCheckedChange={(v) => handleChange("possui_saneamento", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Possui energia elétrica?</Label>
              <Switch
                checked={formData.possui_energia}
                onCheckedChange={(v) => handleChange("possui_energia", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cadastro Socioassistencial</CardTitle>
            <CardDescription>
              Informe vínculo com CadÚnico, pontos de referência e benefícios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nis">NIS</Label>
                <Input
                  id="nis"
                  value={formData.nis}
                  onChange={(e) => handleChange("nis", e.target.value)}
                  placeholder="Número do NIS"
                />
              </div>
              <div>
                <Label htmlFor="cadunico_status">Cadastro Único</Label>
                <Select
                  value={formData.cadunico_status}
                  onValueChange={(v) => handleChange("cadunico_status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atualizado">Atualizado</SelectItem>
                    <SelectItem value="desatualizado">Desatualizado</SelectItem>
                    <SelectItem value="nao_inscrito">Não inscrito</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cras">CRAS de referência</Label>
                <Input
                  id="cras"
                  value={formData.cras}
                  onChange={(e) => handleChange("cras", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="creas">CREAS de referência</Label>
                <Input
                  id="creas"
                  value={formData.creas}
                  onChange={(e) => handleChange("creas", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="beneficios_sociais">Benefícios sociais</Label>
              <Textarea
                id="beneficios_sociais"
                value={formData.beneficios_sociais}
                onChange={(e) =>
                  handleChange("beneficios_sociais", e.target.value)
                }
                rows={3}
                placeholder="Liste benefícios, programas e auxílios recebidos"
              />
            </div>

            <div className="space-y-3">
              <Label>Rede socioassistencial e intersetorial</Label>
              <p className="text-sm text-muted-foreground">
                Selecione os registros e serviços em que o jovem está inserido
                (CMAS, CMDCA, CRAS, CREAS, etc.)
              </p>
              {loadingRegistros ? (
                <p className="text-sm text-muted-foreground">
                  Carregando registros sociais...
                </p>
              ) : registrosSociais && registrosSociais.length > 0 ? (
                <div className="space-y-2 border rounded-lg p-4">
                  {registrosSociais.map((registro) => (
                    <div
                      key={registro.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`registro-${registro.id}`}
                        checked={selectedRegistrosSociais.includes(registro.id)}
                        onCheckedChange={() =>
                          handleToggleRegistroSocial(registro.id)
                        }
                      />
                      <Label
                        htmlFor={`registro-${registro.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {registro.sigla ? `${registro.sigla} - ` : ""}
                        {registro.nome}
                        {registro.descricao && (
                          <span className="text-muted-foreground ml-1">
                            ({registro.descricao})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro social configurado. Configure em Configurações
                  → Registros Sociais.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              rows={4}
              placeholder="Outras observações relevantes..."
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
            {isEditing ? "Salvar alterações" : "Registrar Avaliação"}
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
