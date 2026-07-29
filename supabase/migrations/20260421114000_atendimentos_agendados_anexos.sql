-- =====================================================
-- Agenda: anexos de atendimentos agendados
-- =====================================================

CREATE TABLE IF NOT EXISTS public.atendimentos_agendados_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id UUID NOT NULL REFERENCES public.atendimentos_agendados(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  tamanho_bytes BIGINT CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
  anexado_por UUID REFERENCES auth.users(id),
  anexado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_agendados_anexos_atendimento_id
  ON public.atendimentos_agendados_anexos(atendimento_id);

COMMENT ON TABLE public.atendimentos_agendados_anexos IS
  'Arquivos anexados aos atendimentos agendados da agenda.';

ALTER TABLE public.atendimentos_agendados_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view atendimentos_agendados_anexos"
  ON public.atendimentos_agendados_anexos
  FOR SELECT TO authenticated
  USING (public.has_permission('agenda.read'));

CREATE POLICY "Permission can insert atendimentos_agendados_anexos"
  ON public.atendimentos_agendados_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('agenda.write'));

CREATE POLICY "Permission can update atendimentos_agendados_anexos"
  ON public.atendimentos_agendados_anexos
  FOR UPDATE TO authenticated
  USING (public.has_permission('agenda.write'))
  WITH CHECK (public.has_permission('agenda.write'));

CREATE POLICY "Permission can delete atendimentos_agendados_anexos"
  ON public.atendimentos_agendados_anexos
  FOR DELETE TO authenticated
  USING (public.has_permission('agenda.write'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimentos_agendados_anexos TO authenticated;

DROP POLICY IF EXISTS "Agenda can read anexos in documentos bucket" ON storage.objects;
CREATE POLICY "Agenda can read anexos in documentos bucket"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND name LIKE 'agenda/%'
    AND public.has_permission('agenda.read')
  );

DROP POLICY IF EXISTS "Agenda can upload anexos in documentos bucket" ON storage.objects;
CREATE POLICY "Agenda can upload anexos in documentos bucket"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND name LIKE 'agenda/%'
    AND owner = auth.uid()
    AND public.has_permission('agenda.write')
  );

DROP POLICY IF EXISTS "Agenda can delete anexos in documentos bucket" ON storage.objects;
CREATE POLICY "Agenda can delete anexos in documentos bucket"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND name LIKE 'agenda/%'
    AND public.has_permission('agenda.write')
  );
