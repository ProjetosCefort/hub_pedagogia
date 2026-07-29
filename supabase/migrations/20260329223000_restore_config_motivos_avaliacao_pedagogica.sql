-- Restore specific config table for pedagogical approach reasons
-- This table was removed by snapshot migration 20260327194826 and is required by
-- Avaliação Pedagógica form and Configurações tab.

CREATE TABLE IF NOT EXISTS public.config_motivos_avaliacao_pedagogica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_config_motivos_avaliacao_pedagogica_nome
  ON public.config_motivos_avaliacao_pedagogica (nome);

CREATE INDEX IF NOT EXISTS idx_config_motivos_avaliacao_pedagogica_ativo
  ON public.config_motivos_avaliacao_pedagogica (ativo)
  WHERE ativo = true;

DROP TRIGGER IF EXISTS tr_config_motivos_avaliacao_pedagogica_updated ON public.config_motivos_avaliacao_pedagogica;
CREATE TRIGGER tr_config_motivos_avaliacao_pedagogica_updated
  BEFORE UPDATE ON public.config_motivos_avaliacao_pedagogica
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.config_motivos_avaliacao_pedagogica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read config_motivos_avaliacao_pedagogica" ON public.config_motivos_avaliacao_pedagogica;
CREATE POLICY "Authenticated users can read config_motivos_avaliacao_pedagogica"
ON public.config_motivos_avaliacao_pedagogica FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert config_motivos_avaliacao_pedagogica" ON public.config_motivos_avaliacao_pedagogica;
CREATE POLICY "Authenticated users can insert config_motivos_avaliacao_pedagogica"
ON public.config_motivos_avaliacao_pedagogica FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update config_motivos_avaliacao_pedagogica" ON public.config_motivos_avaliacao_pedagogica;
CREATE POLICY "Authenticated users can update config_motivos_avaliacao_pedagogica"
ON public.config_motivos_avaliacao_pedagogica FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete config_motivos_avaliacao_pedagogica" ON public.config_motivos_avaliacao_pedagogica;
CREATE POLICY "Authenticated users can delete config_motivos_avaliacao_pedagogica"
ON public.config_motivos_avaliacao_pedagogica FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_motivos_avaliacao_pedagogica TO authenticated;
GRANT ALL ON public.config_motivos_avaliacao_pedagogica TO service_role;

INSERT INTO public.config_motivos_avaliacao_pedagogica (nome, descricao, categoria, ordem)
VALUES
  ('Acompanhamento de aprendizagem', 'Monitoramento do desenvolvimento pedagógico.', 'Aprendizagem', 1),
  ('Reforço de competências', 'Intervenção para fortalecimento de competências acadêmicas.', 'Desempenho', 2),
  ('Plano de estudo orientado', 'Definição de plano pedagógico individual/coletivo.', 'Planejamento', 3),
  ('Mediação pedagógica', 'Ajustes de metodologia para favorecer aprendizagem.', 'Metodologia', 4),
  ('Avaliação formativa', 'Registro formativo do progresso de turma ou jovem.', 'Avaliação', 5)
ON CONFLICT (nome) DO NOTHING;
