import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  cleanCpf,
  formatCpf,
  isValidCpf,
  cleanRg,
  formatRg,
  cleanPhone,
  formatPhone,
  cleanCep,
  formatCep,
  normalizeName,
  isUnder18,
  isValidEmail,
  arePhonesDifferent,
} from "@/lib/formatters";
import { buscarCep, isRegiaoMetropolitana } from "@/lib/cep";
import { sendConfirmationEmail } from "@/lib/email";
import { useRegistrosSociais } from "@/hooks/useConfiguracoes";

interface InscricaoData {
  // Identificação
  cpf: string;
  email: string;
  
  // Step 1
  nome_completo: string;
  nome_social: string;
  tem_nome_social: boolean;
  rg: string;
  data_nascimento: string;
  sexo: string;
  raca: string;
  contato_1: string;
  contato_2: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  regiao_metropolitana: boolean;
  esta_estudando: boolean;
  periodo_estudo: string;
  nivel_educacao: string;
  habilidades_computador: string;
  e_pcd: boolean;
  nivel_pcd: string;
  descricao_pcd: string;
  laudo_medico_url: string;
  e_estrangeiro: boolean;
  pais_origem: string;
  
  // Step 2
  responsavel_nome: string;
  responsavel_telefone: string;
  responsavel_email: string;
  responsavel_parentesco: string;
  contatos_mensagem: any;
  pis_pasep: string;
  tem_ctps_digital: boolean;
  numero_ctps: string;
  unidade_preferencia: string;
  tamanho_uniforme: string;
  tamanho_calcado: string;
  
  // Step 3
  composicao_familiar: any;
  renda_familiar: string;
  quantidade_membros: string;
  tipo_moradia: string;
  situacao_moradia: string;
  possui_saneamento: boolean;
  possui_energia: boolean;
  possui_doenca_cronica: boolean;
  descricao_doenca: string;
  possui_deficiencia: boolean;
  descricao_deficiencia: string;
  acompanhamento_medico: boolean;
  descricao_acompanhamento: string;
  recebe_beneficio: boolean;
  descricao_beneficio: string;
  participa_programa_social: boolean;
  descricao_programa: string;
  registros_sociais_ids: string[];
  observacoes: string;
}

