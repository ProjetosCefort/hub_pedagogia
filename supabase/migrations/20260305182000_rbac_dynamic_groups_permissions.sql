-- P0.2 - RBAC dinâmico por grupos/permissões com compatibilidade legada

CREATE TABLE IF NOT EXISTS public.permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  setor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  sistema BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.permission_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permission_group_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  permission_key_id UUID NOT NULL REFERENCES public.permission_keys(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (group_id, permission_key_id)
);

CREATE TABLE IF NOT EXISTS public.user_permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_keys_modulo_acao
  ON public.permission_keys(modulo, acao)
  WHERE ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_permission_group_items_group
  ON public.permission_group_items(group_id);

CREATE INDEX IF NOT EXISTS idx_permission_group_items_permission
  ON public.permission_group_items(permission_key_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_groups_user
  ON public.user_permission_groups(user_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_groups_group
  ON public.user_permission_groups(group_id);

CREATE OR REPLACE FUNCTION public.update_permission_groups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_permission_groups_updated_at ON public.permission_groups;
CREATE TRIGGER trg_update_permission_groups_updated_at
  BEFORE UPDATE ON public.permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permission_groups_updated_at();

INSERT INTO public.permission_keys (chave, modulo, acao, descricao)
VALUES
  ('dashboard.read', 'dashboard', 'read', 'Visualizar dashboard'),
  ('jovens.read', 'jovens', 'read', 'Visualizar jovens/prontuário'),
  ('jovens.write', 'jovens', 'write', 'Criar/editar jovens'),
  ('inscricoes.read', 'inscricoes', 'read', 'Visualizar inscrições'),
  ('inscricoes.status.manage', 'inscricoes', 'status.manage', 'Alterar status de inscrições'),
  ('agenda.read', 'agenda', 'read', 'Visualizar agenda'),
  ('agenda.write', 'agenda', 'write', 'Gerenciar agenda'),
  ('intervencoes.read', 'intervencoes', 'read', 'Visualizar intervenções'),
  ('intervencoes.write', 'intervencoes', 'write', 'Gerenciar intervenções'),
  ('avaliacoes_pedagogicas.read', 'avaliacoes_pedagogicas', 'read', 'Visualizar avaliações pedagógicas'),
  ('avaliacoes_pedagogicas.write', 'avaliacoes_pedagogicas', 'write', 'Gerenciar avaliações pedagógicas'),
  ('avaliacoes_socioeconomicas.read', 'avaliacoes_socioeconomicas', 'read', 'Visualizar avaliações socioeconômicas'),
  ('avaliacoes_socioeconomicas.write', 'avaliacoes_socioeconomicas', 'write', 'Gerenciar avaliações socioeconômicas'),
  ('encaminhamentos.read', 'encaminhamentos', 'read', 'Visualizar encaminhamentos'),
  ('encaminhamentos.write', 'encaminhamentos', 'write', 'Gerenciar encaminhamentos'),
  ('cadastros.read', 'cadastros', 'read', 'Visualizar cadastros base'),
  ('cadastros.write', 'cadastros', 'write', 'Gerenciar cadastros base'),
  ('configuracoes.read', 'configuracoes', 'read', 'Visualizar configurações'),
  ('configuracoes.write', 'configuracoes', 'write', 'Gerenciar configurações'),
  ('auditoria.read', 'auditoria', 'read', 'Visualizar auditoria'),
  ('rbac.manage', 'rbac', 'manage', 'Gerenciar grupos e permissões'),
  ('menu.setor.psicossocial', 'menu', 'setor.psicossocial', 'Acesso ao menu psicossocial'),
  ('menu.setor.servico_social', 'menu', 'setor.servico_social', 'Acesso ao menu serviço social'),
  ('menu.setor.pedagogico', 'menu', 'setor.pedagogico', 'Acesso ao menu pedagógico')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO public.permission_groups (nome, descricao, setor, sistema)
VALUES
  ('Admin Geral', 'Acesso total com gestão de RBAC', 'administrativo', TRUE),
  ('Gestão', 'Gestão operacional e configurações', 'administrativo', TRUE),
  ('Psicossocial', 'Fluxo psicossocial e intervenções', 'psicossocial', TRUE),
  ('Serviço Social', 'Fluxo socioeconômico e encaminhamentos', 'servico_social', TRUE),
  ('Pedagógico', 'Fluxo pedagógico e gestão acadêmica', 'pedagogico', TRUE)
ON CONFLICT (nome) DO NOTHING;

WITH map AS (
  SELECT
    pg.id AS group_id,
    pk.id AS permission_key_id
  FROM public.permission_groups pg
  JOIN public.permission_keys pk ON (
    (pg.nome = 'Admin Geral')
    OR (pg.nome = 'Gestão' AND pk.chave IN (
      'dashboard.read','jovens.read','jovens.write','inscricoes.read','inscricoes.status.manage',
      'agenda.read','agenda.write','intervencoes.read','intervencoes.write',
      'avaliacoes_pedagogicas.read','avaliacoes_pedagogicas.write',
      'avaliacoes_socioeconomicas.read','avaliacoes_socioeconomicas.write',
      'encaminhamentos.read','encaminhamentos.write','cadastros.read','cadastros.write',
      'configuracoes.read','configuracoes.write','auditoria.read','rbac.manage',
      'menu.setor.psicossocial','menu.setor.servico_social','menu.setor.pedagogico'
    ))
    OR (pg.nome = 'Psicossocial' AND pk.chave IN (
      'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage','agenda.read','agenda.write',
      'intervencoes.read','intervencoes.write','menu.setor.psicossocial'
    ))
    OR (pg.nome = 'Serviço Social' AND pk.chave IN (
      'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage','agenda.read','agenda.write',
      'avaliacoes_socioeconomicas.read','avaliacoes_socioeconomicas.write',
      'encaminhamentos.read','encaminhamentos.write','menu.setor.servico_social'
    ))
    OR (pg.nome = 'Pedagógico' AND pk.chave IN (
      'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage','agenda.read','agenda.write',
      'avaliacoes_pedagogicas.read','avaliacoes_pedagogicas.write','menu.setor.pedagogico'
    ))
  )
)
INSERT INTO public.permission_group_items (group_id, permission_key_id)
SELECT map.group_id, map.permission_key_id
FROM map
ON CONFLICT (group_id, permission_key_id) DO NOTHING;

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
        'menu.setor.psicossocial','menu.setor.servico_social','menu.setor.pedagogico'
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
        'avaliacoes_pedagogicas.read','avaliacoes_pedagogicas.write','menu.setor.pedagogico'
      ];
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_permissions()
RETURNS TABLE(permission_key TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT auth.uid() AS user_id
  ),
  group_permissions AS (
    SELECT pk.chave AS permission_key
    FROM me
    JOIN public.user_permission_groups upg ON upg.user_id = me.user_id
    JOIN public.permission_groups pg ON pg.id = upg.group_id
    JOIN public.permission_group_items pgi ON pgi.group_id = pg.id
    JOIN public.permission_keys pk ON pk.id = pgi.permission_key_id
    WHERE pg.ativo = TRUE
      AND pk.ativo = TRUE
  ),
  role_permissions AS (
    SELECT unnest(public.legacy_role_permissions(ur.role)) AS permission_key
    FROM me
    JOIN public.user_roles ur ON ur.user_id = me.user_id
  )
  SELECT DISTINCT p.permission_key
  FROM (
    SELECT permission_key FROM group_permissions
    UNION ALL
    SELECT permission_key FROM role_permissions
  ) p
  WHERE p.permission_key IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.has_role(v_uid, 'admin') THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.list_my_permissions() p
    WHERE p.permission_key = '*'
       OR p.permission_key = p_key
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_rbac_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id UUID;
  v_action public.audit_action_type;
BEGIN
  v_entity_id := COALESCE(NEW.id, OLD.id);
  v_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'create'::public.audit_action_type
    WHEN TG_OP = 'UPDATE' THEN 'update'::public.audit_action_type
    ELSE 'delete'::public.audit_action_type
  END;

  PERFORM public.log_audit(
    TG_TABLE_NAME,
    v_entity_id,
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
    jsonb_build_object('source', 'rbac_dynamic')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_permission_groups ON public.permission_groups;
CREATE TRIGGER trg_audit_permission_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_rbac_changes();

DROP TRIGGER IF EXISTS trg_audit_permission_keys ON public.permission_keys;
CREATE TRIGGER trg_audit_permission_keys
  AFTER INSERT OR UPDATE OR DELETE ON public.permission_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_rbac_changes();

DROP TRIGGER IF EXISTS trg_audit_permission_group_items ON public.permission_group_items;
CREATE TRIGGER trg_audit_permission_group_items
  AFTER INSERT OR UPDATE OR DELETE ON public.permission_group_items
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_rbac_changes();

DROP TRIGGER IF EXISTS trg_audit_user_permission_groups ON public.user_permission_groups;
CREATE TRIGGER trg_audit_user_permission_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.user_permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_rbac_changes();

ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RBAC read permission_groups" ON public.permission_groups;
DROP POLICY IF EXISTS "RBAC manage permission_groups" ON public.permission_groups;
CREATE POLICY "RBAC read permission_groups"
  ON public.permission_groups
  FOR SELECT
  TO authenticated
  USING (public.has_permission('rbac.manage') OR public.has_any_role(auth.uid()));
CREATE POLICY "RBAC manage permission_groups"
  ON public.permission_groups
  FOR ALL
  TO authenticated
  USING (public.has_permission('rbac.manage'))
  WITH CHECK (public.has_permission('rbac.manage'));

DROP POLICY IF EXISTS "RBAC read permission_keys" ON public.permission_keys;
DROP POLICY IF EXISTS "RBAC manage permission_keys" ON public.permission_keys;
CREATE POLICY "RBAC read permission_keys"
  ON public.permission_keys
  FOR SELECT
  TO authenticated
  USING (public.has_permission('rbac.manage') OR public.has_any_role(auth.uid()));
CREATE POLICY "RBAC manage permission_keys"
  ON public.permission_keys
  FOR ALL
  TO authenticated
  USING (public.has_permission('rbac.manage'))
  WITH CHECK (public.has_permission('rbac.manage'));

DROP POLICY IF EXISTS "RBAC read permission_group_items" ON public.permission_group_items;
DROP POLICY IF EXISTS "RBAC manage permission_group_items" ON public.permission_group_items;
CREATE POLICY "RBAC read permission_group_items"
  ON public.permission_group_items
  FOR SELECT
  TO authenticated
  USING (public.has_permission('rbac.manage') OR public.has_any_role(auth.uid()));
CREATE POLICY "RBAC manage permission_group_items"
  ON public.permission_group_items
  FOR ALL
  TO authenticated
  USING (public.has_permission('rbac.manage'))
  WITH CHECK (public.has_permission('rbac.manage'));

DROP POLICY IF EXISTS "RBAC read user_permission_groups" ON public.user_permission_groups;
DROP POLICY IF EXISTS "RBAC manage user_permission_groups" ON public.user_permission_groups;
CREATE POLICY "RBAC read user_permission_groups"
  ON public.user_permission_groups
  FOR SELECT
  TO authenticated
  USING (public.has_permission('rbac.manage') OR user_id = auth.uid());
CREATE POLICY "RBAC manage user_permission_groups"
  ON public.user_permission_groups
  FOR ALL
  TO authenticated
  USING (public.has_permission('rbac.manage'))
  WITH CHECK (public.has_permission('rbac.manage'));

GRANT SELECT ON public.permission_groups TO authenticated;
GRANT SELECT ON public.permission_keys TO authenticated;
GRANT SELECT ON public.permission_group_items TO authenticated;
GRANT SELECT ON public.user_permission_groups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.permission_groups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.permission_keys TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.permission_group_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_permission_groups TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.legacy_role_permissions(public.app_role) TO authenticated;
