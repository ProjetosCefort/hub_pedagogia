-- Migration: Sistema de Notas Internas para Perfis de Jovens
-- Permite que apenas usuários staff adicionem e visualizem notas internas sobre jovens

-- Tabela de notas internas
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_notes_jovem_id ON public.internal_notes(jovem_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_created_at ON public.internal_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_notes_created_by ON public.internal_notes(created_by);

-- RLS para notas internas (apenas staff pode ver e criar)
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

-- Política: Apenas staff pode visualizar notas internas
CREATE POLICY "Staff can view internal notes"
  ON public.internal_notes
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Política: Apenas staff pode inserir notas internas
CREATE POLICY "Staff can insert internal notes"
  ON public.internal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid())
    AND created_by = auth.uid()
  );

-- Política: Apenas staff pode atualizar notas internas (opcional, para edição futura)
CREATE POLICY "Staff can update internal notes"
  ON public.internal_notes
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

-- Política: Apenas staff pode deletar notas internas (opcional, para remoção futura)
CREATE POLICY "Staff can delete internal notes"
  ON public.internal_notes
  FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Comentários para documentação
COMMENT ON TABLE public.internal_notes IS 'Notas internas sobre jovens, visíveis apenas para usuários staff';
COMMENT ON COLUMN public.internal_notes.jovem_id IS 'ID do jovem relacionado à nota';
COMMENT ON COLUMN public.internal_notes.note IS 'Conteúdo da nota interna';
COMMENT ON COLUMN public.internal_notes.created_by IS 'ID do usuário que criou a nota';
COMMENT ON COLUMN public.internal_notes.created_at IS 'Data e hora de criação da nota';
