-- Modelos de documentos para emissão interna
CREATE TABLE IF NOT EXISTS public.config_modelos_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('certificado', 'comprovante_matricula', 'advertencia', 'outros')),
  descricao TEXT,
  corpo_template TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_config_modelos_documentos_ativo_ordem
  ON public.config_modelos_documentos(ativo, ordem, nome);

ALTER TABLE public.config_modelos_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users with role can read modelos documentos" ON public.config_modelos_documentos;
CREATE POLICY "Users with role can read modelos documentos"
  ON public.config_modelos_documentos
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users with role can insert modelos documentos" ON public.config_modelos_documentos;
CREATE POLICY "Users with role can insert modelos documentos"
  ON public.config_modelos_documentos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users with role can update modelos documentos" ON public.config_modelos_documentos;
CREATE POLICY "Users with role can update modelos documentos"
  ON public.config_modelos_documentos
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.config_modelos_documentos TO authenticated;
