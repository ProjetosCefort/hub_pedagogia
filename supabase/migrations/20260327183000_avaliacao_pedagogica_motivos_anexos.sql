-- =====================================================
-- Avaliacao Pedagogica: motivos especificos e anexos
-- =====================================================

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

CREATE POLICY "Authenticated users can read config_motivos_avaliacao_pedagogica"
ON public.config_motivos_avaliacao_pedagogica FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert config_motivos_avaliacao_pedagogica"
ON public.config_motivos_avaliacao_pedagogica FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update config_motivos_avaliacao_pedagogica"
ON public.config_motivos_avaliacao_pedagogica FOR UPDATE TO authenticated USING (true);

INSERT INTO public.config_motivos_avaliacao_pedagogica (nome, descricao, categoria, ordem)
VALUES
  ('Acompanhamento de aprendizagem', 'Monitoramento do desenvolvimento pedagógico.', 'Aprendizagem', 1),
  ('Reforço de competências', 'Intervenção para fortalecimento de competências acadêmicas.', 'Desempenho', 2),
  ('Plano de estudo orientado', 'Definição de plano pedagógico individual/coletivo.', 'Planejamento', 3),
  ('Mediação pedagógica', 'Ajustes de metodologia para favorecer aprendizagem.', 'Metodologia', 4),
  ('Avaliação formativa', 'Registro formativo do progresso de turma ou jovem.', 'Avaliação', 5)
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.avaliacoes_pedagogicas_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes_pedagogicas(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_pedagogicas_anexos_avaliacao_id
  ON public.avaliacoes_pedagogicas_anexos(avaliacao_id);

ALTER TABLE public.avaliacoes_pedagogicas_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view avaliacoes_pedagogicas_anexos"
  ON public.avaliacoes_pedagogicas_anexos
  FOR SELECT TO authenticated
  USING (public.has_permission('avaliacoes_pedagogicas.read'));

CREATE POLICY "Permission can insert avaliacoes_pedagogicas_anexos"
  ON public.avaliacoes_pedagogicas_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('avaliacoes_pedagogicas.write'));

CREATE POLICY "Permission can update avaliacoes_pedagogicas_anexos"
  ON public.avaliacoes_pedagogicas_anexos
  FOR UPDATE TO authenticated
  USING (public.has_permission('avaliacoes_pedagogicas.write'))
  WITH CHECK (public.has_permission('avaliacoes_pedagogicas.write'));

CREATE POLICY "Permission can delete avaliacoes_pedagogicas_anexos"
  ON public.avaliacoes_pedagogicas_anexos
  FOR DELETE TO authenticated
  USING (public.has_permission('avaliacoes_pedagogicas.write'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_motivos_avaliacao_pedagogica TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_pedagogicas_anexos TO authenticated;
