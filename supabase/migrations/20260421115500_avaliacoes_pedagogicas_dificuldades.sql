-- =====================================================
-- Avaliacao Pedagogica: dificuldades em palavras-chave
-- =====================================================

ALTER TABLE public.avaliacoes_pedagogicas
  ADD COLUMN IF NOT EXISTS dificuldades TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.avaliacoes_pedagogicas.dificuldades IS
  'Lista de dificuldades observadas na avaliacao pedagogica em formato de palavras-chave.';