export default function InscricaoJovemAprendiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingCpf, setCheckingCpf] = useState(false);
  const [cpfExists, setCpfExists] = useState<boolean | null>(null);
  const [inscricaoId, setInscricaoId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [stepSaved, setStepSaved] = useState(false);
  const [persistedStep, setPersistedStep] = useState(1);
  const [inscricaoStatus, setInscricaoStatus] = useState<string>("draft");
  
  const tokenParam = searchParams.get("token");
  const cpfParam = searchParams.get("cpf");
  const emailParam = searchParams.get("email");

  const [formData, setFormData] = useState<InscricaoData>({
    cpf: "",
    email: "",
    nome_completo: "",
    nome_social: "",
    tem_nome_social: false,
    rg: "",
    data_nascimento: "",
    sexo: "",
    raca: "",
    contato_1: "",
    contato_2: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    regiao_metropolitana: false,
    esta_estudando: false,
    periodo_estudo: "",
    nivel_educacao: "",
    habilidades_computador: "",
    e_pcd: false,
    nivel_pcd: "",
    descricao_pcd: "",
    laudo_medico_url: "",
    e_estrangeiro: false,
    pais_origem: "",
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_email: "",
    responsavel_parentesco: "",
    contatos_mensagem: null,
    pis_pasep: "",
    tem_ctps_digital: false,
    numero_ctps: "",
    unidade_preferencia: "",
    tamanho_uniforme: "",
    tamanho_calcado: "",
    composicao_familiar: null,
    renda_familiar: "",
    quantidade_membros: "",
    tipo_moradia: "",
    situacao_moradia: "",
    possui_saneamento: true,
    possui_energia: true,
    possui_doenca_cronica: false,
    descricao_doenca: "",
    possui_deficiencia: false,
    descricao_deficiencia: "",
    acompanhamento_medico: false,
    descricao_acompanhamento: "",
    recebe_beneficio: false,
    descricao_beneficio: "",
    participa_programa_social: false,
    descricao_programa: "",
    registros_sociais_ids: [],
    observacoes: "",
  });

  // Carrega dados existentes se houver token ou CPF+email
  useEffect(() => {
    if (tokenParam) {
      loadInscricaoByToken(tokenParam);
    } else if (cpfParam && emailParam) {
      loadInscricaoByCpfEmail(cpfParam, emailParam);
    }
  }, [tokenParam, cpfParam, emailParam]);

  // Estado para rastrear a última verificação feita (evita verificações repetidas)
  const [lastCheckedPair, setLastCheckedPair] = useState<string>("");
  
  // Verifica se já existe cadastro quando CPF e email são preenchidos
  useEffect(() => {
    const cleanedCpf = cleanCpf(formData.cpf);
    const hasValidCpf = cleanedCpf.length === 11 && isValidCpf(formData.cpf);
    const hasValidEmail = isValidEmail(formData.email);
    const emailLower = formData.email.toLowerCase();
    const currentPair = `${cleanedCpf}:${emailLower}`;
    
    // Se já verificamos este par CPF+email, não verifica novamente
    if (currentPair === lastCheckedPair) {
      return;
    }
    
    // Se CPF e email estão preenchidos e válidos, e não temos inscriçãoId ainda, verifica se existe
    if (hasValidCpf && hasValidEmail && !inscricaoId && !tokenParam && !loadingExisting) {
      const timeoutId = setTimeout(() => {
        setLastCheckedPair(currentPair);
        checkAndLoadExisting(cleanedCpf, formData.email);
      }, 1000); // Aguarda 1 segundo após parar de digitar
      return () => clearTimeout(timeoutId);
    }
  }, [formData.cpf, formData.email, inscricaoId, tokenParam, loadingExisting, lastCheckedPair]);

  async function loadInscricaoByToken(token: string) {
    try {
      const { data, error } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("*")
        .eq("edit_token", token)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInscricaoId(data.id);
        setEditToken(data.edit_token);
        setCurrentStep(data.current_step || 1);
        setPersistedStep(data.current_step || 1);
        setInscricaoStatus(data.status || "draft");
        populateFormData(data);
      }
    } catch (error) {
      console.error("Erro ao carregar inscrição:", error);
      toast({
        title: "Erro ao carregar cadastro",
        description: "Token inválido ou expirado",
        variant: "destructive",
      });
    }
  }

  async function loadInscricaoByCpfEmail(cpf: string, email: string) {
    try {
      const cleanedCpf = cleanCpf(cpf);
      const { data, error } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("*")
        .eq("cpf", cleanedCpf)
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInscricaoId(data.id);
        setEditToken(data.edit_token);
        setCurrentStep(data.current_step || 1);
        setPersistedStep(data.current_step || 1);
        setInscricaoStatus(data.status || "draft");
        populateFormData(data);
        // Marca como salvo se já tem dados
        setStepSaved(true);
        toast({
          title: "Cadastro encontrado!",
          description: "Seus dados foram carregados. Você pode continuar de onde parou.",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar inscrição:", error);
    }
  }

  async function checkAndLoadExisting(cpf: string, email: string) {
    setLoadingExisting(true);
    try {
      const cleanedCpf = cleanCpf(cpf);
      const { data, error } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("*")
        .eq("cpf", cleanedCpf)
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Cadastro existe, carrega os dados
        setInscricaoId(data.id);
        setEditToken(data.edit_token);
        setCurrentStep(data.current_step || 1);
        setPersistedStep(data.current_step || 1);
        setInscricaoStatus(data.status || "draft");
        populateFormData(data);
        setCpfExists(true);
        // Marca como salvo se já tem dados
        setStepSaved(true);
        toast({
          title: "Cadastro encontrado!",
          description: "Seus dados foram carregados automaticamente. Você pode continuar de onde parou.",
        });
      } else {
        // Cadastro não existe, permite novo cadastro
        setCpfExists(false);
      }
    } catch (error) {
      console.error("Erro ao verificar cadastro:", error);
    } finally {
      setLoadingExisting(false);
    }
  }

  function populateFormData(data: any) {
    // Formata os dados para exibição (telefones, CEP, RG)
    const formatPhoneForDisplay = (phone: string) => phone ? formatPhone(phone) : "";
    const formatCepForDisplay = (cep: string) => cep ? formatCep(cep) : "";
    const formatRgForDisplay = (rg: string) => rg ? formatRg(rg) : "";
    
    setFormData({
      cpf: data.cpf ? formatCpf(data.cpf) : "",
      email: data.email || "",
      nome_completo: data.nome_completo || "",
      nome_social: data.nome_social || "",
      tem_nome_social: data.tem_nome_social || false,
      rg: formatRgForDisplay(data.rg || ""),
      data_nascimento: data.data_nascimento || "",
      sexo: data.sexo || "",
      raca: data.raca || "",
      contato_1: formatPhoneForDisplay(data.contato_1 || ""),
      contato_2: formatPhoneForDisplay(data.contato_2 || ""),
      cep: formatCepForDisplay(data.cep || ""),
      logradouro: data.logradouro || "",
      numero: data.numero || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      cidade: data.cidade || "",
      estado: data.estado || "",
      regiao_metropolitana: data.regiao_metropolitana || false,
      esta_estudando: data.esta_estudando || false,
      periodo_estudo: data.periodo_estudo || "",
      nivel_educacao: data.nivel_educacao || "",
      habilidades_computador: data.habilidades_computador || "",
      e_pcd: data.e_pcd || false,
      nivel_pcd: data.nivel_pcd || "",
      descricao_pcd: data.descricao_pcd || "",
      laudo_medico_url: data.laudo_medico_url || "",
      e_estrangeiro: data.e_estrangeiro || false,
      pais_origem: data.pais_origem || "",
      responsavel_nome: data.responsavel_nome || "",
      responsavel_telefone: formatPhoneForDisplay(data.responsavel_telefone || ""),
      responsavel_email: data.responsavel_email || "",
      responsavel_parentesco: data.responsavel_parentesco || "",
      contatos_mensagem: data.contatos_mensagem || null,
      pis_pasep: data.pis_pasep || "",
      tem_ctps_digital: data.tem_ctps_digital || false,
      numero_ctps: data.numero_ctps || "",
      unidade_preferencia: data.unidade_preferencia || "",
      tamanho_uniforme: data.tamanho_uniforme || "",
      tamanho_calcado: data.tamanho_calcado || "",
      composicao_familiar: data.composicao_familiar || null,
      renda_familiar: data.renda_familiar?.toString() || "",
      quantidade_membros: data.quantidade_membros?.toString() || "",
      tipo_moradia: data.tipo_moradia || "",
      situacao_moradia: data.situacao_moradia || "",
      possui_saneamento: data.possui_saneamento ?? true,
      possui_energia: data.possui_energia ?? true,
      possui_doenca_cronica: data.possui_doenca_cronica || false,
      descricao_doenca: data.descricao_doenca || "",
      possui_deficiencia: data.possui_deficiencia || false,
      descricao_deficiencia: data.descricao_deficiencia || "",
      acompanhamento_medico: data.acompanhamento_medico || false,
      descricao_acompanhamento: data.descricao_acompanhamento || "",
      recebe_beneficio: data.recebe_beneficio || false,
      descricao_beneficio: data.descricao_beneficio || "",
      participa_programa_social: data.participa_programa_social || false,
      descricao_programa: data.descricao_programa || "",
      registros_sociais_ids: Array.isArray(data.registros_sociais_ids)
        ? data.registros_sociais_ids
        : [],
      observacoes: data.observacoes || "",
    });
  }

  // Estado para rastrear o último CPF verificado (evita verificações repetidas)
  const [lastCheckedCpf, setLastCheckedCpf] = useState<string>("");
  
  // Verifica CPF único apenas se não tiver inscriçãoId (não está editando)
  useEffect(() => {
    const cleaned = cleanCpf(formData.cpf);
    
    // Se o CPF já foi verificado, não verifica novamente
    if (cleaned === lastCheckedCpf) {
      return;
    }
    
    // Se o CPF não é válido, reseta o estado
    if (cleaned.length !== 11 || !isValidCpf(formData.cpf)) {
      if (!inscricaoId) {
        setCpfExists(null);
        setLastCheckedCpf("");
      }
      return;
    }
    
    // Só verifica se não tiver inscriçãoId e não estiver carregando dados existentes
    if (!inscricaoId && !loadingExisting) {
      const timeoutId = setTimeout(() => {
        setLastCheckedCpf(cleaned);
        checkCpfExists(cleaned);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.cpf, inscricaoId, loadingExisting, lastCheckedCpf]);

  async function checkCpfExists(cpf: string) {
    setCheckingCpf(true);
    try {
      const { data, error } = await supabase.rpc("check_cpf_inscricao_exists", {
        _cpf: cpf,
      });

      if (error) throw error;
      setCpfExists(data);
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
    } finally {
      setCheckingCpf(false);
    }
  }

  const handleChange = (field: keyof InscricaoData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Busca CEP
  async function handleCepBlur() {
    const cleaned = cleanCep(formData.cep);
    if (cleaned.length === 8) {
      const cepData = await buscarCep(cleaned);
      if (cepData) {
        setFormData((prev) => ({
          ...prev,
          logradouro: cepData.logradouro || "",
          bairro: cepData.bairro || "",
          cidade: cepData.localidade || "",
          estado: cepData.uf || "",
          complemento: cepData.complemento || prev.complemento,
          regiao_metropolitana: isRegiaoMetropolitana(cepData.uf, cepData.localidade),
        }));
      }
    }
  }

  // Validações por step
  function validateStep1(): boolean {
    if (!formData.cpf || !isValidCpf(formData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, informe um CPF válido",
        variant: "destructive",
      });
      return false;
    }

    if (cpfExists && !inscricaoId) {
      toast({
        title: "CPF já cadastrado",
        description: "Este CPF já possui uma inscrição",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.nome_completo.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome completo",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.data_nascimento) {
      toast({
        title: "Data de nascimento obrigatória",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.sexo) {
      toast({
        title: "Sexo obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.raca) {
      toast({
        title: "Raça obrigatória",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.contato_1) {
      toast({
        title: "Contato obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.cep || cleanCep(formData.cep).length !== 8) {
      toast({
        title: "CEP inválido",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.email || !isValidEmail(formData.email)) {
      toast({
        title: "Email inválido",
        variant: "destructive",
      });
      return false;
    }

    if (formData.contato_2 && !arePhonesDifferent(formData.contato_1, formData.contato_2)) {
      toast({
        title: "Contatos devem ser diferentes",
        variant: "destructive",
      });
      return false;
    }

    // Se está estudando, período e nível são obrigatórios
    if (formData.esta_estudando && (!formData.periodo_estudo || !formData.nivel_educacao)) {
      toast({
        title: "Complete as informações de estudo",
        description: "Se está estudando, informe o período e nível de educação",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }

  function validateStep2(): boolean {
    const isMinor = formData.data_nascimento ? isUnder18(formData.data_nascimento) : false;
    
    if (isMinor) {
      if (!formData.responsavel_nome || !formData.responsavel_telefone || !formData.responsavel_email || !formData.responsavel_parentesco) {
        toast({
          title: "Dados do responsável obrigatórios",
          description: "Menores de 18 anos devem informar os dados do responsável legal",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  }

  function validateStep3(): boolean {
    // Validações básicas do step 3
    return true;
  }

  // Salva step atual
  async function saveStep(stepNumber: number, markAsCompleted = false) {
    setSaving(true);
    try {
      const cleanedCpf = cleanCpf(formData.cpf);
      const nextStep = markAsCompleted ? Math.min(stepNumber + 1, 3) : stepNumber;
      const nextPersistedStep = inscricaoId ? Math.max(persistedStep, nextStep) : nextStep;
      const payload: any = {
        cpf: cleanedCpf,
        email: formData.email.toLowerCase(),
        current_step: nextPersistedStep,
      };

      if (!inscricaoId) {
        payload.status = markAsCompleted && stepNumber === 3 ? "talent_bank" : "draft";
      } else if (inscricaoStatus === "draft" || inscricaoStatus === "completed") {
        payload.status = markAsCompleted && stepNumber === 3 ? "talent_bank" : "draft";
      }

      // Adiciona campos do step atual
      if (stepNumber === 1) {
        payload.nome_completo = normalizeName(formData.nome_completo);
        payload.nome_social = formData.tem_nome_social ? normalizeName(formData.nome_social) : null;
        payload.tem_nome_social = formData.tem_nome_social;
        payload.rg = formData.rg ? cleanRg(formData.rg) : null;
        payload.data_nascimento = formData.data_nascimento;
        payload.sexo = formData.sexo;
        payload.raca = formData.raca;
        payload.contato_1 = cleanPhone(formData.contato_1);
        payload.contato_2 = formData.contato_2 ? cleanPhone(formData.contato_2) : null;
        payload.cep = cleanCep(formData.cep);
        payload.logradouro = formData.logradouro;
        payload.numero = formData.numero;
        payload.complemento = formData.complemento;
        payload.bairro = formData.bairro;
        payload.cidade = formData.cidade;
        payload.estado = formData.estado;
        payload.regiao_metropolitana = formData.regiao_metropolitana;
        payload.esta_estudando = formData.esta_estudando;
        payload.periodo_estudo = formData.periodo_estudo;
        payload.nivel_educacao = formData.nivel_educacao;
        payload.habilidades_computador = formData.habilidades_computador;
        payload.e_pcd = formData.e_pcd;
        payload.nivel_pcd = formData.nivel_pcd;
        payload.descricao_pcd = formData.descricao_pcd;
        payload.laudo_medico_url = formData.laudo_medico_url;
        payload.e_estrangeiro = formData.e_estrangeiro;
        payload.pais_origem = formData.pais_origem;
        if (markAsCompleted) {
          payload.step1_completed_at = new Date().toISOString();
        }
      } else if (stepNumber === 2) {
        payload.responsavel_nome = formData.responsavel_nome;
        payload.responsavel_telefone = formData.responsavel_telefone ? cleanPhone(formData.responsavel_telefone) : null;
        payload.responsavel_email = formData.responsavel_email;
        payload.responsavel_parentesco = formData.responsavel_parentesco;
        payload.contatos_mensagem = formData.contatos_mensagem;
        payload.pis_pasep = formData.pis_pasep;
        payload.tem_ctps_digital = formData.tem_ctps_digital;
        payload.numero_ctps = formData.numero_ctps;
        payload.unidade_preferencia = formData.unidade_preferencia;
        payload.tamanho_uniforme = formData.tamanho_uniforme;
        payload.tamanho_calcado = formData.tamanho_calcado;
        if (markAsCompleted) {
          payload.step2_completed_at = new Date().toISOString();
        }
      } else if (stepNumber === 3) {
        payload.composicao_familiar = formData.composicao_familiar;
        payload.renda_familiar = formData.renda_familiar ? parseFloat(formData.renda_familiar) : null;
        payload.quantidade_membros = formData.quantidade_membros ? parseInt(formData.quantidade_membros) : null;
        payload.tipo_moradia = formData.tipo_moradia;
        payload.situacao_moradia = formData.situacao_moradia;
        payload.possui_saneamento = formData.possui_saneamento;
        payload.possui_energia = formData.possui_energia;
        payload.possui_doenca_cronica = formData.possui_doenca_cronica;
        payload.descricao_doenca = formData.descricao_doenca;
        payload.possui_deficiencia = formData.possui_deficiencia;
        payload.descricao_deficiencia = formData.descricao_deficiencia;
        payload.acompanhamento_medico = formData.acompanhamento_medico;
        payload.descricao_acompanhamento = formData.descricao_acompanhamento;
        payload.recebe_beneficio = formData.recebe_beneficio;
        payload.descricao_beneficio = formData.descricao_beneficio;
        payload.participa_programa_social = formData.participa_programa_social;
        payload.descricao_programa = formData.descricao_programa;
        payload.registros_sociais_ids = formData.registros_sociais_ids;
        payload.observacoes = formData.observacoes;
        if (markAsCompleted) {
          payload.step3_completed_at = new Date().toISOString();
          payload.completed_at = new Date().toISOString();
        }
      }

      if (inscricaoId) {
        // Atualiza existente
        const { data, error } = await supabase
          .from("inscricoes_jovens_aprendizes")
          .update(payload)
          .eq("id", inscricaoId)
          .select("current_step, status")
          .single();

        if (error) throw error;
        setPersistedStep(data.current_step || nextPersistedStep);
        setInscricaoStatus(data.status || inscricaoStatus);
      } else {
        // Cria novo - gera token
        let token: string;
        try {
          // Tenta usar a função do Supabase
          const { data: tokenData, error: tokenError } = await supabase.rpc("generate_edit_token");
          if (tokenError) throw tokenError;
          token = tokenData;
        } catch (error) {
          // Fallback: gera token no frontend se a função não existir
          const array = new Uint8Array(32);
          crypto.getRandomValues(array);
          token = btoa(String.fromCharCode(...array))
            .replace(/\//g, '_')
            .replace(/\+/g, '-')
            .replace(/=/g, '');
        }
        
        payload.edit_token = token;
        payload.token_expires_at = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 dias

        const { data, error } = await supabase
          .from("inscricoes_jovens_aprendizes")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setInscricaoId(data.id);
        setEditToken(data.edit_token);
        setPersistedStep(data.current_step || nextPersistedStep);
        setInscricaoStatus(data.status || "draft");

        // Envia email de confirmação apenas na primeira vez
        if (stepNumber === 1 && markAsCompleted) {
          const emailSent = await sendConfirmationEmail(data.email, data.edit_token);
          if (emailSent) {
            toast({
              title: "Enviamos o link seguro",
              description: "Confira seu e-mail (incluindo a caixa de spam) para continuar a inscrição quando quiser.",
            });
          } else {
            toast({
              title: "Não foi possível enviar o e-mail",
              description: "Sua inscrição foi salva, mas o envio falhou. Tente novamente em alguns minutos.",
              variant: "destructive",
            });
          }
        }
      }

      // Marca o step como salvo
      setStepSaved(true);

      toast({
        title: "Dados salvos com sucesso!",
        description: markAsCompleted 
          ? "Você pode continuar ou retornar depois" 
          : "Progresso salvo. Você pode fechar a página e retornar depois.",
      });

      if (markAsCompleted && stepNumber < 3) {
        setStepSaved(false); // Reset para o próximo step
        setCurrentStep(stepNumber + 1);
      } else if (markAsCompleted && stepNumber === 3) {
        toast({
          title: "Inscrição concluída!",
          description: "Você foi adicionado ao Banco de Talentos",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }


  async function handleSaveAndContinue() {
    // Valida antes de salvar
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;

    // Se já foi salvo, avança para próxima etapa
    if (stepSaved && currentStep < 3) {
      setStepSaved(false);
      setCurrentStep(currentStep + 1);
      return;
    }

    // Se é a última etapa e já foi salvo, finaliza
    if (stepSaved && currentStep === 3) {
      // Já está finalizado, não faz nada
      return;
    }

    // Salva e marca como concluído (avança para próxima etapa)
    await saveStep(currentStep, true);
  }

  const progressValue = (currentStep / 3) * 100;
  const isMinor = formData.data_nascimento ? isUnder18(formData.data_nascimento) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-4 sm:py-8 px-3 sm:px-4">
      {loadingExisting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-5 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Carregando seu cadastro</p>
              <p className="text-xs text-muted-foreground">
                Aguarde enquanto localizamos e preenchemos seus dados.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 px-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inscrição Jovem Aprendiz</h1>
          <p className="text-sm sm:text-base text-muted-foreground px-2">
            Preencha o máximo de dados possíveis para aumentar suas chances
          </p>
        </div>

        {/* Progress */}
        <Card className="shadow-sm">
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
                <span>Etapa {currentStep} de 3</span>
                <span>{Math.round(progressValue)}% concluído</span>
              </div>
              <Progress value={progressValue} className="h-2 sm:h-4" />
              <div className="flex flex-col sm:flex-row justify-between mt-2 gap-1 sm:gap-0">
                <span className={`text-xs sm:text-sm ${currentStep >= 1 ? "font-medium" : "text-muted-foreground"}`}>
                  Informações Básicas
                </span>
                <span className={`text-xs sm:text-sm ${currentStep >= 2 ? "font-medium" : "text-muted-foreground"}`}>
                  Dados Complementares
                </span>
                <span className={`text-xs sm:text-sm ${currentStep >= 3 ? "font-medium" : "text-muted-foreground"}`}>
                  Socioeconômico
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Steps */}
        <form onSubmit={(e) => { e.preventDefault(); handleSaveAndContinue(); }}>
          {currentStep === 1 && <Step1 formData={formData} handleChange={handleChange} handleCepBlur={handleCepBlur} checkingCpf={checkingCpf} cpfExists={cpfExists} isMinor={isMinor} inscricaoId={inscricaoId} loadingExisting={loadingExisting} />}
          {currentStep === 2 && <Step2 formData={formData} handleChange={handleChange} isMinor={isMinor} />}
          {currentStep === 3 && <Step3 formData={formData} handleChange={handleChange} />}

          {/* Actions */}
          <Card className="shadow-sm">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStepSaved(false);
                      setCurrentStep(currentStep - 1);
                    }}
                    disabled={saving || loading}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={saving || loading}
                  className={`w-full sm:w-auto ${currentStep > 1 ? "order-1 sm:order-2 sm:ml-auto" : "order-1 sm:ml-auto"} min-h-[44px] text-base`}
                >
                  {saving || loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : stepSaved ? (
                    currentStep === 3 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Inscrição Concluída
                      </>
                    ) : (
                      <>
                        Próxima Etapa
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )
                  ) : currentStep === 3 ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar e Finalizar
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar e Continuar
                    </>
                  )}
                </Button>
              </div>
              {stepSaved && currentStep < 3 && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center px-2">
                  ✓ Dados salvos! Você pode fechar esta página e retornar depois, ou clicar em "Próxima Etapa" para continuar.
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}

// Step 1 Component
function Step1({
  formData,
  handleChange,
  handleCepBlur,
  checkingCpf,
  cpfExists,
  isMinor,
  inscricaoId,
  loadingExisting,
}: {
  formData: InscricaoData;
  handleChange: (field: keyof InscricaoData, value: any) => void;
  handleCepBlur: () => void;
  checkingCpf: boolean;
  cpfExists: boolean | null;
  isMinor: boolean;
  inscricaoId: string | null;
  loadingExisting: boolean;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Alert className="mx-1">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <AlertDescription className="text-sm leading-relaxed">
          Preencha o máximo de dados possíveis, assim poderemos avaliar melhor seu perfil e aumentar suas chances de ser contratado.
        </AlertDescription>
      </Alert>

      {/* CPF e Email */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Identificação</CardTitle>
          {inscricaoId && (
            <CardDescription className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1">
              ✓ Cadastro encontrado! Seus dados foram carregados automaticamente.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="sm:col-span-2 sm:col-span-1">
            <Label htmlFor="cpf" className="text-sm font-medium">CPF *</Label>
            <Input
              id="cpf"
              value={formatCpf(formData.cpf)}
              onChange={(e) => handleChange("cpf", e.target.value)}
              maxLength={14}
              required
              disabled={!!inscricaoId}
              className={`text-base h-11 sm:h-10 ${inscricaoId ? "bg-muted" : ""}`}
            />
            {(loadingExisting || checkingCpf) && !inscricaoId && cpfExists === null && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {loadingExisting ? "Verificando se já existe cadastro..." : "Verificando CPF..."}
              </p>
            )}
            {cpfExists === true && !inscricaoId && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <AlertDescription className="text-xs leading-relaxed">
                  Este CPF já possui uma inscrição. Informe o e-mail para carregar seus dados.
                </AlertDescription>
              </Alert>
            )}
            {inscricaoId && (
              <Alert className="mt-2 border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <AlertDescription className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                  Seus dados foram carregados! Você pode editar e continuar de onde parou.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="sm:col-span-2 sm:col-span-1">
            <Label htmlFor="email" className="text-sm font-medium">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
              disabled={!!inscricaoId}
              className={`text-base h-11 sm:h-10 ${inscricaoId ? "bg-muted" : ""}`}
            />
            {inscricaoId && (
              <p className="text-xs text-muted-foreground mt-1">
                CPF e e-mail não podem ser alterados
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados Pessoais */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="nome_completo" className="text-sm font-medium">Nome Completo *</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => handleChange("nome_completo", e.target.value)}
              required
              className="text-base h-11 sm:h-10"
            />
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Switch
              id="tem_nome_social"
              checked={formData.tem_nome_social}
              onCheckedChange={(v) => handleChange("tem_nome_social", v)}
            />
            <Label htmlFor="tem_nome_social" className="text-sm font-medium cursor-pointer">Possui nome social?</Label>
          </div>

          {formData.tem_nome_social && (
            <div>
              <Label htmlFor="nome_social" className="text-sm font-medium">Nome Social</Label>
              <Input
                id="nome_social"
                value={formData.nome_social}
                onChange={(e) => handleChange("nome_social", e.target.value)}
                className="text-base h-11 sm:h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome pelo qual você prefere ser chamado(a)
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rg" className="text-sm font-medium">RG</Label>
              <Input
                id="rg"
                value={formatRg(formData.rg)}
                onChange={(e) => handleChange("rg", e.target.value)}
                maxLength={12}
                className="text-base h-11 sm:h-10"
              />
            </div>
            <div>
              <Label htmlFor="data_nascimento" className="text-sm font-medium">Data de Nascimento *</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleChange("data_nascimento", e.target.value)}
                required
                className="text-base h-11 sm:h-10"
              />
              {isMinor && (
                <p className="text-xs text-amber-600 mt-1">
                  Menor de 18 anos - Dados do responsável serão obrigatórios
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sexo" className="text-sm font-medium">Sexo *</Label>
              <Select value={formData.sexo} onValueChange={(v) => handleChange("sexo", v)}>
                <SelectTrigger className="h-11 sm:h-10 text-base">
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
              <Label htmlFor="raca" className="text-sm font-medium">Raça/Cor *</Label>
              <Select value={formData.raca} onValueChange={(v) => handleChange("raca", v)}>
                <SelectTrigger className="h-11 sm:h-10 text-base">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branca">Branca</SelectItem>
                  <SelectItem value="preta">Preta</SelectItem>
                  <SelectItem value="parda">Parda</SelectItem>
                  <SelectItem value="amarela">Amarela</SelectItem>
                  <SelectItem value="indigena">Indígena</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="contato_1" className="text-sm font-medium">Contato 1 (Celular) *</Label>
            <Input
              id="contato_1"
              value={formatPhone(formData.contato_1)}
              onChange={(e) => handleChange("contato_1", e.target.value)}
              maxLength={15}
              required
              className="text-base h-11 sm:h-10"
            />
          </div>
          <div>
            <Label htmlFor="contato_2" className="text-sm font-medium">Contato 2 (Telefone)</Label>
            <Input
              id="contato_2"
              value={formatPhone(formData.contato_2)}
              onChange={(e) => handleChange("contato_2", e.target.value)}
              maxLength={14}
              className="text-base h-11 sm:h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="cep" className="text-sm font-medium">CEP *</Label>
            <Input
              id="cep"
              value={formatCep(formData.cep)}
              onChange={(e) => handleChange("cep", e.target.value)}
              onBlur={handleCepBlur}
              maxLength={9}
              required
              className="text-base h-11 sm:h-10"
            />
          </div>
          <div>
            <Label htmlFor="logradouro" className="text-sm font-medium">Logradouro *</Label>
            <Input
              id="logradouro"
              value={formData.logradouro}
              onChange={(e) => handleChange("logradouro", e.target.value)}
              required
              className="text-base h-11 sm:h-10"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="numero" className="text-sm font-medium">Número *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => handleChange("numero", e.target.value)}
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="complemento" className="text-sm font-medium">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={(e) => handleChange("complemento", e.target.value)}
                className="text-base h-11 sm:h-10"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="bairro" className="text-sm font-medium">Bairro *</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleChange("bairro", e.target.value)}
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
            <div>
              <Label htmlFor="cidade" className="text-sm font-medium">Cidade *</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => handleChange("cidade", e.target.value)}
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
            <div>
              <Label htmlFor="estado" className="text-sm font-medium">Estado *</Label>
              <Input
                id="estado"
                value={formData.estado}
                onChange={(e) => handleChange("estado", e.target.value)}
                maxLength={2}
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educação */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Educação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex items-center space-x-2 py-2">
            <Switch
              id="esta_estudando"
              checked={formData.esta_estudando}
              onCheckedChange={(v) => handleChange("esta_estudando", v)}
            />
            <Label htmlFor="esta_estudando" className="text-sm font-medium cursor-pointer">Está estudando atualmente? *</Label>
          </div>

          {formData.esta_estudando && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="periodo_estudo" className="text-sm font-medium">Período de Estudo *</Label>
                <Select value={formData.periodo_estudo} onValueChange={(v) => handleChange("periodo_estudo", v)}>
                  <SelectTrigger className="h-11 sm:h-10 text-base">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nivel_educacao" className="text-sm font-medium">Nível de Educação *</Label>
                <Select value={formData.nivel_educacao} onValueChange={(v) => handleChange("nivel_educacao", v)}>
                  <SelectTrigger className="h-11 sm:h-10 text-base">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superior">Superior</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="medio">Ensino Médio</SelectItem>
                    <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habilidades e PCD */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Habilidades e Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="habilidades_computador" className="text-sm font-medium">Habilidades com Computador</Label>
            <Select value={formData.habilidades_computador} onValueChange={(v) => handleChange("habilidades_computador", v)}>
              <SelectTrigger className="h-11 sm:h-10 text-base">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="intermediario">Intermediário</SelectItem>
                <SelectItem value="avancado">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="e_pcd"
                checked={formData.e_pcd}
                onCheckedChange={(v) => handleChange("e_pcd", v)}
              />
              <Label htmlFor="e_pcd" className="text-sm font-medium cursor-pointer">É Pessoa com Deficiência (PCD)? *</Label>
            </div>

            {formData.e_pcd && (
              <div className="space-y-4 pl-0 sm:pl-6">
                <div>
                  <Label htmlFor="nivel_pcd" className="text-sm font-medium">Nível</Label>
                  <Select value={formData.nivel_pcd} onValueChange={(v) => handleChange("nivel_pcd", v)}>
                    <SelectTrigger className="h-11 sm:h-10 text-base">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo">Baixo</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="descricao_pcd" className="text-sm font-medium">Descrição</Label>
                  <Textarea
                    id="descricao_pcd"
                    value={formData.descricao_pcd}
                    onChange={(e) => handleChange("descricao_pcd", e.target.value)}
                    rows={3}
                    className="text-base resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="laudo_medico" className="text-sm font-medium">Laudo Médico</Label>
                  <Input
                    id="laudo_medico"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      // TODO: Implementar upload de arquivo
                      console.log("Upload laudo médico");
                    }}
                    className="text-sm h-auto py-2"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="e_estrangeiro"
                checked={formData.e_estrangeiro}
                onCheckedChange={(v) => handleChange("e_estrangeiro", v)}
              />
              <Label htmlFor="e_estrangeiro" className="text-sm font-medium cursor-pointer">É estrangeiro? *</Label>
            </div>

            {formData.e_estrangeiro && (
              <div>
                <Label htmlFor="pais_origem" className="text-sm font-medium">País de Origem</Label>
                <Input
                  id="pais_origem"
                  value={formData.pais_origem}
                  onChange={(e) => handleChange("pais_origem", e.target.value)}
                  className="text-base h-11 sm:h-10"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Step 2 Component (continua no próximo arquivo devido ao tamanho)
function Step2({
  formData,
  handleChange,
  isMinor,
}: {
  formData: InscricaoData;
  handleChange: (field: keyof InscricaoData, value: any) => void;
  isMinor: boolean;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Alert className="mx-1">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <AlertDescription className="text-sm leading-relaxed">
          Responder a essas perguntas não garante a vaga, mas facilita o processo de admissão.
        </AlertDescription>
      </Alert>

      {/* Responsável Legal */}
      {isMinor && (
        <Card className="shadow-sm">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Responsável Legal *</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Obrigatório para menores de 18 anos</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 px-4 sm:px-6 pb-4 sm:pb-6">
            <div>
              <Label htmlFor="responsavel_nome" className="text-sm font-medium">Nome Completo *</Label>
              <Input
                id="responsavel_nome"
                value={formData.responsavel_nome}
                onChange={(e) => handleChange("responsavel_nome", e.target.value)}
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
            <div>
              <Label htmlFor="responsavel_parentesco" className="text-sm font-medium">Parentesco *</Label>
              <Input
                id="responsavel_parentesco"
                value={formData.responsavel_parentesco}
                onChange={(e) => handleChange("responsavel_parentesco", e.target.value)}
                placeholder="Ex: Pai, Mãe, Avô..."
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
            <div>
              <Label htmlFor="responsavel_telefone" className="text-sm font-medium">Telefone *</Label>
              <Input
                id="responsavel_telefone"
                value={formatPhone(formData.responsavel_telefone)}
                onChange={(e) => handleChange("responsavel_telefone", e.target.value)}
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
            <div>
              <Label htmlFor="responsavel_email" className="text-sm font-medium">E-mail *</Label>
              <Input
                id="responsavel_email"
                type="email"
                value={formData.responsavel_email}
                onChange={(e) => handleChange("responsavel_email", e.target.value)}
                required
                className="text-base h-11 sm:h-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIS/PASEP e CTPS */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Documentos Trabalhistas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="pis_pasep" className="text-sm font-medium">PIS/PASEP</Label>
            <Input
              id="pis_pasep"
              value={formData.pis_pasep}
              onChange={(e) => handleChange("pis_pasep", e.target.value)}
              className="text-base h-11 sm:h-10"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="tem_ctps_digital"
                checked={formData.tem_ctps_digital}
                onCheckedChange={(v) => handleChange("tem_ctps_digital", v)}
              />
              <Label htmlFor="tem_ctps_digital" className="text-sm font-medium cursor-pointer">Possui Carteira de Trabalho Digital?</Label>
            </div>

            {formData.tem_ctps_digital ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                A CTPS digital utiliza o CPF como número de identificação
              </p>
            ) : (
              <div>
                <Label htmlFor="numero_ctps" className="text-sm font-medium">Número da CTPS</Label>
                <Input
                  id="numero_ctps"
                  value={formData.numero_ctps}
                  onChange={(e) => handleChange("numero_ctps", e.target.value)}
                  className="text-base h-11 sm:h-10"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unidade de Preferência */}
      {formData.regiao_metropolitana && (
        <Card className="shadow-sm">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Unidade de Preferência</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <Label htmlFor="unidade_preferencia" className="text-sm font-medium">Selecione a unidade</Label>
            <Select value={formData.unidade_preferencia} onValueChange={(v) => handleChange("unidade_preferencia", v)}>
              <SelectTrigger className="h-11 sm:h-10 text-base mt-2">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="belo_horizonte">
                  Belo Horizonte - Avenida Afonso Pena, n 867 - Centro - BH
                </SelectItem>
                <SelectItem value="contagem">
                  Contagem - Av. José Faria da Rocha, 5566 - Eldorado
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Uniforme */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Uniforme</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="tamanho_uniforme" className="text-sm font-medium">Tamanho do Uniforme</Label>
            <Select value={formData.tamanho_uniforme} onValueChange={(v) => handleChange("tamanho_uniforme", v)}>
              <SelectTrigger className="h-11 sm:h-10 text-base">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PP">PP</SelectItem>
                <SelectItem value="P">P</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="G">G</SelectItem>
                <SelectItem value="GG">GG</SelectItem>
                <SelectItem value="XG">XG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tamanho_calcado" className="text-sm font-medium">Tamanho do Calçado</Label>
            <Input
              id="tamanho_calcado"
              value={formData.tamanho_calcado}
              onChange={(e) => handleChange("tamanho_calcado", e.target.value)}
              className="text-base h-11 sm:h-10"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Step 3 Component
function Step3({
  formData,
  handleChange,
}: {
  formData: InscricaoData;
  handleChange: (field: keyof InscricaoData, value: any) => void;
}) {
  const { data: registrosSociais = [], isLoading: loadingRegistros } =
    useRegistrosSociais();
  const integrantes = Array.isArray(formData.composicao_familiar)
    ? formData.composicao_familiar
    : [];

  function addIntegrante() {
    handleChange("composicao_familiar", [
      ...integrantes,
      {
        nome: "",
        parentesco: "",
        idade: "",
        escolaridade: "",
        ocupacao: "",
        renda: "",
      },
    ]);
  }

  function updateIntegrante(index: number, field: string, value: string) {
    handleChange(
      "composicao_familiar",
      integrantes.map((item: any, itemIndex: number) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeIntegrante(index: number) {
    handleChange(
      "composicao_familiar",
      integrantes.filter((_: any, itemIndex: number) => itemIndex !== index),
    );
  }

  function toggleRegistroSocial(registroId: string) {
    const selected = formData.registros_sociais_ids;
    handleChange(
      "registros_sociais_ids",
      selected.includes(registroId)
        ? selected.filter((id) => id !== registroId)
        : [...selected, registroId],
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Composição Familiar */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Composição Familiar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="quantidade_membros" className="text-sm font-medium">Quantidade de Membros</Label>
            <Input
              id="quantidade_membros"
              type="number"
              min="1"
              value={formData.quantidade_membros}
              onChange={(e) => handleChange("quantidade_membros", e.target.value)}
              className="text-base h-11 sm:h-10"
            />
          </div>
          <div>
            <Label htmlFor="renda_familiar" className="text-sm font-medium">Renda Familiar (R$)</Label>
            <Input
              id="renda_familiar"
              type="number"
              step="0.01"
              min="0"
              value={formData.renda_familiar}
              onChange={(e) => handleChange("renda_familiar", e.target.value)}
              className="text-base h-11 sm:h-10"
            />
          </div>
          <div className="sm:col-span-2 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-sm font-medium">Integrantes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIntegrante}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar membro
              </Button>
            </div>
            {integrantes.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Nenhum integrante adicionado.
              </p>
            ) : (
              <div className="space-y-3">
                {integrantes.map((integrante: any, index: number) => (
                  <div key={index} className="rounded-md border p-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      <div className="lg:col-span-2">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={integrante.nome || ""}
                          onChange={(e) => updateIntegrante(index, "nome", e.target.value)}
                          className="text-base h-11 sm:h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Parentesco</Label>
                        <Input
                          value={integrante.parentesco || ""}
                          onChange={(e) => updateIntegrante(index, "parentesco", e.target.value)}
                          className="text-base h-11 sm:h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Idade</Label>
                        <Input
                          type="number"
                          min="0"
                          value={integrante.idade || ""}
                          onChange={(e) => updateIntegrante(index, "idade", e.target.value)}
                          className="text-base h-11 sm:h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Escolaridade</Label>
                        <Input
                          value={integrante.escolaridade || ""}
                          onChange={(e) => updateIntegrante(index, "escolaridade", e.target.value)}
                          className="text-base h-11 sm:h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Renda (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={integrante.renda || ""}
                          onChange={(e) => updateIntegrante(index, "renda", e.target.value)}
                          className="text-base h-11 sm:h-10"
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div>
                        <Label className="text-xs">Ocupação</Label>
                        <Input
                          value={integrante.ocupacao || ""}
                          onChange={(e) => updateIntegrante(index, "ocupacao", e.target.value)}
                          className="text-base h-11 sm:h-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIntegrante(index)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Condições de Moradia */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Condições de Moradia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tipo_moradia" className="text-sm font-medium">Tipo de Moradia</Label>
              <Select value={formData.tipo_moradia} onValueChange={(v) => handleChange("tipo_moradia", v)}>
                <SelectTrigger className="h-11 sm:h-10 text-base">
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
              <Label htmlFor="situacao_moradia" className="text-sm font-medium">Situação</Label>
              <Select value={formData.situacao_moradia} onValueChange={(v) => handleChange("situacao_moradia", v)}>
                <SelectTrigger className="h-11 sm:h-10 text-base">
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
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">Possui saneamento básico?</Label>
            <Switch
              checked={formData.possui_saneamento}
              onCheckedChange={(v) => handleChange("possui_saneamento", v)}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">Possui energia elétrica?</Label>
            <Switch
              checked={formData.possui_energia}
              onCheckedChange={(v) => handleChange("possui_energia", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Condições de Saúde */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Condições de Saúde</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">Possui doença crônica?</Label>
            <Switch
              checked={formData.possui_doenca_cronica}
              onCheckedChange={(v) => handleChange("possui_doenca_cronica", v)}
            />
          </div>
          {formData.possui_doenca_cronica && (
            <Textarea
              placeholder="Descreva a(s) doença(s)..."
              value={formData.descricao_doenca}
              onChange={(e) => handleChange("descricao_doenca", e.target.value)}
              rows={3}
              className="text-base resize-none"
            />
          )}

          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">Possui deficiência?</Label>
            <Switch
              checked={formData.possui_deficiencia}
              onCheckedChange={(v) => handleChange("possui_deficiencia", v)}
            />
          </div>
          {formData.possui_deficiencia && (
            <Textarea
              placeholder="Descreva a(s) deficiência(s)..."
              value={formData.descricao_deficiencia}
              onChange={(e) => handleChange("descricao_deficiencia", e.target.value)}
              rows={3}
              className="text-base resize-none"
            />
          )}

          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">Faz acompanhamento médico?</Label>
            <Switch
              checked={formData.acompanhamento_medico}
              onCheckedChange={(v) => handleChange("acompanhamento_medico", v)}
            />
          </div>
          {formData.acompanhamento_medico && (
            <Textarea
              placeholder="Descreva o acompanhamento..."
              value={formData.descricao_acompanhamento}
              onChange={(e) => handleChange("descricao_acompanhamento", e.target.value)}
              rows={3}
              className="text-base resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* Rede Socioassistencial */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Rede Socioassistencial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">Recebe algum benefício?</Label>
            <Switch
              checked={formData.recebe_beneficio}
              onCheckedChange={(v) => handleChange("recebe_beneficio", v)}
            />
          </div>
          {formData.recebe_beneficio && (
            <Textarea
              placeholder="Descreva o(s) benefício(s)..."
              value={formData.descricao_beneficio}
              onChange={(e) => handleChange("descricao_beneficio", e.target.value)}
              rows={3}
              className="text-base resize-none"
            />
          )}

          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">Participa de programa social?</Label>
            <Switch
              checked={formData.participa_programa_social}
              onCheckedChange={(v) => handleChange("participa_programa_social", v)}
            />
          </div>
          {formData.participa_programa_social && (
            <Textarea
              placeholder="Descreva o(s) programa(s)..."
              value={formData.descricao_programa}
              onChange={(e) => handleChange("descricao_programa", e.target.value)}
              rows={3}
              className="text-base resize-none"
            />
          )}

          <div className="space-y-3 border-t pt-4">
            <div>
              <Label className="text-sm font-medium">
                Rede socioassistencial e intersetorial
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione os registros e serviços em que o jovem está inserido
                (CMAS, CMDCA, CRAS, CREAS, etc.)
              </p>
            </div>
            {loadingRegistros ? (
              <p className="text-sm text-muted-foreground">
                Carregando registros sociais...
              </p>
            ) : registrosSociais.length > 0 ? (
              <div className="space-y-3 rounded-md border p-4">
                {registrosSociais.map((registro) => (
                  <div key={registro.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`cadastro-registro-${registro.id}`}
                      checked={formData.registros_sociais_ids.includes(registro.id)}
                      onCheckedChange={() => toggleRegistroSocial(registro.id)}
                    />
                    <Label
                      htmlFor={`cadastro-registro-${registro.id}`}
                      className="cursor-pointer text-sm font-normal leading-5"
                    >
                      {registro.sigla ? `${registro.sigla} - ` : ""}
                      {registro.nome}
                      {registro.descricao && (
                        <span className="ml-1 text-muted-foreground">
                          ({registro.descricao})
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum registro social disponível.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Textarea
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            rows={4}
            placeholder="Outras observações relevantes..."
            className="text-base resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
