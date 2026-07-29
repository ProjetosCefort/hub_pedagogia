-- =====================================================
-- Documentos do Jovem: tabela, storage e pendencias
-- =====================================================

-- 1) Tabela principal
CREATE TABLE IF NOT EXISTS public.documentos_jovem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID NOT NULL REFERENCES public.jovens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo = ANY (ARRAY['rg','cpf','comprovante_endereco','laudo_pcd','outros'])),
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
  status_validacao TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status_validacao = ANY (ARRAY['pendente','aprovado','rejeitado'])),
  observacao_validacao TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_por UUID REFERENCES auth.users(id),
  validado_em TIMESTAMPTZ,
  validado_por UUID REFERENCES auth.users(id)
);

ALTER TABLE public.documentos_jovem
  ADD CONSTRAINT documentos_jovem_storage_path_key UNIQUE (storage_path);

CREATE INDEX IF NOT EXISTS idx_documentos_jovem_jovem_id
  ON public.documentos_jovem(jovem_id);
CREATE INDEX IF NOT EXISTS idx_documentos_jovem_tipo
  ON public.documentos_jovem(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_jovem_status
  ON public.documentos_jovem(status_validacao);

COMMENT ON TABLE public.documentos_jovem IS 'Arquivos enviados para o prontuario do jovem com workflow de validacao.';
COMMENT ON COLUMN public.documentos_jovem.tipo IS 'Tipo de documento (rg, cpf, comprovante_endereco, laudo_pcd, outros).';
COMMENT ON COLUMN public.documentos_jovem.status_validacao IS 'Status da validacao: pendente, aprovado ou rejeitado.';

-- 2) RLS
ALTER TABLE public.documentos_jovem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view documentos_jovem"
  ON public.documentos_jovem
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can insert documentos_jovem"
  ON public.documentos_jovem
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()) AND enviado_por = auth.uid());

CREATE POLICY "Gestao valida documentos_jovem"
  ON public.documentos_jovem
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  );

CREATE POLICY "Gestao remove documentos_jovem"
  ON public.documentos_jovem
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  );

-- 3) Bucket de storage dedicado (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- RLS do storage.objects ja vem habilitado no Supabase Cloud e nao pode ser alterado neste contexto.

CREATE POLICY "Staff can read documentos bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.has_any_role(auth.uid())
  );

CREATE POLICY "Staff can upload documentos bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.has_any_role(auth.uid())
    AND owner = auth.uid()
  );

CREATE POLICY "Gestao can update documentos bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gestor')
    )
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gestor')
    )
  );

CREATE POLICY "Gestao can delete documentos bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gestor')
    )
  );

-- 4) Regras de pendencia: exige documentos obrigatorios aprovados
CREATE OR REPLACE FUNCTION public.get_jovem_pendencias(p_jovem_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendencias TEXT[] := '{}';
  v_status jovem_status;
  v_empresa_id UUID;
  v_required_docs TEXT[] := ARRAY['rg','cpf','comprovante_endereco'];
  v_tipo_doc TEXT;
  v_missing_docs BOOLEAN := false;
BEGIN
  SELECT j.status, j.empresa_id
  INTO v_status, v_empresa_id
  FROM public.jovens j
  WHERE j.id = p_jovem_id;

  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_socioeconomicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_socioeconomica_faltando');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_pedagogicas
    WHERE jovem_id = p_jovem_id
  ) THEN
    v_pendencias := array_append(v_pendencias, 'avaliacao_pedagogica_faltando');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.intervencoes
    WHERE jovem_id = p_jovem_id
      AND tipo = 'intervencao'
  ) THEN
    v_pendencias := array_append(v_pendencias, 'sem_intervencoes');
  END IF;

  IF v_status = 'active_apprentice' AND v_empresa_id IS NULL THEN
    v_pendencias := array_append(v_pendencias, 'sem_empresa_aprovado');
  END IF;

  FOREACH v_tipo_doc IN ARRAY v_required_docs LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.documentos_jovem dj
      WHERE dj.jovem_id = p_jovem_id
        AND dj.tipo = v_tipo_doc
        AND dj.status_validacao = 'aprovado'
    ) THEN
      v_missing_docs := true;
      EXIT;
    END IF;
  END LOOP;

  IF v_missing_docs THEN
    v_pendencias := array_append(v_pendencias, 'documentos_obrigatorios_faltando');
  END IF;

  RETURN v_pendencias;
