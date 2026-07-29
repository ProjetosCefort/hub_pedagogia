ALTER TABLE public.inscricoes_jovens_aprendizes
  ADD COLUMN IF NOT EXISTS registros_sociais_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

COMMENT ON COLUMN public.inscricoes_jovens_aprendizes.registros_sociais_ids IS
  'Registros e serviços da rede socioassistencial e intersetorial informados no cadastro do jovem.';

DROP POLICY IF EXISTS "Public can read active social records" ON public.config_registros_sociais;
CREATE POLICY "Public can read active social records"
  ON public.config_registros_sociais
  FOR SELECT
  TO anon
  USING (ativo = true);

GRANT SELECT ON public.config_registros_sociais TO anon;
