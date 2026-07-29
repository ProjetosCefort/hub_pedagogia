-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'analista_pedagogico', 'analista_social', 'analista_psicossocial', 'gestor');

-- Enum para status do jovem
CREATE TYPE public.jovem_status AS ENUM ('ativo', 'inativo', 'desligado', 'formado');

-- Enum para tipo de atendimento
CREATE TYPE public.tipo_atendimento AS ENUM ('intervencao', 'avaliacao_pedagogica', 'avaliacao_socioeconomica', 'encaminhamento');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  cargo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de unidades
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de empresas parceiras
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de turmas
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  unidade_id UUID REFERENCES public.unidades(id),
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela principal de jovens
CREATE TABLE public.jovens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados pessoais
  nome_completo TEXT NOT NULL,
  data_nascimento DATE,
  cpf TEXT UNIQUE,
  rg TEXT,
  sexo TEXT,
  estado_civil TEXT,
  nacionalidade TEXT,
  naturalidade TEXT,
  
  -- Contato
  email TEXT,
  telefone TEXT,
  celular TEXT,
  
  -- Endereço
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Dados institucionais
  matricula TEXT UNIQUE,
  data_admissao DATE,
  data_desligamento DATE,
  status jovem_status NOT NULL DEFAULT 'ativo',
  
  -- Vínculos
  empresa_id UUID REFERENCES public.empresas(id),
  turma_id UUID REFERENCES public.turmas(id),
  unidade_id UUID REFERENCES public.unidades(id),
  
  -- Dados sociais
  nome_mae TEXT,
  nome_pai TEXT,
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  responsavel_parentesco TEXT,
  
  -- Observações
  observacoes TEXT,
  foto_url TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de intervenções
CREATE TABLE public.intervencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  
  data_atendimento TIMESTAMPTZ NOT NULL,
  tipo tipo_atendimento NOT NULL DEFAULT 'intervencao',
  
  descricao_demanda TEXT NOT NULL,
  relato_jovem TEXT,
  percepcao_profissional TEXT,
  plano_acao TEXT,
  conclusao TEXT,
  
  responsavel_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de avaliações pedagógicas
CREATE TABLE public.avaliacoes_pedagogicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  
  data_avaliacao TIMESTAMPTZ NOT NULL,
  motivo_intervencao TEXT NOT NULL,
  descricao_conducao TEXT,
  estrategias_resolucao TEXT,
  manifestacao_jovem TEXT,
  assinatura_profissional TEXT,
  assinatura_jovem TEXT,
  
  responsavel_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de avaliações socioeconômicas
CREATE TABLE public.avaliacoes_socioeconomicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  
  data_avaliacao TIMESTAMPTZ NOT NULL,
  
  -- Condição de saúde
  possui_doenca_cronica BOOLEAN DEFAULT false,
  descricao_doenca TEXT,
  possui_deficiencia BOOLEAN DEFAULT false,
  descricao_deficiencia TEXT,
  acompanhamento_medico BOOLEAN DEFAULT false,
  descricao_acompanhamento TEXT,
  
  -- Composição familiar
  composicao_familiar JSONB,
  renda_familiar DECIMAL(10,2),
  quantidade_membros INTEGER,
  
  -- Condição de moradia
  tipo_moradia TEXT,
  situacao_moradia TEXT,
  possui_saneamento BOOLEAN DEFAULT true,
  possui_energia BOOLEAN DEFAULT true,
  
  -- Rede socioassistencial
  recebe_beneficio BOOLEAN DEFAULT false,
  descricao_beneficio TEXT,
  participa_programa_social BOOLEAN DEFAULT false,
  descricao_programa TEXT,
  
  observacoes TEXT,
  
  responsavel_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de encaminhamentos
CREATE TABLE public.encaminhamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  
  data_encaminhamento TIMESTAMPTZ NOT NULL,
  destino TEXT NOT NULL,
  instituicao TEXT NOT NULL,
  profissional_destino TEXT,
  descricao TEXT,
  
  responsavel_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jovens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_pedagogicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_socioeconomicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encaminhamentos ENABLE ROW LEVEL SECURITY;

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se tem qualquer role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para user_roles (apenas admin pode gerenciar)
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Políticas RLS para unidades, empresas, turmas (leitura para autenticados, escrita para admin)
CREATE POLICY "Authenticated users can view unidades" ON public.unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage unidades" ON public.unidades FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view empresas" ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage empresas" ON public.empresas FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view turmas" ON public.turmas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage turmas" ON public.turmas FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para jovens (acesso para usuários com qualquer role)
CREATE POLICY "Users with role can view jovens" ON public.jovens FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can insert jovens" ON public.jovens FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can update jovens" ON public.jovens FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));

-- Políticas RLS para intervenções
CREATE POLICY "Users with role can view intervencoes" ON public.intervencoes FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can insert intervencoes" ON public.intervencoes FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can update intervencoes" ON public.intervencoes FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));

-- Políticas RLS para avaliações pedagógicas
CREATE POLICY "Users with role can view avaliacoes_pedagogicas" ON public.avaliacoes_pedagogicas FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can insert avaliacoes_pedagogicas" ON public.avaliacoes_pedagogicas FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can update avaliacoes_pedagogicas" ON public.avaliacoes_pedagogicas FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));

-- Políticas RLS para avaliações socioeconômicas
CREATE POLICY "Users with role can view avaliacoes_socioeconomicas" ON public.avaliacoes_socioeconomicas FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can insert avaliacoes_socioeconomicas" ON public.avaliacoes_socioeconomicas FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can update avaliacoes_socioeconomicas" ON public.avaliacoes_socioeconomicas FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));

-- Políticas RLS para encaminhamentos
CREATE POLICY "Users with role can view encaminhamentos" ON public.encaminhamentos FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Users with role can insert encaminhamentos" ON public.encaminhamentos FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jovens_updated_at BEFORE UPDATE ON public.jovens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_intervencoes_updated_at BEFORE UPDATE ON public.intervencoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_avaliacoes_pedagogicas_updated_at BEFORE UPDATE ON public.avaliacoes_pedagogicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_avaliacoes_socioeconomicas_updated_at BEFORE UPDATE ON public.avaliacoes_socioeconomicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();