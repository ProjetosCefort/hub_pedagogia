-- =====================================================
-- ADICIONA REGISTROS SOCIAIS (CMAS, CMDCA, etc.)
-- ÀS AVALIAÇÕES SOCIOECONÔMICAS
-- =====================================================

-- Tabela de junção: muitos-para-muitos entre avaliações e registros sociais
CREATE TABLE IF NOT EXISTS public.avaliacoes_socioeconomicas_registros_sociais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_socioeconomica_id UUID NOT NULL REFERENCES public.avaliacoes_socioeconomicas(id) ON DELETE CASCADE,
  registro_social_id UUID NOT NULL REFERENCES public.config_registros_sociais(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Evita duplicatas: mesma avaliação não pode ter o mesmo registro social duas vezes
  UNIQUE(avaliacao_socioeconomica_id, registro_social_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_socio_registros_avaliacao_id
  ON public.avaliacoes_socioeconomicas_registros_sociais(avaliacao_socioeconomica_id);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_socio_registros_registro_id
  ON public.avaliacoes_socioeconomicas_registros_sociais(registro_social_id);

-- Comentário na tabela
COMMENT ON TABLE public.avaliacoes_socioeconomicas_registros_sociais IS
  'Tabela de junção: relaciona avaliações socioeconômicas com registros sociais (CMAS, CMDCA, CRAS, CREAS, etc.).';

-- Função para validar que registro_social_id está ativo
CREATE OR REPLACE FUNCTION public.validate_registro_social_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica se o registro social está ativo
  IF NOT EXISTS (
    SELECT 1
    FROM public.config_registros_sociais
    WHERE id = NEW.registro_social_id
      AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Registro social selecionado não está ativo ou não existe';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar registro ativo antes de INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_validate_registro_social_active ON public.avaliacoes_socioeconomicas_registros_sociais;
CREATE TRIGGER trg_validate_registro_social_active
  BEFORE INSERT OR UPDATE ON public.avaliacoes_socioeconomicas_registros_sociais
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_registro_social_active();

-- Comentário na função
COMMENT ON FUNCTION public.validate_registro_social_active() IS
  'Valida que registro_social_id referenciado está ativo antes de permitir INSERT/UPDATE.';

-- Enable RLS
ALTER TABLE public.avaliacoes_socioeconomicas_registros_sociais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: mesma lógica das avaliações socioeconômicas
CREATE POLICY "Users with role can view avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users with role can insert avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Users with role can delete avaliacoes_socio_registros"
  ON public.avaliacoes_socioeconomicas_registros_sociais
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid()));
