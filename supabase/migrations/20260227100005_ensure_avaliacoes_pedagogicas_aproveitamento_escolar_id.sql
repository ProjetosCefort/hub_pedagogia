-- Garante que a tabela avaliacoes_pedagogicas tem a coluna aproveitamento_escolar_id
-- (caso 20260213000001_add_aproveitamento_escolar_to_avaliacoes não tenha sido aplicada ou tenha falhado).

ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS aproveitamento_escolar_id UUID REFERENCES public.config_aproveitamento_escolar(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_aproveitamento_escolar_id
  ON public.avaliacoes_pedagogicas(aproveitamento_escolar_id)
  WHERE aproveitamento_escolar_id IS NOT NULL;

COMMENT ON COLUMN public.avaliacoes_pedagogicas.aproveitamento_escolar_id IS
  'Classificação educacional (aproveitamento escolar) configurável. Referência a config_aproveitamento_escolar.';

-- Função e trigger de validação (aproveitamento ativo e obrigatório)
CREATE OR REPLACE FUNCTION public.validate_aproveitamento_escolar_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.aproveitamento_escolar_id IS NULL THEN
    RAISE EXCEPTION 'A classificação educacional (aproveitamento escolar) é obrigatória';
  END IF;
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

DROP TRIGGER IF EXISTS trg_validate_aproveitamento_escolar_active ON public.avaliacoes_pedagogicas;
CREATE TRIGGER trg_validate_aproveitamento_escolar_active
  BEFORE INSERT OR UPDATE ON public.avaliacoes_pedagogicas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_aproveitamento_escolar_active();

COMMENT ON FUNCTION public.validate_aproveitamento_escolar_active() IS
  'Valida que aproveitamento_escolar_id referenciado está ativo antes de permitir INSERT/UPDATE.';
