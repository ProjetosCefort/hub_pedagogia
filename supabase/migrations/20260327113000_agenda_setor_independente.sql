-- =====================================================
-- Agenda por setor (Psicossocial e Servico Social)
-- =====================================================

ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS setor TEXT;

UPDATE public.atendimentos_agendados
SET setor = CASE
  WHEN tipo IN ('avaliacao_socioeconomica', 'encaminhamento') THEN 'servico_social'
  ELSE 'psicossocial'
END
WHERE setor IS NULL;

ALTER TABLE public.atendimentos_agendados
  ALTER COLUMN setor SET NOT NULL;

ALTER TABLE public.atendimentos_agendados
  DROP CONSTRAINT IF EXISTS atendimentos_agendados_setor_check;

ALTER TABLE public.atendimentos_agendados
  ADD CONSTRAINT atendimentos_agendados_setor_check
  CHECK (setor = ANY (ARRAY['psicossocial', 'servico_social']));

CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_setor
  ON public.atendimentos_agendados(setor);

CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_setor_data
  ON public.atendimentos_agendados(setor, agendado_para DESC);
