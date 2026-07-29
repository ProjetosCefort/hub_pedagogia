-- =============================================
-- Avaliacoes praticas - base MVP
-- =============================================

CREATE TABLE IF NOT EXISTS public.avaliacoes_praticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'solicitada' CHECK (
    status = ANY (ARRAY['solicitada', 'respondida', 'validada', 'atrasada', 'cancelada'])
  ),
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resposta TIMESTAMPTZ,
  data_validacao TIMESTAMPTZ,
  proxima_data_envio DATE,
  avaliador_nome TEXT,
  avaliador_email TEXT,
  parecer_empresa TEXT,
  parecer_interno TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_praticas_jovem_id
  ON public.avaliacoes_praticas(jovem_id);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_praticas_empresa_id
  ON public.avaliacoes_praticas(empresa_id)
  WHERE empresa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_praticas_status_proxima_data
  ON public.avaliacoes_praticas(status, proxima_data_envio);

ALTER TABLE public.avaliacoes_praticas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff pode visualizar avaliacoes_praticas"
  ON public.avaliacoes_praticas
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff pode inserir avaliacoes_praticas"
  ON public.avaliacoes_praticas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff pode atualizar avaliacoes_praticas"
  ON public.avaliacoes_praticas
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Admin/Gestor pode excluir avaliacoes_praticas"
  ON public.avaliacoes_praticas
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE OR REPLACE FUNCTION public.set_updated_at_avaliacoes_praticas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_avaliacoes_praticas ON public.avaliacoes_praticas;
CREATE TRIGGER trg_set_updated_at_avaliacoes_praticas
BEFORE UPDATE ON public.avaliacoes_praticas
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_avaliacoes_praticas();

COMMENT ON TABLE public.avaliacoes_praticas IS
  'Base inicial para avaliacoes praticas enviadas a empresa e acompanhadas pela equipe interna.';
