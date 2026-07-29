-- Garante que a tabela avaliacoes_pedagogicas tem a coluna motivo_intervencao_id
-- (caso 20260213000003_add_fk_motivos_and_modelos não tenha sido aplicada ou tenha falhado).

ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS motivo_intervencao_id UUID REFERENCES public.config_motivos_intervencao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_motivo_intervencao_id
  ON public.avaliacoes_pedagogicas(motivo_intervencao_id)
  WHERE motivo_intervencao_id IS NOT NULL;

COMMENT ON COLUMN public.avaliacoes_pedagogicas.motivo_intervencao_id IS
  'FK para motivo de intervenção configurável. Mantido junto com motivo_intervencao (texto) para compatibilidade.';
