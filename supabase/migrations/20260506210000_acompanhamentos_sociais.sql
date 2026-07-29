CREATE TABLE IF NOT EXISTS public.acompanhamentos_sociais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  tipo_registro TEXT NOT NULL CHECK (tipo_registro IN ('individual', 'familiar')),
  data_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  contexto_familiar TEXT,
  encaminhar_pedagogico BOOLEAN NOT NULL DEFAULT FALSE,
  encaminhar_psicossocial BOOLEAN NOT NULL DEFAULT FALSE,
  solicitacao_pedagogico_id UUID REFERENCES public.solicitacoes_setoriais(id) ON DELETE SET NULL,
  solicitacao_psicossocial_id UUID REFERENCES public.solicitacoes_setoriais(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acompanhamentos_sociais_jovem
  ON public.acompanhamentos_sociais(jovem_id, data_registro DESC);

CREATE INDEX IF NOT EXISTS idx_acompanhamentos_sociais_tipo
  ON public.acompanhamentos_sociais(tipo_registro, data_registro DESC);

ALTER TABLE public.acompanhamentos_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read acompanhamentos sociais"
  ON public.acompanhamentos_sociais
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert acompanhamentos sociais"
  ON public.acompanhamentos_sociais
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update acompanhamentos sociais"
  ON public.acompanhamentos_sociais
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.set_updated_at_acompanhamentos_sociais()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_acompanhamentos_sociais ON public.acompanhamentos_sociais;
CREATE TRIGGER trg_set_updated_at_acompanhamentos_sociais
BEFORE UPDATE ON public.acompanhamentos_sociais
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_acompanhamentos_sociais();

COMMENT ON TABLE public.acompanhamentos_sociais IS
  'Registros explícitos de acompanhamento social individual e familiar.';
