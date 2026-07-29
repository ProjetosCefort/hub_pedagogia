-- Histórico de documentos emitidos internamente para jovens
CREATE TABLE IF NOT EXISTS public.documentos_emitidos_jovem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  modelo_id UUID NULL REFERENCES public.config_modelos_documentos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('certificado', 'comprovante_matricula', 'advertencia', 'outros')),
  titulo TEXT NOT NULL,
  observacao TEXT NULL,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NULL,
  tamanho_bytes BIGINT NULL CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  emitido_por UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_jovem_jovem_id
  ON public.documentos_emitidos_jovem(jovem_id);

CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_jovem_tipo
  ON public.documentos_emitidos_jovem(tipo);

CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_jovem_emitido_em
  ON public.documentos_emitidos_jovem(emitido_em DESC);

ALTER TABLE public.documentos_emitidos_jovem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view documentos_emitidos_jovem" ON public.documentos_emitidos_jovem;
CREATE POLICY "Staff can view documentos_emitidos_jovem"
  ON public.documentos_emitidos_jovem
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert documentos_emitidos_jovem" ON public.documentos_emitidos_jovem;
CREATE POLICY "Staff can insert documentos_emitidos_jovem"
  ON public.documentos_emitidos_jovem
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can update documentos_emitidos_jovem" ON public.documentos_emitidos_jovem;
CREATE POLICY "Staff can update documentos_emitidos_jovem"
  ON public.documentos_emitidos_jovem
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.documentos_emitidos_jovem TO authenticated;
