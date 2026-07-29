-- =====================================================
-- MÓDULO DE CONFIGURAÇÕES DO SISTEMA
-- Centraliza parâmetros institucionais configuráveis
-- =====================================================

-- 1. MOTIVOS DE INTERVENÇÃO
-- Usados em: Intervenções, Avaliações Pedagógicas
CREATE TABLE IF NOT EXISTS public.config_motivos_intervencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100), -- Futuro: categorização de motivos
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index para busca de motivos ativos
CREATE INDEX IF NOT EXISTS idx_config_motivos_intervencao_ativo 
ON public.config_motivos_intervencao(ativo) WHERE ativo = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_config_motivos_intervencao_updated
    BEFORE UPDATE ON public.config_motivos_intervencao
    FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

-- 2. TIPOS DE APROVEITAMENTO ESCOLAR
-- Usados em: Avaliações pedagógicas, acompanhamentos
CREATE TABLE IF NOT EXISTS public.config_aproveitamento_escolar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_config_aproveitamento_escolar_ativo 
ON public.config_aproveitamento_escolar(ativo) WHERE ativo = true;

CREATE TRIGGER tr_config_aproveitamento_escolar_updated
    BEFORE UPDATE ON public.config_aproveitamento_escolar
    FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

-- 3. TIPOS DE REGISTROS SOCIAIS
-- Usados em: Avaliações socioeconômicas, cadastros
CREATE TABLE IF NOT EXISTS public.config_registros_sociais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL, -- Ex: CMAS, CMDCA, CRAS, CREAS
    sigla VARCHAR(20),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_config_registros_sociais_ativo 
ON public.config_registros_sociais(ativo) WHERE ativo = true;

CREATE TRIGGER tr_config_registros_sociais_updated
    BEFORE UPDATE ON public.config_registros_sociais
    FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

-- 4. MODELOS DE ENCAMINHAMENTO
-- Usados em: Módulo de encaminhamentos
CREATE TABLE IF NOT EXISTS public.config_modelos_encaminhamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    instituicao_destino VARCHAR(255),
    area_destino VARCHAR(100), -- Ex: Psicologia, Saúde, Assistência Social
    corpo_template TEXT, -- Template do corpo do encaminhamento
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_config_modelos_encaminhamento_ativo 
ON public.config_modelos_encaminhamento(ativo) WHERE ativo = true;

CREATE TRIGGER tr_config_modelos_encaminhamento_updated
    BEFORE UPDATE ON public.config_modelos_encaminhamento
    FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

-- 5. PARÂMETROS GLOBAIS DO SISTEMA
-- Configurações gerais usadas em múltiplos módulos
CREATE TABLE IF NOT EXISTS public.config_parametros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave VARCHAR(100) UNIQUE NOT NULL, -- Identificador único do parâmetro
    valor TEXT, -- Valor do parâmetro (pode ser JSON para valores complexos)
    tipo VARCHAR(50) DEFAULT 'text', -- text, number, boolean, json, select
    categoria VARCHAR(100), -- Agrupamento de parâmetros
    nome_exibicao VARCHAR(255) NOT NULL, -- Nome amigável para exibição
    descricao TEXT, -- Explicação do impacto do parâmetro
    opcoes_select TEXT, -- JSON com opções para tipo 'select'
    editavel BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_config_parametros_categoria 
ON public.config_parametros(categoria);

CREATE INDEX IF NOT EXISTS idx_config_parametros_chave 
ON public.config_parametros(chave);

CREATE TRIGGER tr_config_parametros_updated
    BEFORE UPDATE ON public.config_parametros
    FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.config_motivos_intervencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_aproveitamento_escolar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_registros_sociais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_modelos_encaminhamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_parametros ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura (todos usuários autenticados podem ler)
CREATE POLICY "Authenticated users can read config_motivos_intervencao"
ON public.config_motivos_intervencao FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read config_aproveitamento_escolar"
ON public.config_aproveitamento_escolar FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read config_registros_sociais"
ON public.config_registros_sociais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read config_modelos_encaminhamento"
ON public.config_modelos_encaminhamento FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read config_parametros"
ON public.config_parametros FOR SELECT TO authenticated USING (true);

