-- =====================================================
-- ADICIONA CLASSIFICAÇÃO EDUCACIONAL (APROVEITAMENTO ESCOLAR)
-- ÀS AVALIAÇÕES PEDAGÓGICAS
-- =====================================================

-- Adiciona coluna aproveitamento_escolar_id com FK
ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS aproveitamento_escolar_id UUID REFERENCES public.config_aproveitamento_escolar(id) ON DELETE SET NULL;

-- Cria índice para melhor performance em queries
CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_aproveitamento_escolar_id
  ON public.avaliacoes_pedagogicas(aproveitamento_escolar_id)
  WHERE aproveitamento_escolar_id IS NOT NULL;

-- Comentário na coluna
COMMENT ON COLUMN public.avaliacoes_pedagogicas.aproveitamento_escolar_id IS
  'Classificação educacional (aproveitamento escolar) configurável. Referência a config_aproveitamento_escolar.';

-- Função para validar que aproveitamento_escolar_id está ativo e é obrigatório
CREATE OR REPLACE FUNCTION public.validate_aproveitamento_escolar_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validação: aproveitamento_escolar_id é obrigatório para novos registros
  IF NEW.aproveitamento_escolar_id IS NULL THEN
    RAISE EXCEPTION 'A classificação educacional (aproveitamento escolar) é obrigatória';
  END IF;
  
  -- Se aproveitamento_escolar_id foi fornecido, verifica se está ativo
  IF NOT EXISTS (
    SELECT 1
    FROM public.config_aproveitamento_escolar
    WHERE id = NEW.aproveitamento_escolar_id
      AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Aproveitamento escolar selecionado não está ativo ou não existe';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar aproveitamento ativo antes de INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_validate_aproveitamento_escolar_active ON public.avaliacoes_pedagogicas;
CREATE TRIGGER trg_validate_aproveitamento_escolar_active
  BEFORE INSERT OR UPDATE ON public.avaliacoes_pedagogicas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_aproveitamento_escolar_active();

-- Comentário na função
COMMENT ON FUNCTION public.validate_aproveitamento_escolar_active() IS
  'Valida que aproveitamento_escolar_id referenciado está ativo antes de permitir INSERT/UPDATE.';
