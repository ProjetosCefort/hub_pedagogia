-- P2.1 - Projetos e participantes

CREATE TABLE IF NOT EXISTS public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  setor TEXT,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido', 'cancelado')),
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.projeto_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  jovem_id UUID REFERENCES public.jovens(id) ON DELETE SET NULL,
  participante_nome TEXT,
  participante_contato TEXT,
  papel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT projeto_participantes_target_check CHECK (jovem_id IS NOT NULL OR participante_nome IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_projetos_status ON public.projetos(status);
CREATE INDEX IF NOT EXISTS idx_projetos_setor ON public.projetos(setor);
CREATE INDEX IF NOT EXISTS idx_projetos_created_at ON public.projetos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projeto_participantes_projeto_id ON public.projeto_participantes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_participantes_jovem_id ON public.projeto_participantes(jovem_id) WHERE jovem_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_projetos_updated_at ON public.projetos;
CREATE TRIGGER update_projetos_updated_at
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.permission_keys (chave, modulo, acao, descricao)
VALUES
  ('projetos.read', 'projetos', 'read', 'Visualizar projetos'),
  ('projetos.write', 'projetos', 'write', 'Gerenciar projetos')
ON CONFLICT (chave) DO NOTHING;

-- Atualiza função de compatibilidade para incluir permissões de projetos
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
        'jovem_vagas.read','jovem_vagas.write','menu.setor.vagas',
        'projetos.read','projetos.write'
      ];
    WHEN 'analista_psicossocial' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write','intervencoes.read','intervencoes.write','menu.setor.psicossocial',
        'projetos.read'
      ];
    WHEN 'analista_social' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write',
        'avaliacoes_socioeconomicas.read','avaliacoes_socioeconomicas.write',
        'encaminhamentos.read','encaminhamentos.write','menu.setor.servico_social',
        'projetos.read'
      ];
    WHEN 'analista_pedagogico' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write',
        'avaliacoes_pedagogicas.read','avaliacoes_pedagogicas.write','menu.setor.pedagogico',
        'jovem_vagas.read','jovem_vagas.write','menu.setor.vagas',
        'projetos.read','projetos.write'
      ];
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$;

-- Inclui permissões em grupos de sistema
WITH keys AS (
  SELECT id, chave FROM public.permission_keys WHERE chave IN ('projetos.read','projetos.write')
), targets AS (
  SELECT pg.id AS group_id, k.id AS permission_key_id
  FROM public.permission_groups pg
  JOIN keys k ON (
    (pg.nome = 'Admin Geral')
    OR (pg.nome = 'Gestão')
    OR (pg.nome = 'Pedagógico')
    OR (pg.nome = 'Psicossocial' AND k.chave = 'projetos.read')
    OR (pg.nome = 'Serviço Social' AND k.chave = 'projetos.read')
  )
)
INSERT INTO public.permission_group_items (group_id, permission_key_id)
SELECT group_id, permission_key_id
FROM targets
ON CONFLICT (group_id, permission_key_id) DO NOTHING;

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view projetos"
  ON public.projetos
  FOR SELECT
  TO authenticated
  USING (public.has_permission('projetos.read'));

CREATE POLICY "Permission can insert projetos"
  ON public.projetos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can update projetos"
  ON public.projetos
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('projetos.write'))
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can delete projetos"
  ON public.projetos
  FOR DELETE
  TO authenticated
  USING (public.has_permission('projetos.write'));

CREATE POLICY "Permission can view projeto_participantes"
  ON public.projeto_participantes
  FOR SELECT
  TO authenticated
  USING (public.has_permission('projetos.read'));

CREATE POLICY "Permission can insert projeto_participantes"
  ON public.projeto_participantes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can update projeto_participantes"
  ON public.projeto_participantes
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('projetos.write'))
  WITH CHECK (public.has_permission('projetos.write'));

CREATE POLICY "Permission can delete projeto_participantes"
  ON public.projeto_participantes
  FOR DELETE
  TO authenticated
  USING (public.has_permission('projetos.write'));

CREATE OR REPLACE FUNCTION public.audit_projetos_tables()
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
    TG_TABLE_NAME,
    v_id,
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    jsonb_build_object('source', 'p2_1')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_projetos ON public.projetos;
CREATE TRIGGER trg_audit_projetos
  AFTER INSERT OR UPDATE OR DELETE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_projetos_tables();

DROP TRIGGER IF EXISTS trg_audit_projeto_participantes ON public.projeto_participantes;
CREATE TRIGGER trg_audit_projeto_participantes
  AFTER INSERT OR UPDATE OR DELETE ON public.projeto_participantes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_projetos_tables();

CREATE OR REPLACE FUNCTION public.notify_projeto_participante_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projeto TEXT;
  v_nome TEXT;
  v_msg TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_projeto FROM public.projetos WHERE id = NEW.projeto_id;

  IF NEW.jovem_id IS NOT NULL THEN
    SELECT nome_completo INTO v_nome FROM public.jovens WHERE id = NEW.jovem_id;
  ELSE
    v_nome := NEW.participante_nome;
  END IF;

  v_msg := format(
    'Novo participante no projeto %s: %s',
    COALESCE(v_projeto, 'Sem nome'),
    COALESCE(v_nome, 'Sem nome')
  );

  PERFORM public.create_internal_notification(
    'gestor',
    v_msg,
    NEW.jovem_id,
    'projetos',
    NEW.projeto_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_projeto_participante_change ON public.projeto_participantes;
CREATE TRIGGER trg_notify_projeto_participante_change
  AFTER INSERT ON public.projeto_participantes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_projeto_participante_change();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projeto_participantes TO authenticated;