-- Políticas de escrita (preparado para controle de permissões futuro)
-- Por enquanto, todos autenticados podem editar. Futuramente, restringir a admins.
CREATE POLICY "Authenticated users can insert config_motivos_intervencao"
ON public.config_motivos_intervencao FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update config_motivos_intervencao"
ON public.config_motivos_intervencao FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert config_aproveitamento_escolar"
ON public.config_aproveitamento_escolar FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update config_aproveitamento_escolar"
ON public.config_aproveitamento_escolar FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert config_registros_sociais"
ON public.config_registros_sociais FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update config_registros_sociais"
ON public.config_registros_sociais FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert config_modelos_encaminhamento"
ON public.config_modelos_encaminhamento FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update config_modelos_encaminhamento"
ON public.config_modelos_encaminhamento FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert config_parametros"
ON public.config_parametros FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update config_parametros"
ON public.config_parametros FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Motivos de Intervenção padrão
INSERT INTO public.config_motivos_intervencao (nome, descricao, categoria, ordem) VALUES
    ('Atraso/Falta', 'Atrasos recorrentes ou faltas injustificadas', 'Frequência', 1),
    ('Comportamento inadequado', 'Comportamento inadequado em sala ou empresa', 'Comportamental', 2),
    ('Dificuldade de aprendizagem', 'Dificuldades no acompanhamento do conteúdo', 'Pedagógico', 3),
    ('Conflito interpessoal', 'Conflitos com colegas, instrutores ou supervisores', 'Relacional', 4),
    ('Questões pessoais/familiares', 'Situações pessoais ou familiares que afetam o desempenho', 'Pessoal', 5),
    ('Saúde/Bem-estar', 'Questões de saúde física ou mental', 'Saúde', 6),
    ('Desempenho na empresa', 'Questões relacionadas ao desempenho no ambiente de trabalho', 'Profissional', 7),
    ('Orientação profissional', 'Necessidade de orientação sobre carreira e futuro profissional', 'Orientação', 8),
    ('Solicitação do jovem', 'Atendimento solicitado pelo próprio jovem', 'Demanda espontânea', 9),
    ('Acompanhamento de rotina', 'Acompanhamento preventivo de rotina', 'Rotina', 10)
ON CONFLICT DO NOTHING;

-- Tipos de Aproveitamento Escolar padrão
INSERT INTO public.config_aproveitamento_escolar (nome, descricao, ordem) VALUES
    ('Excelente', 'Desempenho acima da média esperada', 1),
    ('Bom', 'Desempenho satisfatório, dentro do esperado', 2),
    ('Regular', 'Desempenho mediano, com pontos de melhoria', 3),
    ('Insuficiente', 'Desempenho abaixo do esperado, necessita intervenção', 4),
    ('Não avaliado', 'Ainda não foi possível avaliar o desempenho', 5)
ON CONFLICT DO NOTHING;

-- Tipos de Registros Sociais padrão
INSERT INTO public.config_registros_sociais (nome, sigla, descricao, ordem) VALUES
    ('Conselho Municipal de Assistência Social', 'CMAS', 'Órgão de controle social da política de assistência social', 1),
    ('Conselho Municipal dos Direitos da Criança e do Adolescente', 'CMDCA', 'Órgão de formulação, deliberação e controle das políticas públicas para crianças e adolescentes', 2),
    ('Centro de Referência de Assistência Social', 'CRAS', 'Unidade pública de assistência social para famílias em situação de vulnerabilidade', 3),
    ('Centro de Referência Especializado de Assistência Social', 'CREAS', 'Unidade pública para atendimento especializado a famílias e indivíduos em situação de risco', 4),
    ('Conselho Tutelar', 'CT', 'Órgão permanente e autônomo de proteção dos direitos da criança e do adolescente', 5),
    ('Cadastro Único para Programas Sociais', 'CadÚnico', 'Instrumento de identificação e caracterização socioeconômica das famílias brasileiras', 6),
    ('Programa Bolsa Família', 'PBF', 'Programa de transferência de renda do Governo Federal', 7),
    ('Benefício de Prestação Continuada', 'BPC', 'Benefício assistencial para idosos e pessoas com deficiência', 8)
ON CONFLICT DO NOTHING;

