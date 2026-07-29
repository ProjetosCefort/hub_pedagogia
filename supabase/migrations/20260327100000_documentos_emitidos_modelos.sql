-- =====================================================
-- Modelos de documentos internos e historico de emitidos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.config_modelos_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (
    tipo = ANY (ARRAY['certificado', 'comprovante_matricula', 'advertencia', 'outros'])
  ),
  descricao TEXT,
  corpo_template TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_config_modelos_documentos_tipo
  ON public.config_modelos_documentos(tipo);

CREATE INDEX IF NOT EXISTS idx_config_modelos_documentos_ativo
  ON public.config_modelos_documentos(ativo);

DROP TRIGGER IF EXISTS update_config_modelos_documentos_updated_at
  ON public.config_modelos_documentos;
CREATE TRIGGER update_config_modelos_documentos_updated_at
  BEFORE UPDATE ON public.config_modelos_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.config_modelos_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read config_modelos_documentos"
  ON public.config_modelos_documentos;
CREATE POLICY "Authenticated users can read config_modelos_documentos"
  ON public.config_modelos_documentos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert config_modelos_documentos"
  ON public.config_modelos_documentos;
CREATE POLICY "Authenticated users can insert config_modelos_documentos"
  ON public.config_modelos_documentos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update config_modelos_documentos"
  ON public.config_modelos_documentos;
CREATE POLICY "Authenticated users can update config_modelos_documentos"
  ON public.config_modelos_documentos
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.documentos_emitidos_jovem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  modelo_id UUID REFERENCES public.config_modelos_documentos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (
    tipo = ANY (ARRAY['certificado', 'comprovante_matricula', 'advertencia', 'outros'])
  ),
  titulo TEXT NOT NULL,
  observacao TEXT,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  tamanho_bytes BIGINT CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  emitido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_jovem_jovem_id
  ON public.documentos_emitidos_jovem(jovem_id);

CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_jovem_tipo
  ON public.documentos_emitidos_jovem(tipo);

CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_jovem_emitido_em
  ON public.documentos_emitidos_jovem(emitido_em DESC);

ALTER TABLE public.documentos_emitidos_jovem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view documentos_emitidos_jovem"
  ON public.documentos_emitidos_jovem;
CREATE POLICY "Staff can view documentos_emitidos_jovem"
  ON public.documentos_emitidos_jovem
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert documentos_emitidos_jovem"
  ON public.documentos_emitidos_jovem;
CREATE POLICY "Staff can insert documentos_emitidos_jovem"
  ON public.documentos_emitidos_jovem
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()) AND emitido_por = auth.uid());

COMMENT ON TABLE public.config_modelos_documentos IS
  'Modelos de documentos emitidos internamente pelo CEFORT.';

COMMENT ON TABLE public.documentos_emitidos_jovem IS
  'Historico de documentos emitidos internamente pelo CEFORT para o jovem aprendiz.';
