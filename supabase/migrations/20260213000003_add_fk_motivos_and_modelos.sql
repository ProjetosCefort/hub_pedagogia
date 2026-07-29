-- =====================================================
-- REFATORAÇÃO: ADICIONA FOREIGN KEYS PARA MOTIVOS E MODELOS
-- Mantém compatibilidade com dados existentes (texto + FK)
-- =====================================================

-- ---------------------------------------------------------------------------
-- 1. INTERVENÇÕES: Adiciona motivo_intervencao_id
-- ---------------------------------------------------------------------------

-- Adiciona coluna motivo_intervencao_id (FK opcional para compatibilidade)
ALTER TABLE public.intervencoes
  ADD COLUMN IF NOT EXISTS motivo_intervencao_id UUID REFERENCES public.config_motivos_intervencao(id) ON DELETE SET NULL;

-- Adiciona coluna motivo_intervencao (texto) se não existir (para compatibilidade)
-- Nota: descricao_demanda já existe, mas motivo_intervencao pode ser útil para relatórios
ALTER TABLE public.intervencoes
  ADD COLUMN IF NOT EXISTS motivo_intervencao TEXT;

-- Índice para melhor performance em queries e relatórios
CREATE INDEX IF NOT EXISTS idx_intervencoes_motivo_intervencao_id
  ON public.intervencoes(motivo_intervencao_id)
  WHERE motivo_intervencao_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN public.intervencoes.motivo_intervencao_id IS
  'FK para motivo de intervenção configurável. Mantido junto com motivo_intervencao (texto) para compatibilidade.';

COMMENT ON COLUMN public.intervencoes.motivo_intervencao IS
  'Texto do motivo (mantido para compatibilidade com dados antigos e detalhamento livre).';

-- ---------------------------------------------------------------------------
-- 2. AVALIAÇÕES PEDAGÓGICAS: Adiciona motivo_intervencao_id
-- ---------------------------------------------------------------------------

-- Adiciona coluna motivo_intervencao_id (FK opcional)
ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS motivo_intervencao_id UUID REFERENCES public.config_motivos_intervencao(id) ON DELETE SET NULL;

-- Índice
CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_motivo_intervencao_id
  ON public.avaliacoes_pedagogicas(motivo_intervencao_id)
  WHERE motivo_intervencao_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN public.avaliacoes_pedagogicas.motivo_intervencao_id IS
  'FK para motivo de intervenção configurável. Mantido junto com motivo_intervencao (texto) para compatibilidade.';

-- ---------------------------------------------------------------------------
-- 3. ENCAMINHAMENTOS: Adiciona modelo_encaminhamento_id
-- ---------------------------------------------------------------------------

-- Adiciona coluna modelo_encaminhamento_id (FK opcional)
ALTER TABLE public.encaminhamentos
  ADD COLUMN IF NOT EXISTS modelo_encaminhamento_id UUID REFERENCES public.config_modelos_encaminhamento(id) ON DELETE SET NULL;

-- Índice
CREATE INDEX IF NOT EXISTS idx_encaminhamentos_modelo_encaminhamento_id
  ON public.encaminhamentos(modelo_encaminhamento_id)
  WHERE modelo_encaminhamento_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN public.encaminhamentos.modelo_encaminhamento_id IS
  'FK para modelo de encaminhamento usado. Permite rastrear qual template foi aplicado.';

-- ---------------------------------------------------------------------------
-- 4. TRIGGERS: Sincronização automática FK → Texto (opcional, para UX)
-- ---------------------------------------------------------------------------

-- Função para sincronizar motivo_intervencao (texto) quando motivo_intervencao_id é definido
CREATE OR REPLACE FUNCTION public.sync_motivo_intervencao_text()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se motivo_intervencao_id foi definido e motivo_intervencao está vazio/null, preenche com nome do motivo
  IF NEW.motivo_intervencao_id IS NOT NULL AND (NEW.motivo_intervencao IS NULL OR NEW.motivo_intervencao = '') THEN
    SELECT nome INTO NEW.motivo_intervencao
    FROM public.config_motivos_intervencao
    WHERE id = NEW.motivo_intervencao_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para intervencoes
DROP TRIGGER IF EXISTS trg_sync_motivo_intervencao_intervencoes ON public.intervencoes;
CREATE TRIGGER trg_sync_motivo_intervencao_intervencoes
  BEFORE INSERT OR UPDATE ON public.intervencoes
  FOR EACH ROW
  WHEN (NEW.motivo_intervencao_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_motivo_intervencao_text();

-- Trigger para avaliacoes_pedagogicas
DROP TRIGGER IF EXISTS trg_sync_motivo_intervencao_pedagogicas ON public.avaliacoes_pedagogicas;
CREATE TRIGGER trg_sync_motivo_intervencao_pedagogicas
  BEFORE INSERT OR UPDATE ON public.avaliacoes_pedagogicas
  FOR EACH ROW
  WHEN (NEW.motivo_intervencao_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_motivo_intervencao_text();

-- Função para validar que motivo está ativo (se fornecido)
CREATE OR REPLACE FUNCTION public.validate_motivo_intervencao_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se motivo_intervencao_id foi fornecido, verifica se está ativo
  IF NEW.motivo_intervencao_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.config_motivos_intervencao
      WHERE id = NEW.motivo_intervencao_id
        AND ativo = true
    ) THEN
      RAISE EXCEPTION 'Motivo de intervenção selecionado não está ativo ou não existe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers de validação
DROP TRIGGER IF EXISTS trg_validate_motivo_intervencoes ON public.intervencoes;
CREATE TRIGGER trg_validate_motivo_intervencoes
  BEFORE INSERT OR UPDATE ON public.intervencoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_motivo_intervencao_active();

DROP TRIGGER IF EXISTS trg_validate_motivo_pedagogicas ON public.avaliacoes_pedagogicas;
CREATE TRIGGER trg_validate_motivo_pedagogicas
  BEFORE INSERT OR UPDATE ON public.avaliacoes_pedagogicas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_motivo_intervencao_active();

-- Função para validar modelo de encaminhamento ativo
CREATE OR REPLACE FUNCTION public.validate_modelo_encaminhamento_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.modelo_encaminhamento_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.config_modelos_encaminhamento
      WHERE id = NEW.modelo_encaminhamento_id
        AND ativo = true
    ) THEN
      RAISE EXCEPTION 'Modelo de encaminhamento selecionado não está ativo ou não existe';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_modelo_encaminhamento ON public.encaminhamentos;
CREATE TRIGGER trg_validate_modelo_encaminhamento
  BEFORE INSERT OR UPDATE ON public.encaminhamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_modelo_encaminhamento_active();

-- Comentários nas funções
COMMENT ON FUNCTION public.sync_motivo_intervencao_text() IS
  'Sincroniza motivo_intervencao (texto) com nome do motivo quando motivo_intervencao_id é definido. Mantém compatibilidade.';

COMMENT ON FUNCTION public.validate_motivo_intervencao_active() IS
  'Valida que motivo_intervencao_id referenciado está ativo antes de permitir INSERT/UPDATE.';

COMMENT ON FUNCTION public.validate_modelo_encaminhamento_active() IS
  'Valida que modelo_encaminhamento_id referenciado está ativo antes de permitir INSERT/UPDATE.';
