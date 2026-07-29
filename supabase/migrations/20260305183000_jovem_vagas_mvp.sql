-- P1.1 - Base de vínculo Jovem <-> Vaga (MVP)

CREATE TABLE IF NOT EXISTS public.jovem_vaga_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jovem_id UUID REFERENCES public.jovens(id) ON DELETE SET NULL,
  inscricao_id UUID REFERENCES public.inscricoes_jovens_aprendizes(id) ON DELETE SET NULL,
  vaga_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise', 'aprovado', 'reprovado', 'encerrado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT jovem_vaga_vinculos_target_check CHECK (jovem_id IS NOT NULL OR inscricao_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_jovem_vaga_vinculos_jovem_id
  ON public.jovem_vaga_vinculos(jovem_id)
  WHERE jovem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jovem_vaga_vinculos_inscricao_id
  ON public.jovem_vaga_vinculos(inscricao_id)
  WHERE inscricao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jovem_vaga_vinculos_status
  ON public.jovem_vaga_vinculos(status);

CREATE INDEX IF NOT EXISTS idx_jovem_vaga_vinculos_created_at
  ON public.jovem_vaga_vinculos(created_at DESC);

DROP TRIGGER IF EXISTS update_jovem_vaga_vinculos_updated_at ON public.jovem_vaga_vinculos;
CREATE TRIGGER update_jovem_vaga_vinculos_updated_at
  BEFORE UPDATE ON public.jovem_vaga_vinculos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Evita falhas de FK em audit_logs durante migrations executadas sem auth.uid().
CREATE OR REPLACE FUNCTION public.log_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action_type public.audit_action_type,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_log_id UUID;
  v_diff_json JSONB;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    SELECT id
      INTO v_current_user_id
      FROM auth.users
      LIMIT 1;
  END IF;

  IF v_current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_old_data IS NOT NULL AND p_new_data IS NOT NULL THEN
    v_diff_json := jsonb_build_object('old', p_old_data, 'new', p_new_data);
  ELSIF p_new_data IS NOT NULL THEN
    v_diff_json := jsonb_build_object('new', p_new_data);
  ELSIF p_old_data IS NOT NULL THEN
    v_diff_json := jsonb_build_object('old', p_old_data);
  END IF;

  INSERT INTO public.audit_logs (
    entity_type, entity_id, action_type, changed_by, changed_at, diff_json, metadata
  ) VALUES (
    p_entity_type, p_entity_id, p_action_type, v_current_user_id, now(), v_diff_json, p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

INSERT INTO public.permission_keys (chave, modulo, acao, descricao)
VALUES
  ('jovem_vagas.read', 'jovem_vagas', 'read', 'Visualizar vínculos jovem-vaga'),
  ('jovem_vagas.write', 'jovem_vagas', 'write', 'Gerenciar vínculos jovem-vaga'),
  ('menu.setor.vagas', 'menu', 'setor.vagas', 'Acesso ao menu de vínculos de vaga')
ON CONFLICT (chave) DO NOTHING;

-- Atualiza função de compatibilidade para incluir permissões de vínculo de vaga
CREATE OR REPLACE FUNCTION public.legacy_role_permissions(p_role public.app_role)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_role
    WHEN 'admin' THEN
      RETURN ARRAY['*'];
    WHEN 'gestor' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','jovens.write','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write','intervencoes.read','intervencoes.write',
        'avaliacoes_pedagogicas.read','avaliacoes_pedagogicas.write',
        'avaliacoes_socioeconomicas.read','avaliacoes_socioeconomicas.write',
        'encaminhamentos.read','encaminhamentos.write','cadastros.read','cadastros.write',
        'configuracoes.read','configuracoes.write','auditoria.read','rbac.manage',
        'menu.setor.psicossocial','menu.setor.servico_social','menu.setor.pedagogico',
        'jovem_vagas.read','jovem_vagas.write','menu.setor.vagas'
      ];
    WHEN 'analista_psicossocial' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write','intervencoes.read','intervencoes.write','menu.setor.psicossocial'
      ];
    WHEN 'analista_social' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write',
        'avaliacoes_socioeconomicas.read','avaliacoes_socioeconomicas.write',
        'encaminhamentos.read','encaminhamentos.write','menu.setor.servico_social'
      ];
    WHEN 'analista_pedagogico' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write',
        'avaliacoes_pedagogicas.read','avaliacoes_pedagogicas.write','menu.setor.pedagogico',
        'jovem_vagas.read','jovem_vagas.write','menu.setor.vagas'
      ];
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$;

