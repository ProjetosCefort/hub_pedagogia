-- =====================================================
-- Avaliacao Pedagogica: turma e modelo
-- =====================================================

ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modelo_encaminhamento_id UUID REFERENCES public.config_modelos_encaminhamento(id) ON DELETE SET NULL;

ALTER TABLE public.avaliacoes_pedagogicas
  ALTER COLUMN jovem_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_turma_id
  ON public.avaliacoes_pedagogicas(turma_id);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_modelo_encaminhamento_id
  ON public.avaliacoes_pedagogicas(modelo_encaminhamento_id);

COMMENT ON COLUMN public.avaliacoes_pedagogicas.turma_id IS
  'Turma relacionada a avaliacao pedagogica quando avaliacao for coletiva.';

COMMENT ON COLUMN public.avaliacoes_pedagogicas.modelo_encaminhamento_id IS
  'Modelo aplicado para apoio ao preenchimento dos campos abertos.';
