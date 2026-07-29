ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS capacidade INTEGER,
  ADD COLUMN IF NOT EXISTS analista_responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.turmas.capacidade IS
  'Capacidade planejada da sala/turma para fins operacionais e pedagógicos.';

COMMENT ON COLUMN public.turmas.analista_responsavel_id IS
  'Analista pedagógico responsável pela turma/sala.';

CREATE INDEX IF NOT EXISTS idx_turmas_analista_responsavel_id
  ON public.turmas(analista_responsavel_id)
  WHERE analista_responsavel_id IS NOT NULL;
