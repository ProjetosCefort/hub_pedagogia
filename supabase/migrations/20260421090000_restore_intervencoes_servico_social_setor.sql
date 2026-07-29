-- Garante a separacao de atendimentos por setor para a timeline do prontuario.

ALTER TABLE public.config_motivos_intervencao
  ADD COLUMN IF NOT EXISTS setor TEXT;

UPDATE public.config_motivos_intervencao
SET setor = COALESCE(setor, 'psicossocial');

ALTER TABLE public.config_motivos_intervencao
  ALTER COLUMN setor SET NOT NULL,
  ALTER COLUMN setor SET DEFAULT 'psicossocial';

ALTER TABLE public.config_motivos_intervencao
  DROP CONSTRAINT IF EXISTS config_motivos_intervencao_setor_check;

ALTER TABLE public.config_motivos_intervencao
  ADD CONSTRAINT config_motivos_intervencao_setor_check
  CHECK (setor IN ('psicossocial', 'servico_social'));

CREATE INDEX IF NOT EXISTS idx_config_motivos_intervencao_setor_ativo_ordem
  ON public.config_motivos_intervencao(setor, ativo, ordem);

ALTER TABLE public.intervencoes
  ADD COLUMN IF NOT EXISTS setor TEXT;

UPDATE public.intervencoes i
SET setor = COALESCE(i.setor, cmi.setor, 'psicossocial')
FROM public.config_motivos_intervencao cmi
WHERE i.motivo_intervencao_id = cmi.id
  AND i.setor IS NULL;

UPDATE public.intervencoes
SET setor = COALESCE(setor, 'psicossocial');

ALTER TABLE public.intervencoes
  ALTER COLUMN setor SET NOT NULL,
  ALTER COLUMN setor SET DEFAULT 'psicossocial';

ALTER TABLE public.intervencoes
  DROP CONSTRAINT IF EXISTS intervencoes_setor_check;

ALTER TABLE public.intervencoes
  ADD CONSTRAINT intervencoes_setor_check
  CHECK (setor IN ('psicossocial', 'servico_social'));

CREATE INDEX IF NOT EXISTS idx_intervencoes_setor
  ON public.intervencoes(setor);

CREATE INDEX IF NOT EXISTS idx_intervencoes_setor_data
  ON public.intervencoes(setor, data_atendimento DESC);
