-- Restaura suporte de observações internas de jovens aprendizes
-- (tabela + RLS + políticas) em ambientes onde a tabela foi removida.

CREATE TABLE IF NOT EXISTS public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_notes_jovem_id
  ON public.internal_notes(jovem_id);

CREATE INDEX IF NOT EXISTS idx_internal_notes_created_at
  ON public.internal_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_notes_created_by
  ON public.internal_notes(created_by);

ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view internal notes" ON public.internal_notes;
CREATE POLICY "Staff can view internal notes"
  ON public.internal_notes
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert internal notes" ON public.internal_notes;
CREATE POLICY "Staff can insert internal notes"
  ON public.internal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Staff can update internal notes" ON public.internal_notes;
CREATE POLICY "Staff can update internal notes"
  ON public.internal_notes
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can delete internal notes" ON public.internal_notes;
CREATE POLICY "Staff can delete internal notes"
  ON public.internal_notes
  FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid()));

COMMENT ON TABLE public.internal_notes IS 'Notas internas sobre jovens, visíveis apenas para usuários staff';
COMMENT ON COLUMN public.internal_notes.jovem_id IS 'ID do jovem relacionado à nota';
COMMENT ON COLUMN public.internal_notes.note IS 'Conteúdo da nota interna';
COMMENT ON COLUMN public.internal_notes.created_by IS 'ID do usuário que criou a nota';
COMMENT ON COLUMN public.internal_notes.created_at IS 'Data e hora de criação da nota';

