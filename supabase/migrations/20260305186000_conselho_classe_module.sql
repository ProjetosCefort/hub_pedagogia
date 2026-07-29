-- P2.3 - Conselho de Classe

CREATE TABLE IF NOT EXISTS public.conselho_classe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  periodo TEXT,
  data_reuniao DATE NOT NULL,
  pauta TEXT,
  parecer TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'finalizado', 'arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.conselho_classe_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conselho_id UUID NOT NULL REFERENCES public.conselho_classe(id) ON DELETE CASCADE,
  jovem_id UUID REFERENCES public.jovens(id) ON DELETE SET NULL,
  participante_nome TEXT,
  participante_cargo TEXT,
  registro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT conselho_registros_target_check CHECK (jovem_id IS NOT NULL OR participante_nome IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_conselho_classe_turma_id ON public.conselho_classe(turma_id);
CREATE INDEX IF NOT EXISTS idx_conselho_classe_data_reuniao ON public.conselho_classe(data_reuniao DESC);
CREATE INDEX IF NOT EXISTS idx_conselho_classe_status ON public.conselho_classe(status);
CREATE INDEX IF NOT EXISTS idx_conselho_classe_registros_conselho_id ON public.conselho_classe_registros(conselho_id);
CREATE INDEX IF NOT EXISTS idx_conselho_classe_registros_jovem_id ON public.conselho_classe_registros(jovem_id) WHERE jovem_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_conselho_classe_updated_at ON public.conselho_classe;
CREATE TRIGGER update_conselho_classe_updated_at
  BEFORE UPDATE ON public.conselho_classe
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.permission_keys (chave, modulo, acao, descricao)
VALUES
  ('conselho_classe.read', 'conselho_classe', 'read', 'Visualizar conselho de classe'),
  ('conselho_classe.write', 'conselho_classe', 'write', 'Gerenciar conselho de classe')
ON CONFLICT (chave) DO NOTHING;

-- Atualiza compatibilidade de permissões legadas
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
        'projetos.read','projetos.write',
        'certificacoes.read','certificacoes.write',
        'conselho_classe.read','conselho_classe.write'
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
        'projetos.read',
        'certificacoes.read','certificacoes.write'
      ];
    WHEN 'analista_pedagogico' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write',
        'avaliacoes_pedagogicas.read','avaliacoes_pedagogicas.write','menu.setor.pedagogico',
        'jovem_vagas.read','jovem_vagas.write','menu.setor.vagas',
        'projetos.read','projetos.write',
        'certificacoes.read',
        'conselho_classe.read','conselho_classe.write'
      ];
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$;

WITH keys AS (
  SELECT id, chave FROM public.permission_keys WHERE chave IN ('conselho_classe.read','conselho_classe.write')
), targets AS (
  SELECT pg.id AS group_id, k.id AS permission_key_id
  FROM public.permission_groups pg
  JOIN keys k ON (
    (pg.nome = 'Admin Geral')
    OR (pg.nome = 'Gestão')
    OR (pg.nome = 'Pedagógico')
  )
)
INSERT INTO public.permission_group_items (group_id, permission_key_id)
SELECT group_id, permission_key_id
FROM targets
ON CONFLICT (group_id, permission_key_id) DO NOTHING;

ALTER TABLE public.conselho_classe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conselho_classe_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view conselho_classe"
  ON public.conselho_classe
  FOR SELECT TO authenticated
  USING (public.has_permission('conselho_classe.read'));

CREATE POLICY "Permission can insert conselho_classe"
  ON public.conselho_classe
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('conselho_classe.write'));

CREATE POLICY "Permission can update conselho_classe"
  ON public.conselho_classe
  FOR UPDATE TO authenticated
  USING (public.has_permission('conselho_classe.write'))
  WITH CHECK (public.has_permission('conselho_classe.write'));

CREATE POLICY "Permission can delete conselho_classe"
  ON public.conselho_classe
  FOR DELETE TO authenticated
  USING (public.has_permission('conselho_classe.write'));

CREATE POLICY "Permission can view conselho_classe_registros"
  ON public.conselho_classe_registros
  FOR SELECT TO authenticated
  USING (public.has_permission('conselho_classe.read'));

CREATE POLICY "Permission can insert conselho_classe_registros"
  ON public.conselho_classe_registros
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('conselho_classe.write'));

CREATE POLICY "Permission can update conselho_classe_registros"
  ON public.conselho_classe_registros
  FOR UPDATE TO authenticated
  USING (public.has_permission('conselho_classe.write'))
  WITH CHECK (public.has_permission('conselho_classe.write'));

CREATE POLICY "Permission can delete conselho_classe_registros"
  ON public.conselho_classe_registros
  FOR DELETE TO authenticated
  USING (public.has_permission('conselho_classe.write'));

CREATE OR REPLACE FUNCTION public.audit_conselho_classe_tables()
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
    jsonb_build_object('source', 'p2_3')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_conselho_classe ON public.conselho_classe;
CREATE TRIGGER trg_audit_conselho_classe
  AFTER INSERT OR UPDATE OR DELETE ON public.conselho_classe
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_conselho_classe_tables();

DROP TRIGGER IF EXISTS trg_audit_conselho_classe_registros ON public.conselho_classe_registros;
CREATE TRIGGER trg_audit_conselho_classe_registros
  AFTER INSERT OR UPDATE OR DELETE ON public.conselho_classe_registros
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_conselho_classe_tables();

CREATE OR REPLACE FUNCTION public.notify_conselho_classe_finalizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'finalizado' THEN
    v_msg := format('Conselho de classe finalizado (%s)', NEW.periodo);
    PERFORM public.create_internal_notification('gestor', v_msg, NULL, 'conselho_classe', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_conselho_classe_finalizado ON public.conselho_classe;
CREATE TRIGGER trg_notify_conselho_classe_finalizado
  AFTER UPDATE ON public.conselho_classe
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_conselho_classe_finalizado();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conselho_classe TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conselho_classe_registros TO authenticated;
