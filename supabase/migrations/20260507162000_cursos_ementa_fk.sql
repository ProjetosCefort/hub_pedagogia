ALTER TABLE public.cursos
  DROP CONSTRAINT IF EXISTS cursos_ementa_id_fkey;

ALTER TABLE public.cursos
  ADD CONSTRAINT cursos_ementa_id_fkey
  FOREIGN KEY (ementa_id)
  REFERENCES public.ementas(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cursos_ementa_id
  ON public.cursos(ementa_id)
  WHERE ementa_id IS NOT NULL;
