-- =====================================================
-- Documentos: validade, novos tipos, upload público por token
-- =====================================================

-- 1) Estrutura base
ALTER TABLE public.documentos_jovem
  ADD COLUMN IF NOT EXISTS inscricao_id UUID REFERENCES public.inscricoes_jovens_aprendizes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS validade_em DATE,
  ADD COLUMN IF NOT EXISTS lembrete_vencimento_enviado_em TIMESTAMPTZ;

ALTER TABLE public.documentos_jovem
  ALTER COLUMN jovem_id DROP NOT NULL;

ALTER TABLE public.documentos_jovem
  DROP CONSTRAINT IF EXISTS documentos_jovem_tipo_check;

ALTER TABLE public.documentos_jovem
  ADD CONSTRAINT documentos_jovem_tipo_check CHECK (
    tipo = ANY (
      ARRAY[
        'rg',
        'cpf',
        'comprovante_endereco',
        'comprovante_escolaridade',
        'carteira_trabalho',
        'laudo_pcd',
        'outros'
      ]
    )
  );

ALTER TABLE public.documentos_jovem
  DROP CONSTRAINT IF EXISTS documentos_jovem_ref_check;

ALTER TABLE public.documentos_jovem
  ADD CONSTRAINT documentos_jovem_ref_check CHECK (
    jovem_id IS NOT NULL OR inscricao_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_documentos_jovem_inscricao_id
  ON public.documentos_jovem(inscricao_id);

CREATE INDEX IF NOT EXISTS idx_documentos_jovem_validade
  ON public.documentos_jovem(validade_em)
  WHERE validade_em IS NOT NULL;

COMMENT ON COLUMN public.documentos_jovem.validade_em IS
  'Data de validade definida internamente pelo CEFORT.';

COMMENT ON COLUMN public.documentos_jovem.lembrete_vencimento_enviado_em IS
  'Marca de envio de lembrete quando documento vence.';

-- 2) RLS: leitura por token público (jovem/inscrição vinculada ao token)
DROP POLICY IF EXISTS "Public token select documentos_jovem" ON public.documentos_jovem;
CREATE POLICY "Public token select documentos_jovem"
  ON public.documentos_jovem
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      jovem_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.jovens j
        WHERE j.id = documentos_jovem.jovem_id
          AND (auth.jwt() ->> 'access_token') IS NOT NULL
          AND j.access_token = (auth.jwt() ->> 'access_token')
          AND j.access_token_expires_at > now()
      )
    )
    OR (
      inscricao_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.inscricoes_jovens_aprendizes i
        WHERE i.id = documentos_jovem.inscricao_id
          AND (auth.jwt() ->> 'access_token') IS NOT NULL
          AND i.access_token = (auth.jwt() ->> 'access_token')
          AND i.access_token_expires_at > now()
      )
    )
  );

-- 3) Pendências: incluir documento vencido e novos documentos obrigatórios
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
  v_required_docs TEXT[] := ARRAY[
    'rg',
    'cpf',
    'comprovante_endereco',
    'comprovante_escolaridade',
    'carteira_trabalho'
  ];
  v_tipo_doc TEXT;
  v_missing_docs BOOLEAN := false;
  v_has_expired_docs BOOLEAN := false;
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

  IF (v_status::text = 'active_apprentice' OR v_status::text = 'ativo') AND v_empresa_id IS NULL THEN
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
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.documentos_jovem dj
      WHERE dj.jovem_id = p_jovem_id
        AND dj.tipo = v_tipo_doc
        AND dj.status_validacao = 'aprovado'
        AND dj.validade_em IS NOT NULL
        AND dj.validade_em < CURRENT_DATE
    ) THEN
      v_has_expired_docs := true;
    END IF;
  END LOOP;

  IF v_missing_docs THEN
    v_pendencias := array_append(v_pendencias, 'documentos_obrigatorios_faltando');
  END IF;

  IF v_has_expired_docs THEN
    v_pendencias := array_append(v_pendencias, 'documento_vencido');
  END IF;

  RETURN v_pendencias;
END;
$$;

COMMENT ON FUNCTION public.get_jovem_pendencias(UUID) IS
  'Retorna pendências de um jovem considerando avaliações, intervenções, empresa atribuída e documentos obrigatórios/vencidos.';

-- 4) Notificações internas para novo código de pendência
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
        v_message := format('Pendência socioeconômica: registrar avaliação para %s', v_nome);
      WHEN 'avaliacao_pedagogica_faltando' THEN
        v_role := 'analista_pedagogico';
        v_type := 'avaliacao';
        v_message := format('Pendência pedagógica: registrar avaliação para %s', v_nome);
      WHEN 'sem_intervencoes' THEN
        v_role := 'analista_psicossocial';
        v_type := 'intervencao';
        v_message := format('Pendência de intervenção: nenhum atendimento registrado para %s', v_nome);
      WHEN 'sem_empresa_aprovado' THEN
        v_role := 'gestor';
        v_type := 'documento';
        v_message := format('Pendência administrativa: atribuir empresa ao jovem %s', v_nome);
      WHEN 'documentos_obrigatorios_faltando' THEN
        v_role := 'gestor';
        v_type := 'documento';
        v_message := format('Documentos obrigatórios pendentes para %s', v_nome);
      WHEN 'documento_vencido' THEN
        v_role := 'gestor';
        v_type := 'documento';
        v_message := format('Documento vencido para %s. Solicitar atualização.', v_nome);
    END CASE;

    IF v_role IS NOT NULL AND v_type IS NOT NULL AND v_message IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.notificacoes_internas
        WHERE jovem_id = p_jovem_id
          AND destinatario_role = v_role
          AND related_entity_type = 'pendencia'
          AND mensagem = v_message
          AND lida = false
      ) THEN
        PERFORM public.create_internal_notification(
          p_jovem_id,
          'pendencia',
          NULL,
          v_message,
          v_role,
          NULL
        );
      END IF;
      v_messages := array_append(v_messages, v_message);
    END IF;
  END LOOP;

  UPDATE public.notificacoes_internas
  SET lida = true
  WHERE jovem_id = p_jovem_id
    AND related_entity_type = 'pendencia'
    AND lida = false
    AND (mensagem <> ALL(v_messages));
END;
$$;
