-- =============================================
-- Avaliacoes praticas - ficha estruturada enviada pelo cliente
-- =============================================

ALTER TABLE public.avaliacoes_praticas
  ADD COLUMN IF NOT EXISTS resumo_atividades TEXT,
  ADD COLUMN IF NOT EXISTS manteve_turno_contrato BOOLEAN,
  ADD COLUMN IF NOT EXISTS justificativa_turno TEXT,
  ADD COLUMN IF NOT EXISTS competencia_comunicacao TEXT,
  ADD COLUMN IF NOT EXISTS competencia_trabalho_equipe TEXT,
  ADD COLUMN IF NOT EXISTS competencia_proatividade TEXT,
  ADD COLUMN IF NOT EXISTS competencia_responsabilidade TEXT,
  ADD COLUMN IF NOT EXISTS competencia_assiduidade TEXT,
  ADD COLUMN IF NOT EXISTS pontos_fortes TEXT,
  ADD COLUMN IF NOT EXISTS pontos_melhoria TEXT,
  ADD COLUMN IF NOT EXISTS feedback_fornecido BOOLEAN,
  ADD COLUMN IF NOT EXISTS quantidade_feedbacks INTEGER,
  ADD COLUMN IF NOT EXISTS medidas_disciplinares BOOLEAN,
  ADD COLUMN IF NOT EXISTS quantidade_medidas_disciplinares INTEGER,
  ADD COLUMN IF NOT EXISTS motivos_medidas_disciplinares TEXT;

ALTER TABLE public.avaliacoes_praticas
  DROP CONSTRAINT IF EXISTS avaliacoes_praticas_competencia_comunicacao_check;
ALTER TABLE public.avaliacoes_praticas
  ADD CONSTRAINT avaliacoes_praticas_competencia_comunicacao_check
  CHECK (
    competencia_comunicacao IS NULL
    OR competencia_comunicacao = ANY (ARRAY['excelente', 'bom', 'regular', 'insuficiente'])
  );

ALTER TABLE public.avaliacoes_praticas
  DROP CONSTRAINT IF EXISTS avaliacoes_praticas_competencia_trabalho_equipe_check;
ALTER TABLE public.avaliacoes_praticas
  ADD CONSTRAINT avaliacoes_praticas_competencia_trabalho_equipe_check
  CHECK (
    competencia_trabalho_equipe IS NULL
    OR competencia_trabalho_equipe = ANY (ARRAY['excelente', 'bom', 'regular', 'insuficiente'])
  );

ALTER TABLE public.avaliacoes_praticas
  DROP CONSTRAINT IF EXISTS avaliacoes_praticas_competencia_proatividade_check;
ALTER TABLE public.avaliacoes_praticas
  ADD CONSTRAINT avaliacoes_praticas_competencia_proatividade_check
  CHECK (
    competencia_proatividade IS NULL
    OR competencia_proatividade = ANY (ARRAY['excelente', 'bom', 'regular', 'insuficiente'])
  );

ALTER TABLE public.avaliacoes_praticas
  DROP CONSTRAINT IF EXISTS avaliacoes_praticas_competencia_responsabilidade_check;
ALTER TABLE public.avaliacoes_praticas
  ADD CONSTRAINT avaliacoes_praticas_competencia_responsabilidade_check
  CHECK (
    competencia_responsabilidade IS NULL
    OR competencia_responsabilidade = ANY (ARRAY['excelente', 'bom', 'regular', 'insuficiente'])
  );

ALTER TABLE public.avaliacoes_praticas
  DROP CONSTRAINT IF EXISTS avaliacoes_praticas_competencia_assiduidade_check;
ALTER TABLE public.avaliacoes_praticas
  ADD CONSTRAINT avaliacoes_praticas_competencia_assiduidade_check
  CHECK (
    competencia_assiduidade IS NULL
    OR competencia_assiduidade = ANY (ARRAY['excelente', 'bom', 'regular', 'insuficiente'])
  );

ALTER TABLE public.avaliacoes_praticas
  DROP CONSTRAINT IF EXISTS avaliacoes_praticas_quantidade_feedbacks_check;
ALTER TABLE public.avaliacoes_praticas
  ADD CONSTRAINT avaliacoes_praticas_quantidade_feedbacks_check
  CHECK (quantidade_feedbacks IS NULL OR quantidade_feedbacks >= 0);

ALTER TABLE public.avaliacoes_praticas
  DROP CONSTRAINT IF EXISTS avaliacoes_praticas_quantidade_medidas_disciplinares_check;
ALTER TABLE public.avaliacoes_praticas
  ADD CONSTRAINT avaliacoes_praticas_quantidade_medidas_disciplinares_check
  CHECK (quantidade_medidas_disciplinares IS NULL OR quantidade_medidas_disciplinares >= 0);

COMMENT ON COLUMN public.avaliacoes_praticas.resumo_atividades IS
  'Resumo das atividades desenvolvidas pelo aprendiz no periodo avaliado.';
COMMENT ON COLUMN public.avaliacoes_praticas.manteve_turno_contrato IS
  'Indica se o aprendiz manteve o turno estipulado em contrato.';
COMMENT ON COLUMN public.avaliacoes_praticas.pontos_fortes IS
  'Pontos fortes informados pela empresa na ficha de avaliacao pratica.';
COMMENT ON COLUMN public.avaliacoes_praticas.pontos_melhoria IS
  'Pontos de melhoria informados pela empresa na ficha de avaliacao pratica.';
