-- =====================================================
-- Conselho de Classe: anexos da reuniao
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conselho_classe_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conselho_id UUID NOT NULL REFERENCES public.conselho_classe(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  tamanho_bytes BIGINT CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
  anexado_por UUID REFERENCES auth.users(id),
  anexado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conselho_classe_anexos_conselho_id
  ON public.conselho_classe_anexos(conselho_id);

COMMENT ON TABLE public.conselho_classe_anexos IS
  'Arquivos anexados aos registros de conselho de classe.';

ALTER TABLE public.conselho_classe_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view conselho_classe_anexos"
  ON public.conselho_classe_anexos
  FOR SELECT TO authenticated
  USING (public.has_permission('conselho_classe.read'));

CREATE POLICY "Permission can insert conselho_classe_anexos"
  ON public.conselho_classe_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('conselho_classe.write'));

CREATE POLICY "Permission can update conselho_classe_anexos"
  ON public.conselho_classe_anexos
  FOR UPDATE TO authenticated
  USING (public.has_permission('conselho_classe.write'))
  WITH CHECK (public.has_permission('conselho_classe.write'));

CREATE POLICY "Permission can delete conselho_classe_anexos"
  ON public.conselho_classe_anexos
  FOR DELETE TO authenticated
  USING (public.has_permission('conselho_classe.write'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conselho_classe_anexos TO authenticated;

DROP POLICY IF EXISTS "Conselho can read anexos in documentos bucket" ON storage.objects;
CREATE POLICY "Conselho can read anexos in documentos bucket"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND name LIKE 'conselho-classe/%'
    AND public.has_permission('conselho_classe.read')
  );

DROP POLICY IF EXISTS "Conselho can upload anexos in documentos bucket" ON storage.objects;
CREATE POLICY "Conselho can upload anexos in documentos bucket"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND name LIKE 'conselho-classe/%'
    AND owner = auth.uid()
    AND public.has_permission('conselho_classe.write')
  );

DROP POLICY IF EXISTS "Conselho can delete anexos in documentos bucket" ON storage.objects;
CREATE POLICY "Conselho can delete anexos in documentos bucket"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND name LIKE 'conselho-classe/%'
    AND public.has_permission('conselho_classe.write')
  );