-- Inclui as novas permissões em grupos de sistema
WITH keys AS (
  SELECT id, chave FROM public.permission_keys WHERE chave IN ('jovem_vagas.read','jovem_vagas.write','menu.setor.vagas')
), targets AS (
  SELECT pg.id AS group_id, k.id AS permission_key_id
  FROM public.permission_groups pg
  JOIN keys k ON (
    (pg.nome = 'Admin Geral')
    OR (pg.nome = 'Gestão')
    OR (pg.nome = 'Pedagógico' AND k.chave IN ('jovem_vagas.read','jovem_vagas.write','menu.setor.vagas'))
  )
)
INSERT INTO public.permission_group_items (group_id, permission_key_id)
SELECT group_id, permission_key_id
FROM targets
ON CONFLICT (group_id, permission_key_id) DO NOTHING;

ALTER TABLE public.jovem_vaga_vinculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view jovem_vaga_vinculos"
  ON public.jovem_vaga_vinculos
  FOR SELECT
  TO authenticated
  USING (public.has_permission('jovem_vagas.read'));

CREATE POLICY "Permission can insert jovem_vaga_vinculos"
  ON public.jovem_vaga_vinculos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('jovem_vagas.write'));

CREATE POLICY "Permission can update jovem_vaga_vinculos"
  ON public.jovem_vaga_vinculos
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('jovem_vagas.write'))
  WITH CHECK (public.has_permission('jovem_vagas.write'));

CREATE POLICY "Permission can delete jovem_vaga_vinculos"
  ON public.jovem_vaga_vinculos
  FOR DELETE
  TO authenticated
  USING (public.has_permission('jovem_vagas.write'));

CREATE OR REPLACE FUNCTION public.audit_jovem_vaga_vinculos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := COALESCE(NEW.id, OLD.id);
  v_action public.audit_action_type;
BEGIN
  v_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'create'::public.audit_action_type
    WHEN TG_OP = 'UPDATE' THEN 'update'::public.audit_action_type
    ELSE 'delete'::public.audit_action_type
  END;

  PERFORM public.log_audit(
    'jovem_vaga_vinculos',
    v_id,
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    jsonb_build_object('source', 'p1_1')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_jovem_vaga_vinculos ON public.jovem_vaga_vinculos;
CREATE TRIGGER trg_audit_jovem_vaga_vinculos
  AFTER INSERT OR UPDATE OR DELETE ON public.jovem_vaga_vinculos
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_jovem_vaga_vinculos();

CREATE OR REPLACE FUNCTION public.notify_jovem_vaga_vinculos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT nome_completo INTO v_nome
    FROM public.jovens
    WHERE id = NEW.jovem_id;

    IF v_nome IS NULL AND NEW.inscricao_id IS NOT NULL THEN
      SELECT nome_completo INTO v_nome
      FROM public.inscricoes_jovens_aprendizes
      WHERE id = NEW.inscricao_id;
    END IF;

    v_msg := format(
      'Novo vínculo em análise para vaga (%s): %s',
      NEW.vaga_ref,
      COALESCE(v_nome, 'Sem nome')
    );

    PERFORM public.create_internal_notification(
      'gestor',
      v_msg,
      NEW.jovem_id,
      'jovem_vaga_vinculos',
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_msg := format('Vínculo de vaga atualizado para %s (%s)', NEW.status, NEW.vaga_ref);

    PERFORM public.create_internal_notification(
      'gestor',
      v_msg,
      NEW.jovem_id,
      'jovem_vaga_vinculos',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_jovem_vaga_vinculos ON public.jovem_vaga_vinculos;
CREATE TRIGGER trg_notify_jovem_vaga_vinculos
  AFTER INSERT OR UPDATE ON public.jovem_vaga_vinculos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_jovem_vaga_vinculos();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jovem_vaga_vinculos TO authenticated;
