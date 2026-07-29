-- Restore support for collective pedagogical evaluation by class (turma)
-- and keep compatibility with environments where columns were dropped by schema snapshot.

ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS turma_id UUID;

ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS modelo_encaminhamento_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'avaliacoes_pedagogicas_turma_id_fkey'
      AND conrelid = 'public.avaliacoes_pedagogicas'::regclass
  ) THEN
    ALTER TABLE public.avaliacoes_pedagogicas
      ADD CONSTRAINT avaliacoes_pedagogicas_turma_id_fkey
      FOREIGN KEY (turma_id)
      REFERENCES public.turmas(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'avaliacoes_pedagogicas_modelo_encaminhamento_id_fkey'
      AND conrelid = 'public.avaliacoes_pedagogicas'::regclass
  ) THEN
    ALTER TABLE public.avaliacoes_pedagogicas
      ADD CONSTRAINT avaliacoes_pedagogicas_modelo_encaminhamento_id_fkey
      FOREIGN KEY (modelo_encaminhamento_id)
      REFERENCES public.config_modelos_encaminhamento(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_turma_id
  ON public.avaliacoes_pedagogicas(turma_id)
  WHERE turma_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_modelo_encaminhamento_id
  ON public.avaliacoes_pedagogicas(modelo_encaminhamento_id)
  WHERE modelo_encaminhamento_id IS NOT NULL;

ALTER TABLE public.avaliacoes_pedagogicas
  ALTER COLUMN jovem_id DROP NOT NULL;

COMMENT ON COLUMN public.avaliacoes_pedagogicas.turma_id IS
  'Turma avaliada quando a avaliação for coletiva';

COMMENT ON COLUMN public.avaliacoes_pedagogicas.modelo_encaminhamento_id IS
  'Modelo aplicado no preenchimento da avaliação pedagógica';
