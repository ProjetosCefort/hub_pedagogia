-- Garante que a tabela intervencoes tem as colunas motivo_intervencao e motivo_intervencao_id
-- (caso 20260213000003_add_fk_motivos_and_modelos não tenha sido aplicada ou tenha falhado).

-- motivo_intervencao (texto) — a que está faltando no schema cache e causando PGRST204
ALTER TABLE public.intervencoes
  ADD COLUMN IF NOT EXISTS motivo_intervencao TEXT;

-- motivo_intervencao_id (FK opcional)
ALTER TABLE public.intervencoes
  ADD COLUMN IF NOT EXISTS motivo_intervencao_id UUID REFERENCES public.config_motivos_intervencao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intervencoes_motivo_intervencao_id
  ON public.intervencoes(motivo_intervencao_id)
  WHERE motivo_intervencao_id IS NOT NULL;

COMMENT ON COLUMN public.intervencoes.motivo_intervencao IS
  'Texto do motivo (mantido para compatibilidade com dados antigos e detalhamento livre).';