END;
$$;

COMMENT ON FUNCTION public.get_jovem_pendencias(UUID) IS
  'Retorna pendencias de um jovem considerando avaliacoes, intervencoes, empresa atribuida e documentos obrigatorios.';

-- 5) Atualiza mensagens das notificacoes de pendencias
CREATE OR REPLACE FUNCTION public.refresh_pendencia_notifications_for_jovem(p_jovem_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendencias TEXT[];
  v_code TEXT;
  v_nome TEXT;
  v_role public.app_role;
  v_type TEXT;
  v_message TEXT;
  v_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_jovem_id IS NULL THEN
    RETURN;
  END IF;

  SELECT nome_completo
  INTO v_nome
  FROM public.jovens
  WHERE id = p_jovem_id;

  IF v_nome IS NULL THEN
    RETURN;
  END IF;

  v_pendencias := public.get_jovem_pendencias(p_jovem_id);

  FOREACH v_code IN ARRAY v_pendencias LOOP
    v_role := NULL;
    v_type := NULL;
    v_message := NULL;

    CASE v_code
      WHEN 'avaliacao_socioeconomica_faltando' THEN
        v_role := 'analista_social';
        v_type := 'avaliacao';
        v_message := format('Pendencia socioeconomica: registrar avaliacao para %s', v_nome);
      WHEN 'avaliacao_pedagogica_faltando' THEN
        v_role := 'analista_pedagogico';
        v_type := 'avaliacao';
        v_message := format('Pendencia pedagogica: registrar avaliacao para %s', v_nome);
      WHEN 'sem_intervencoes' THEN
        v_role := 'analista_psicossocial';
        v_type := 'intervencao';
        v_message := format('Pendencia de intervencao: nenhum atendimento registrado para %s', v_nome);
      WHEN 'sem_empresa_aprovado' THEN
        v_role := 'gestor';
        v_type := 'documento';
        v_message := format('Pendencia administrativa: atribuir empresa ao jovem %s', v_nome);
      WHEN 'documentos_obrigatorios_faltando' THEN
        v_role := 'gestor';
        v_type := 'documento';
        v_message := format('Documentos obrigatorios pendentes para %s', v_nome);
    END CASE;

    IF v_role IS NOT NULL AND v_type IS NOT NULL AND v_message IS NOT NULL THEN
      v_messages := array_append(v_messages, v_message);
      IF NOT EXISTS (
        SELECT 1
        FROM public.notificacoes_internas
        WHERE jovem_id = p_jovem_id
          AND related_entity_type = v_type
          AND destinatario_role = v_role
          AND mensagem = v_message
          AND lida = false
      ) THEN
        PERFORM public.create_internal_notification(
          p_jovem_id,
          v_type,
          NULL,
          v_message,
          v_role
        );
      END IF;
    END IF;
  END LOOP;

  UPDATE public.notificacoes_internas
  SET lida = true
  WHERE jovem_id = p_jovem_id
    AND related_entity_type IN ('avaliacao','intervencao','documento')
    AND lida = false
    AND (
      array_length(v_messages, 1) IS NULL
      OR NOT (mensagem = ANY (v_messages))
    );
END;
$$;

-- 6) Gatilhos para recalcular pendencias ao mexer em documentos
CREATE TRIGGER notify_pendencias_documentos_jovem
AFTER INSERT OR UPDATE OR DELETE ON public.documentos_jovem
FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_pendencias_by_ref();
