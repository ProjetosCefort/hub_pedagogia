-- Restaura campos da agenda usados pela aplicação
ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS setor TEXT;

ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS modalidade TEXT;

ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS local_atendimento TEXT;

ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS link_atendimento TEXT;

ALTER TABLE public.atendimentos_agendados
  ADD COLUMN IF NOT EXISTS modelo_agendamento TEXT;

UPDATE public.atendimentos_agendados
SET setor = CASE
  WHEN tipo IN ('avaliacao_socioeconomica', 'encaminhamento') THEN 'servico_social'
  ELSE 'psicossocial'
END
WHERE setor IS NULL;

UPDATE public.atendimentos_agendados
SET modalidade = 'presencial'
WHERE modalidade IS NULL;

ALTER TABLE public.atendimentos_agendados
  ALTER COLUMN setor SET DEFAULT 'psicossocial';

ALTER TABLE public.atendimentos_agendados
  ALTER COLUMN modalidade SET DEFAULT 'presencial';

ALTER TABLE public.atendimentos_agendados
  ALTER COLUMN setor SET NOT NULL;

ALTER TABLE public.atendimentos_agendados
  ALTER COLUMN modalidade SET NOT NULL;

ALTER TABLE public.atendimentos_agendados
  DROP CONSTRAINT IF EXISTS atendimentos_agendados_setor_check;

ALTER TABLE public.atendimentos_agendados
  ADD CONSTRAINT atendimentos_agendados_setor_check
  CHECK (setor IN ('psicossocial', 'servico_social'));

ALTER TABLE public.atendimentos_agendados
  DROP CONSTRAINT IF EXISTS atendimentos_agendados_modalidade_check;

ALTER TABLE public.atendimentos_agendados
  ADD CONSTRAINT atendimentos_agendados_modalidade_check
  CHECK (modalidade IN ('presencial', 'remoto'));
