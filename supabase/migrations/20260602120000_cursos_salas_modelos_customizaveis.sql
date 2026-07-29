-- Cursos por unidade/GOV, salas ativas e personalizacao de modelos de documentos.

CREATE TABLE IF NOT EXISTS public.curso_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  gov_validacao_id UUID REFERENCES public.gov_validacoes(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (curso_id, unidade_id)
);

CREATE INDEX IF NOT EXISTS idx_curso_unidades_curso_id
  ON public.curso_unidades(curso_id);

CREATE INDEX IF NOT EXISTS idx_curso_unidades_unidade_id
  ON public.curso_unidades(unidade_id);

CREATE INDEX IF NOT EXISTS idx_curso_unidades_gov_validacao_id
  ON public.curso_unidades(gov_validacao_id)
  WHERE gov_validacao_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_curso_unidade_gov()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.gov_validacao_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.gov_validacoes gv
    WHERE gv.id = NEW.gov_validacao_id
      AND gv.unidade_id = NEW.unidade_id
      AND gv.status = 'aprovado'
  ) THEN
    RAISE EXCEPTION
      'A validacao GOV deve estar aprovada e pertencer a mesma unidade do curso.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_curso_unidade_gov ON public.curso_unidades;
CREATE TRIGGER trg_validate_curso_unidade_gov
  BEFORE INSERT OR UPDATE ON public.curso_unidades
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_curso_unidade_gov();

DROP TRIGGER IF EXISTS update_curso_unidades_updated_at ON public.curso_unidades;
CREATE TRIGGER update_curso_unidades_updated_at
  BEFORE UPDATE ON public.curso_unidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.curso_unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can view curso_unidades" ON public.curso_unidades;
CREATE POLICY "Users with role can view curso_unidades"
  ON public.curso_unidades
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage curso_unidades" ON public.curso_unidades;
CREATE POLICY "Admins can manage curso_unidades"
  ON public.curso_unidades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.curso_unidades TO authenticated;

INSERT INTO public.curso_unidades (
  curso_id,
  unidade_id,
  gov_validacao_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.unidade_id,
  CASE
    WHEN gv.id IS NOT NULL
      AND gv.unidade_id = c.unidade_id
      AND gv.status = 'aprovado'
    THEN gv.id
    ELSE NULL
  END,
  c.created_by,
  COALESCE(c.created_at, now()),
  COALESCE(c.updated_at, c.created_at, now())
FROM public.cursos c
LEFT JOIN public.gov_validacoes gv ON gv.id = c.gov_validacao_id
WHERE c.unidade_id IS NOT NULL
ON CONFLICT (curso_id, unidade_id) DO UPDATE
SET gov_validacao_id = EXCLUDED.gov_validacao_id,
    updated_at = now();

ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

UPDATE public.turmas
SET ativo = false
WHERE data_fim IS NOT NULL
  AND data_fim < CURRENT_DATE;

ALTER TABLE public.config_modelos_documentos
  ADD COLUMN IF NOT EXISTS fonte_familia TEXT NOT NULL DEFAULT 'Arial',
  ADD COLUMN IF NOT EXISTS fonte_tamanho INTEGER NOT NULL DEFAULT 14 CHECK (fonte_tamanho BETWEEN 8 AND 72),
  ADD COLUMN IF NOT EXISTS negrito BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alinhamento TEXT NOT NULL DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS imagem_url TEXT,
  ADD COLUMN IF NOT EXISTS imagem_posicao TEXT NOT NULL DEFAULT 'top';

ALTER TABLE public.config_modelos_documentos
  DROP CONSTRAINT IF EXISTS config_modelos_documentos_alinhamento_check;

ALTER TABLE public.config_modelos_documentos
  ADD CONSTRAINT config_modelos_documentos_alinhamento_check
  CHECK (alinhamento = ANY (ARRAY['left', 'center', 'right', 'justify']));

ALTER TABLE public.config_modelos_documentos
  DROP CONSTRAINT IF EXISTS config_modelos_documentos_imagem_posicao_check;

ALTER TABLE public.config_modelos_documentos
  ADD CONSTRAINT config_modelos_documentos_imagem_posicao_check
  CHECK (imagem_posicao = ANY (ARRAY['top', 'bottom']));
