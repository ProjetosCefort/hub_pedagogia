import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

interface Turma {
  id: string;
  codigo: string;
  nome: string;
}

interface Unidade {
  id: string;
  nome: string;
}

export default function JovemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [originalStatus, setOriginalStatus] = useState<string>("active_apprentice");
  const [statusChangeReason, setStatusChangeReason] = useState<string>("");

  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    nome_completo: "",
    data_nascimento: "",
    cpf: "",
    rg: "",
    sexo: "",
    raca: "",
    estado_civil: "",
    email: "",
    telefone: "",
    celular: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    matricula: "",
    data_admissao: "",
    status: "active_apprentice",
    empresa_id: "",
    turma_id: "",
    unidade_id: "",
    nome_mae: "",
    nome_pai: "",
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_parentesco: "",
    observacoes: "",
  });

  useEffect(() => {
    fetchRelatedData();
    if (id) {
      fetchJovem();
    }
  }, [id]);

  async function fetchRelatedData() {
    const [empresasRes, turmasRes, unidadesRes] = await Promise.all([
      supabase
        .from("empresas")
        .select("id, razao_social, nome_fantasia")
        .order("razao_social"),
      supabase.from("turmas").select("id, codigo, nome").order("nome"),
      supabase.from("unidades").select("id, nome").order("nome"),
    ]);

    if (empresasRes.data) setEmpresas(empresasRes.data);
    if (turmasRes.data) setTurmas(turmasRes.data);
    if (unidadesRes.data) setUnidades(unidadesRes.data);
  }

  async function fetchJovem() {
    const { data, error } = await supabase
      .from("jovens")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast({ title: "Erro ao carregar jovem", variant: "destructive" });
      return;
    }

    if (data) {
      const currentStatus = data.status || "active_apprentice";
      setOriginalStatus(currentStatus);
      setFormData({
        nome_completo: data.nome_completo || "",
        data_nascimento: data.data_nascimento || "",
        cpf: data.cpf || "",
        rg: data.rg || "",
        sexo: data.sexo || "",
        raca: data.raca || "",
        estado_civil: data.estado_civil || "",
        email: data.email || "",
        telefone: data.telefone || "",
        celular: data.celular || "",
        cep: data.cep || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.cidade || "",
        estado: data.estado || "",
        matricula: data.matricula || "",
        data_admissao: data.data_admissao || "",
        status: currentStatus,
        empresa_id: data.empresa_id || "",
        turma_id: data.turma_id || "",
        unidade_id: data.unidade_id || "",
        nome_mae: data.nome_mae || "",
        nome_pai: data.nome_pai || "",
        responsavel_nome: data.responsavel_nome || "",
        responsavel_telefone: data.responsavel_telefone || "",
        responsavel_parentesco: data.responsavel_parentesco || "",
        observacoes: data.observacoes || "",
      });
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        status: formData.status as
          | "draft"
          | "completed"
          | "under_analysis"
          | "pending_documents"
          | "approved"
          | "rejected"
          | "active_apprentice"
          | "inactive"
          | "terminated"
          | "completed_program",
        matricula: formData.matricula?.trim() || null,
        empresa_id: formData.empresa_id || null,
        turma_id: formData.turma_id || null,
        unidade_id: formData.unidade_id || null,
        data_nascimento: formData.data_nascimento || null,
        data_admissao: formData.data_admissao || null,
        created_by: user?.id,
      };

      if (isEditing) {
        const statusChanged = originalStatus !== formData.status;

        // Se o status mudou, usar função de atualização com validação (máquina de estados)
        if (statusChanged && id) {
          const { data: historyId, error: statusError } = await supabase.rpc(
            "change_young_status",
            {
              p_jovem_id: id,
              p_new_status: formData.status,
              p_reason: statusChangeReason || null,
            },
          );

          if (statusError) throw statusError;

          // Atualizar outros campos normalmente (sem status)
          const { status: _, ...payloadWithoutStatus } = payload;
          const { error: updateError } = await supabase
            .from("jovens")
            .update(payloadWithoutStatus)
            .eq("id", id);

          if (updateError) throw updateError;
        } else {
          // Se status não mudou, atualizar normalmente
          const { error } = await supabase
            .from("jovens")
            .update(payload)
            .eq("id", id);
          if (error) throw error;
        }

        toast({ title: "Jovem aprendiz atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("jovens").insert([payload]);
        if (error) throw error;
        toast({ title: "Jovem aprendiz cadastrado com sucesso!" });
      }

      navigate("/jovens");
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="page-header mb-0">
          <h1 className="page-title">
            {isEditing ? "Editar Jovem Aprendiz" : "Novo Jovem Aprendiz"}
          </h1>
          <p className="page-description">
            {isEditing
              ? "Atualize os dados do jovem aprendiz"
              : "Preencha os dados para cadastrar um novo jovem aprendiz"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Label htmlFor="nome_completo">Nome completo *</Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => handleChange("nome_completo", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="data_nascimento">Data de nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) =>
                  handleChange("data_nascimento", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleChange("cpf", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg}
                onChange={(e) => handleChange("rg", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sexo">Sexo</Label>
              <Select
                value={formData.sexo}
                onValueChange={(v) => handleChange("sexo", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estado_civil">Estado civil</Label>
              <Select
                value={formData.estado_civil}
                onValueChange={(v) => handleChange("estado_civil", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                  <SelectItem value="casado">Casado(a)</SelectItem>
                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="raca">Raça/Cor</Label>
              <Select
                value={formData.raca}
                onValueChange={(v) => handleChange("raca", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branca">Branca</SelectItem>
                  <SelectItem value="preta">Preta</SelectItem>
                  <SelectItem value="parda">Parda</SelectItem>
                  <SelectItem value="amarela">Amarela</SelectItem>
                  <SelectItem value="indigena">Indígena</SelectItem>
                  <SelectItem value="nao_informada">Não informada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                value={formData.celular}
                onChange={(e) => handleChange("celular", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => handleChange("cep", e.target.value)}
              />
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={formData.logradouro}
                onChange={(e) => handleChange("logradouro", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => handleChange("numero", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={(e) => handleChange("complemento", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleChange("bairro", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => handleChange("cidade", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value={formData.estado}
                onChange={(e) => handleChange("estado", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados Institucionais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Institucionais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                value={formData.matricula}
                onChange={(e) => handleChange("matricula", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="data_admissao">Data de admissão</Label>
              <Input
                id="data_admissao"
                type="date"
                value={formData.data_admissao}
                onChange={(e) => handleChange("data_admissao", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleChange("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="completed">Completo</SelectItem>
                  <SelectItem value="under_analysis">Em análise</SelectItem>
                  <SelectItem value="pending_documents">Documentos pendentes</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="active_apprentice">Aprendiz ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="terminated">Desligado</SelectItem>
                  <SelectItem value="completed_program">Programa concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEditing && originalStatus !== formData.status && (
              <div className="sm:col-span-2 lg:col-span-4">
                <Label htmlFor="statusChangeReason">
                  Motivo da mudança de status
                </Label>
                <Textarea
                  id="statusChangeReason"
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  rows={2}
                  placeholder="Informe o motivo da mudança de status..."
                />
              </div>
            )}
            <div>
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(v) => handleChange("empresa_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia || e.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="turma_id">Turma</Label>
              <Select
                value={formData.turma_id}
                onValueChange={(v) => handleChange("turma_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} ({t.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unidade_id">Unidade</Label>
              <Select
                value={formData.unidade_id}
                onValueChange={(v) => handleChange("unidade_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Responsável */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filiação e Responsável</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="nome_mae">Nome da mãe</Label>
              <Input
                id="nome_mae"
                value={formData.nome_mae}
                onChange={(e) => handleChange("nome_mae", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nome_pai">Nome do pai</Label>
              <Input
                id="nome_pai"
                value={formData.nome_pai}
                onChange={(e) => handleChange("nome_pai", e.target.value)}
              />
            </div>
            <div className="hidden lg:block" />
            <div>
              <Label htmlFor="responsavel_nome">Nome do responsável</Label>
              <Input
                id="responsavel_nome"
                value={formData.responsavel_nome}
                onChange={(e) =>
                  handleChange("responsavel_nome", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="responsavel_telefone">
                Telefone do responsável
              </Label>
              <Input
                id="responsavel_telefone"
                value={formData.responsavel_telefone}
                onChange={(e) =>
                  handleChange("responsavel_telefone", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="responsavel_parentesco">Parentesco</Label>
              <Input
                id="responsavel_parentesco"
                value={formData.responsavel_parentesco}
                onChange={(e) =>
                  handleChange("responsavel_parentesco", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              rows={4}
              placeholder="Informações adicionais sobre o jovem aprendiz..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
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
            {isEditing ? "Salvar alterações" : "Cadastrar jovem aprendiz"}
          </Button>
        </div>
      </form>
    </div>
  );
}
