CREATE TABLE IF NOT EXISTS public.intervencoes_coletivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor TEXT NOT NULL DEFAULT 'psicossocial' CHECK (
    setor = ANY (ARRAY['psicossocial', 'servico_social'])
  ),
  tipo_publico TEXT NOT NULL CHECK (
    tipo_publico = ANY (ARRAY['turma', 'empresa'])
  ),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  motivo_intervencao_id UUID REFERENCES public.config_motivos_intervencao(id) ON DELETE SET NULL,
  motivo_intervencao TEXT,
  descricao TEXT NOT NULL,
  data_intervencao TIMESTAMPTZ NOT NULL,
  proximo_agendamento_em TIMESTAMPTZ,
  proximo_agendamento_id UUID REFERENCES public.atendimentos_agendados(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT intervencoes_coletivas_target_check CHECK (
    (tipo_publico = 'turma' AND turma_id IS NOT NULL AND empresa_id IS NULL)
    OR (tipo_publico = 'empresa' AND empresa_id IS NOT NULL AND turma_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.intervencoes_coletivas_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervencao_coletiva_id UUID NOT NULL REFERENCES public.intervencoes_coletivas(id) ON DELETE CASCADE,
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (intervencao_coletiva_id, jovem_id)
);

CREATE INDEX IF NOT EXISTS idx_intervencoes_coletivas_setor_data
  ON public.intervencoes_coletivas(setor, data_intervencao DESC);

CREATE INDEX IF NOT EXISTS idx_intervencoes_coletivas_turma
  ON public.intervencoes_coletivas(turma_id)
  WHERE turma_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intervencoes_coletivas_empresa
  ON public.intervencoes_coletivas(empresa_id)
  WHERE empresa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intervencoes_coletivas_participantes_intervencao
  ON public.intervencoes_coletivas_participantes(intervencao_coletiva_id);

CREATE INDEX IF NOT EXISTS idx_intervencoes_coletivas_participantes_jovem
  ON public.intervencoes_coletivas_participantes(jovem_id);

ALTER TABLE public.intervencoes_coletivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervencoes_coletivas_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view intervencoes_coletivas"
  ON public.intervencoes_coletivas
  FOR SELECT TO authenticated
  USING (public.has_permission('intervencoes_psicossocial.read'));

CREATE POLICY "Permission can insert intervencoes_coletivas"
  ON public.intervencoes_coletivas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('intervencoes_psicossocial.write'));

CREATE POLICY "Permission can update intervencoes_coletivas"
  ON public.intervencoes_coletivas
  FOR UPDATE TO authenticated
  USING (public.has_permission('intervencoes_psicossocial.write'))
  WITH CHECK (public.has_permission('intervencoes_psicossocial.write'));

CREATE POLICY "Permission can delete intervencoes_coletivas"
  ON public.intervencoes_coletivas
  FOR DELETE TO authenticated
  USING (public.has_permission('intervencoes_psicossocial.write'));

CREATE POLICY "Permission can view intervencoes_coletivas_participantes"
  ON public.intervencoes_coletivas_participantes
  FOR SELECT TO authenticated
  USING (public.has_permission('intervencoes_psicossocial.read'));

CREATE POLICY "Permission can insert intervencoes_coletivas_participantes"
  ON public.intervencoes_coletivas_participantes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('intervencoes_psicossocial.write'));

CREATE POLICY "Permission can update intervencoes_coletivas_participantes"
  ON public.intervencoes_coletivas_participantes
  FOR UPDATE TO authenticated
  USING (public.has_permission('intervencoes_psicossocial.write'))
  WITH CHECK (public.has_permission('intervencoes_psicossocial.write'));

CREATE POLICY "Permission can delete intervencoes_coletivas_participantes"
  ON public.intervencoes_coletivas_participantes
  FOR DELETE TO authenticated
  USING (public.has_permission('intervencoes_psicossocial.write'));

DROP TRIGGER IF EXISTS update_intervencoes_coletivas_updated_at ON public.intervencoes_coletivas;
CREATE TRIGGER update_intervencoes_coletivas_updated_at
  BEFORE UPDATE ON public.intervencoes_coletivas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
