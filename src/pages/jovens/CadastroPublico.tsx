import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cleanCpf, formatCpf, isValidCpf } from "@/lib/cpf";

export default function CadastroPublico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingCpf, setCheckingCpf] = useState(false);
  const [cpfExists, setCpfExists] = useState<boolean | null>(null);
  const [step, setStep] = useState<"cpf" | "form">("cpf");

  const [formData, setFormData] = useState({
    cpf: "",
    nome_completo: "",
    data_nascimento: "",
    rg: "",
    sexo: "",
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
    nome_mae: "",
    nome_pai: "",
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_parentesco: "",
    observacoes: "",
  });

  // Formata CPF enquanto digita
  const handleCpfChange = (value: string) => {
    const formatted = formatCpf(value);
    setFormData((prev) => ({ ...prev, cpf: formatted }));
  };

  // Verifica se CPF já existe no banco usando função do Supabase
  const checkCpfExists = async (cpf: string) => {
    const cleaned = cleanCpf(cpf);
    if (cleaned.length !== 11 || !isValidCpf(cpf)) {
      setCpfExists(null);
      return;
    }

    setCheckingCpf(true);
    try {
      const { data, error } = await supabase.rpc("check_cpf_exists", {
        _cpf: cleaned,
      });

      if (error) throw error;

      if (data) {
        setCpfExists(true);
      } else {
        setCpfExists(false);
      }
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
      // Fallback: tenta verificar diretamente (pode falhar se não houver permissão)
      try {
        const { data, error: directError } = await supabase
          .from("jovens")
          .select("id")
          .eq("cpf", cleaned)
          .maybeSingle();

        if (!directError && data) {
          setCpfExists(true);
        } else {
          setCpfExists(false);
        }
      } catch {
        toast({
          title: "Erro ao verificar CPF",
          description: "Tente novamente em alguns instantes",
          variant: "destructive",
        });
      }
    } finally {
      setCheckingCpf(false);
    }
  };

  // Verifica CPF quando estiver completo e válido
  useEffect(() => {
    const cleaned = cleanCpf(formData.cpf);
    if (cleaned.length === 11 && isValidCpf(formData.cpf)) {
      const timeoutId = setTimeout(() => {
        checkCpfExists(formData.cpf);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setCpfExists(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.cpf]);

  const handleCpfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanCpf(formData.cpf);

    if (cleaned.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, informe um CPF completo",
        variant: "destructive",
      });
      return;
    }

    if (!isValidCpf(formData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "O CPF informado não é válido",
        variant: "destructive",
      });
      return;
    }

    if (cpfExists) {
      toast({
        title: "CPF já cadastrado",
        description: "Este CPF já possui cadastro no sistema",
        variant: "destructive",
      });
      return;
    }

    if (cpfExists === false) {
      setStep("form");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanedCpf = cleanCpf(formData.cpf);

      // Verifica novamente se CPF existe antes de cadastrar
      const { data: cpfExists } = await supabase.rpc("check_cpf_exists", {
        _cpf: cleanedCpf,
      });

      if (cpfExists) {
        toast({
          title: "CPF já cadastrado",
          description: "Este CPF já possui cadastro no sistema",
          variant: "destructive",
        });
        setStep("cpf");
        setCpfExists(true);
        return;
      }

      const payload = {
        ...formData,
        cpf: cleanedCpf,
        status: "active_apprentice" as const,
        data_nascimento: formData.data_nascimento || null,
        empresa_id: null,
        turma_id: null,
        unidade_id: null,
      };

      const { error } = await supabase.from("jovens").insert([payload]);

      if (error) throw error;

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Seus dados foram registrados no sistema",
      });

      // Limpa o formulário e volta para a tela de CPF
      setFormData({
        cpf: "",
        nome_completo: "",
        data_nascimento: "",
        rg: "",
        sexo: "",
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
        nome_mae: "",
        nome_pai: "",
        responsavel_nome: "",
        responsavel_telefone: "",
        responsavel_parentesco: "",
        observacoes: "",
      });
      setStep("cpf");
      setCpfExists(null);
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Ocorreu um erro ao realizar o cadastro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Jovem Aprendiz</h1>
          <p className="text-muted-foreground">
            Preencha seus dados para se cadastrar no sistema
          </p>
        </div>

        {step === "cpf" ? (
          /* Tela de verificação de CPF */
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">Verificação de CPF</CardTitle>
              <CardDescription>
                Informe seu CPF para verificar se já possui cadastro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCpfSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="text-lg"
                    autoFocus
                    required
                  />
                  {checkingCpf && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verificando CPF...
                    </p>
                  )}
                  {cpfExists === true && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Este CPF já possui cadastro no sistema. Se você já se cadastrou anteriormente,
                        não é necessário realizar um novo cadastro.
                      </AlertDescription>
                    </Alert>
                  )}
                  {cpfExists === false && (
                    <Alert className="mt-2 border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        CPF disponível para cadastro. Clique em "Continuar" para preencher seus dados.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={checkingCpf || cpfExists === true || cpfExists === null}
                >
                  {checkingCpf ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Formulário completo */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="nome_completo">Nome completo *</Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => handleChange("nome_completo", e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="data_nascimento">Data de nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => handleChange("data_nascimento", e.target.value)}
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="sexo">Sexo</Label>
                    <Select value={formData.sexo} onValueChange={(v) => handleChange("sexo", v)}>
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
                </div>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contato</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={formData.celular}
                    onChange={(e) => handleChange("celular", e.target.value)}
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
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => handleChange("cep", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={formData.logradouro}
                      onChange={(e) => handleChange("logradouro", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => handleChange("numero", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => handleChange("complemento", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
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
                      maxLength={2}
                      placeholder="UF"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filiação e Responsável */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filiação e Responsável</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
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
                <div>
                  <Label htmlFor="responsavel_nome">Nome do responsável</Label>
                  <Input
                    id="responsavel_nome"
                    value={formData.responsavel_nome}
                    onChange={(e) => handleChange("responsavel_nome", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="responsavel_telefone">Telefone do responsável</Label>
                  <Input
                    id="responsavel_telefone"
                    value={formData.responsavel_telefone}
                    onChange={(e) => handleChange("responsavel_telefone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="responsavel_parentesco">Parentesco</Label>
                  <Input
                    id="responsavel_parentesco"
                    value={formData.responsavel_parentesco}
                    onChange={(e) => handleChange("responsavel_parentesco", e.target.value)}
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
                  placeholder="Informações adicionais (opcional)..."
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setStep("cpf");
                  setCpfExists(null);
                }}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button type="submit" className="w-full sm:flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Finalizar Cadastro"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
