-- =====================================================
-- Agenda: modalidade, local/link e modelo de agendamento
-- =====================================================

ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS modalidade TEXT,
  ADD COLUMN IF NOT EXISTS local_atendimento TEXT,
  ADD COLUMN IF NOT EXISTS link_atendimento TEXT,
  ADD COLUMN IF NOT EXISTS modelo_agendamento TEXT;

UPDATE public.atendimentos_agendados
SET modalidade = COALESCE(modalidade, 'presencial')
WHERE modalidade IS NULL;

UPDATE public.atendimentos_agendados
SET local_atendimento = COALESCE(NULLIF(local_atendimento, ''), 'A definir')
WHERE modalidade = 'presencial';

ALTER TABLE public.atendimentos_agendados
  ALTER COLUMN modalidade SET NOT NULL;

ALTER TABLE public.atendimentos_agendados
  DROP CONSTRAINT IF EXISTS atendimentos_agendados_modalidade_check;

ALTER TABLE public.atendimentos_agendados
  ADD CONSTRAINT atendimentos_agendados_modalidade_check
  CHECK (modalidade = ANY (ARRAY['presencial', 'remoto']));

ALTER TABLE public.atendimentos_agendados
  DROP CONSTRAINT IF EXISTS atendimentos_agendados_modalidade_dados_check;

ALTER TABLE public.atendimentos_agendados
  ADD CONSTRAINT atendimentos_agendados_modalidade_dados_check
  CHECK (
    (modalidade = 'presencial' AND COALESCE(local_atendimento, '') <> '')
    OR
    (modalidade = 'remoto' AND COALESCE(link_atendimento, '') <> '')
  );

CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_modalidade
  ON public.atendimentos_agendados(modalidade);
