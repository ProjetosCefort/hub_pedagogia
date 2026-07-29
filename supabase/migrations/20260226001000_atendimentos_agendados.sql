-- =============================================
-- Agenda / Atendimentos Agendados
-- =============================================

CREATE TABLE IF NOT EXISTS public.atendimentos_agendados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (
    tipo = ANY (ARRAY['intervencao','avaliacao_pedagogica','avaliacao_socioeconomica','encaminhamento'])
  ),
  titulo TEXT NOT NULL,
  descricao TEXT,
  agendado_para TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER DEFAULT 60 CHECK (duracao_minutos IS NULL OR duracao_minutos > 0),
  responsavel_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (
    status = ANY (ARRAY['agendado','realizado','cancelado'])
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_jovem
  ON public.atendimentos_agendados(jovem_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_responsavel
  ON public.atendimentos_agendados(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_status_data
  ON public.atendimentos_agendados(status, agendado_para DESC);
CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_agendado_para
  ON public.atendimentos_agendados(agendado_para DESC);

ALTER TABLE public.atendimentos_agendados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff pode visualizar atendimentos agendados"
  ON public.atendimentos_agendados
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff pode inserir atendimentos agendados"
  ON public.atendimentos_agendados
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff pode atualizar atendimentos agendados"
  ON public.atendimentos_agendados
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (
    public.has_any_role(auth.uid()) AND (
      status <> 'cancelado'
      OR created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Somente criador ou admin pode excluir atendimentos agendados"
  ON public.atendimentos_agendados
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