-- Modelos de Encaminhamento padrão
INSERT INTO public.config_modelos_encaminhamento (nome, instituicao_destino, area_destino, corpo_template, ordem) VALUES
    ('Encaminhamento para CAPS', 'Centro de Atenção Psicossocial', 'Saúde Mental', 
     'Encaminhamos o(a) jovem para avaliação e acompanhamento psicológico/psiquiátrico, conforme necessidade identificada durante acompanhamento pedagógico.

Motivo do encaminhamento:
[DESCREVER MOTIVO]

Observações relevantes:
[OBSERVAÇÕES]', 1),
    
    ('Encaminhamento para UBS', 'Unidade Básica de Saúde', 'Saúde', 
     'Encaminhamos o(a) jovem para atendimento de saúde, conforme demanda identificada.

Motivo do encaminhamento:
[DESCREVER MOTIVO]

Queixas/Sintomas relatados:
[DESCREVER]', 2),
    
    ('Encaminhamento para CRAS', 'Centro de Referência de Assistência Social', 'Assistência Social', 
     'Encaminhamos o(a) jovem e/ou família para acompanhamento socioassistencial.

Situação identificada:
[DESCREVER SITUAÇÃO]

Demandas identificadas:
[LISTAR DEMANDAS]', 3),
    
    ('Encaminhamento para Conselho Tutelar', 'Conselho Tutelar', 'Proteção', 
     'Encaminhamos comunicação sobre situação identificada durante acompanhamento do(a) jovem.

Situação:
[DESCREVER SITUAÇÃO]

Providências já tomadas pela instituição:
[DESCREVER]', 4),
    
    ('Encaminhamento para Psicologia', 'Serviço de Psicologia', 'Psicologia', 
     'Encaminhamos o(a) jovem para atendimento psicológico.

Demanda identificada:
[DESCREVER]

Observações do acompanhamento:
[OBSERVAÇÕES]', 5)
ON CONFLICT DO NOTHING;

-- Parâmetros Globais do Sistema
INSERT INTO public.config_parametros (chave, valor, tipo, categoria, nome_exibicao, descricao) VALUES
    ('instituicao_nome', 'CEFORT', 'text', 'Instituição', 'Nome da Instituição', 'Nome oficial da instituição exibido em relatórios e documentos'),
    ('instituicao_nome_completo', 'Centro de Formação do Trabalhador', 'text', 'Instituição', 'Nome Completo', 'Nome completo da instituição'),
    ('instituicao_cnpj', '', 'text', 'Instituição', 'CNPJ', 'CNPJ da instituição'),
    ('instituicao_endereco', '', 'text', 'Instituição', 'Endereço', 'Endereço completo da sede'),
    ('instituicao_telefone', '', 'text', 'Instituição', 'Telefone', 'Telefone principal de contato'),
    ('instituicao_email', '', 'text', 'Instituição', 'E-mail', 'E-mail institucional principal'),
    
    ('jovem_idade_minima', '14', 'number', 'Jovem Aprendiz', 'Idade Mínima', 'Idade mínima para inscrição no programa'),
    ('jovem_idade_maxima', '24', 'number', 'Jovem Aprendiz', 'Idade Máxima', 'Idade máxima para inscrição no programa'),
    ('jovem_status_padrao', 'ativo', 'select', 'Jovem Aprendiz', 'Status Padrão', 'Status inicial do jovem ao ser cadastrado'),
    
    ('atendimento_prazo_retorno', '7', 'number', 'Atendimentos', 'Prazo de Retorno (dias)', 'Prazo padrão em dias para retorno de atendimento'),
    ('atendimento_tipos_intervencao', 'Individual,Grupal,Familiar', 'text', 'Atendimentos', 'Tipos de Intervenção', 'Tipos de intervenção disponíveis (separados por vírgula)'),
    
    ('sistema_versao', '1.0.0', 'text', 'Sistema', 'Versão', 'Versão atual do sistema'),
    ('sistema_ambiente', 'producao', 'select', 'Sistema', 'Ambiente', 'Ambiente de execução do sistema')
ON CONFLICT (chave) DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE public.config_motivos_intervencao IS 'Motivos de intervenção configuráveis para uso em atendimentos';
COMMENT ON TABLE public.config_aproveitamento_escolar IS 'Tipos de aproveitamento escolar/educacional para avaliações';
COMMENT ON TABLE public.config_registros_sociais IS 'Tipos de registros sociais institucionais';
COMMENT ON TABLE public.config_modelos_encaminhamento IS 'Templates de encaminhamento para reutilização';
COMMENT ON TABLE public.config_parametros IS 'Parâmetros globais do sistema';
