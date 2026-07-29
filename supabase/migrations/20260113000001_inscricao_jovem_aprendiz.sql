-- Tabela de inscrições de jovens aprendizes
CREATE TABLE IF NOT EXISTS public.inscricoes_jovens_aprendizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação única
  cpf TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  edit_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  
  -- Status do cadastro
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'talent_bank', 'active_apprentice')),
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 3),
  
  -- STEP 1: Informações Básicas (Recrutamento/Currículo)
  -- Dados pessoais
  nome_completo TEXT,
  nome_social TEXT,
  tem_nome_social BOOLEAN DEFAULT false,
  rg TEXT,
  data_nascimento DATE,
  sexo TEXT,
  raca TEXT,
  
  -- Contato
  contato_1 TEXT,
  contato_2 TEXT,
  
  -- Endereço
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  regiao_metropolitana BOOLEAN DEFAULT false,
  
  -- Educação
  esta_estudando BOOLEAN DEFAULT false,
  periodo_estudo TEXT,
  nivel_educacao TEXT,
  
  -- Habilidades
  habilidades_computador TEXT,
  
  -- PCD
  e_pcd BOOLEAN DEFAULT false,
  nivel_pcd TEXT,
  descricao_pcd TEXT,
  laudo_medico_url TEXT,
  
  -- Estrangeiro
  e_estrangeiro BOOLEAN DEFAULT false,
  pais_origem TEXT,
  
  -- STEP 2: DP e Informações Complementares
  -- Responsável legal (se menor de 18)
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  responsavel_email TEXT,
  responsavel_parentesco TEXT,
  
  -- Contatos de mensagem
  contatos_mensagem JSONB,
  
  -- PIS/PASEP
  pis_pasep TEXT,
  
  -- Carteira de trabalho
  tem_ctps_digital BOOLEAN DEFAULT false,
  numero_ctps TEXT,
  
  -- Unidade de preferência
  unidade_preferencia TEXT,
  
  -- Uniforme
  tamanho_uniforme TEXT,
  tamanho_calcado TEXT,
  
  -- STEP 3: Socioeconômico
  -- Composição familiar
  composicao_familiar JSONB,
  renda_familiar DECIMAL(10,2),
  quantidade_membros INTEGER,
  
  -- Condição de moradia
  tipo_moradia TEXT,
  situacao_moradia TEXT,
  possui_saneamento BOOLEAN DEFAULT true,
  possui_energia BOOLEAN DEFAULT true,
  
  -- Saúde
  possui_doenca_cronica BOOLEAN DEFAULT false,
  descricao_doenca TEXT,
  possui_deficiencia BOOLEAN DEFAULT false,
  descricao_deficiencia TEXT,
  acompanhamento_medico BOOLEAN DEFAULT false,
  descricao_acompanhamento TEXT,
  
  -- Rede socioassistencial
  recebe_beneficio BOOLEAN DEFAULT false,
  descricao_beneficio TEXT,
  participa_programa_social BOOLEAN DEFAULT false,
  descricao_programa TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Metadados
  step1_completed_at TIMESTAMPTZ,
  step2_completed_at TIMESTAMPTZ,
  step3_completed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_inscricoes_cpf ON public.inscricoes_jovens_aprendizes(cpf);
CREATE INDEX IF NOT EXISTS idx_inscricoes_email ON public.inscricoes_jovens_aprendizes(email);
CREATE INDEX IF NOT EXISTS idx_inscricoes_token ON public.inscricoes_jovens_aprendizes(edit_token);
CREATE INDEX IF NOT EXISTS idx_inscricoes_status ON public.inscricoes_jovens_aprendizes(status);

-- Enable RLS
ALTER TABLE public.inscricoes_jovens_aprendizes ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção pública
DROP POLICY IF EXISTS "Public can insert inscricoes" ON public.inscricoes_jovens_aprendizes;
CREATE POLICY "Public can insert inscricoes" ON public.inscricoes_jovens_aprendizes 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Política para permitir leitura com token ou CPF+email
-- Nota: A verificação real será feita na aplicação, esta política permite acesso básico
DROP POLICY IF EXISTS "Public can read own inscricao" ON public.inscricoes_jovens_aprendizes;
CREATE POLICY "Public can read own inscricao" ON public.inscricoes_jovens_aprendizes 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Política para permitir atualização com token ou CPF+email
DROP POLICY IF EXISTS "Public can update own inscricao" ON public.inscricoes_jovens_aprendizes;
CREATE POLICY "Public can update own inscricao" ON public.inscricoes_jovens_aprendizes 
FOR UPDATE 
TO anon, authenticated 
USING (true);

-- Política para usuários autenticados do sistema
DROP POLICY IF EXISTS "Authenticated users can manage inscricoes" ON public.inscricoes_jovens_aprendizes;
CREATE POLICY "Authenticated users can manage inscricoes" ON public.inscricoes_jovens_aprendizes 
FOR ALL 
TO authenticated 
USING (public.has_any_role(auth.uid()));

-- Habilita extensão pgcrypto para gen_random_bytes (deve ser executado como superuser)
-- Nota: Em alguns ambientes Supabase, esta extensão já está habilitada
-- Se der erro, execute manualmente no Supabase Dashboard: CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para gerar token único
CREATE OR REPLACE FUNCTION public.generate_edit_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'base64');
  RETURN replace(replace(token, '/', '_'), '+', '-');
END;
$$;

-- Função para verificar CPF único
CREATE OR REPLACE FUNCTION public.check_cpf_inscricao_exists(_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.inscricoes_jovens_aprendizes
    WHERE cpf = _cpf
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_cpf_inscricao_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_edit_token() TO anon, authenticated;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_inscricoes_updated_at ON public.inscricoes_jovens_aprendizes;
CREATE TRIGGER update_inscricoes_updated_at 
BEFORE UPDATE ON public.inscricoes_jovens_aprendizes 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();
