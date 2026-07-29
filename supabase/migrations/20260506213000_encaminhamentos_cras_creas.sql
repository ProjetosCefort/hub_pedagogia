ALTER TABLE public.encaminhamentos
  ADD COLUMN IF NOT EXISTS tipo_rede TEXT NOT NULL DEFAULT 'geral'
    CHECK (tipo_rede IN ('geral', 'cras', 'creas', 'assistencia_social_outra')),
  ADD COLUMN IF NOT EXISTS referencia_rede TEXT;

CREATE INDEX IF NOT EXISTS idx_encaminhamentos_tipo_rede
  ON public.encaminhamentos(tipo_rede, data_encaminhamento DESC);

COMMENT ON COLUMN public.encaminhamentos.tipo_rede IS
  'Classificação do encaminhamento externo com especialização para CRAS/CREAS.';

COMMENT ON COLUMN public.encaminhamentos.referencia_rede IS
  'Unidade ou referência principal da rede socioassistencial informada no encaminhamento.';
