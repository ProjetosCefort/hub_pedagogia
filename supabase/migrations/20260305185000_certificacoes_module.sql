-- P2.2 - Módulo de certificações

CREATE TABLE IF NOT EXISTS public.certificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  orgao_emissor TEXT,
  data_emissao DATE,
  data_validade DATE,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'vencida', 'suspensa', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.certificacao_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificacao_id UUID NOT NULL REFERENCES public.certificacoes(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_certificacoes_tipo ON public.certificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_certificacoes_status ON public.certificacoes(status);
CREATE INDEX IF NOT EXISTS idx_certificacoes_validade ON public.certificacoes(data_validade);
CREATE INDEX IF NOT EXISTS idx_certificacao_anexos_certificacao_id ON public.certificacao_anexos(certificacao_id);

DROP TRIGGER IF EXISTS update_certificacoes_updated_at ON public.certificacoes;
CREATE TRIGGER update_certificacoes_updated_at
  BEFORE UPDATE ON public.certificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.permission_keys (chave, modulo, acao, descricao)
VALUES
  ('certificacoes.read', 'certificacoes', 'read', 'Visualizar certificações'),
  ('certificacoes.write', 'certificacoes', 'write', 'Gerenciar certificações')
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
        'certificacoes.read','certificacoes.write'
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
        'certificacoes.read'
      ];
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$;

WITH keys AS (
  SELECT id, chave FROM public.permission_keys WHERE chave IN ('certificacoes.read','certificacoes.write')
), targets AS (
  SELECT pg.id AS group_id, k.id AS permission_key_id
  FROM public.permission_groups pg
  JOIN keys k ON (
    (pg.nome = 'Admin Geral')
    OR (pg.nome = 'Gestão')
    OR (pg.nome = 'Serviço Social')
    OR (pg.nome = 'Pedagógico' AND k.chave = 'certificacoes.read')
  )
)
INSERT INTO public.permission_group_items (group_id, permission_key_id)
SELECT group_id, permission_key_id
FROM targets
ON CONFLICT (group_id, permission_key_id) DO NOTHING;

ALTER TABLE public.certificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificacao_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permission can view certificacoes"
  ON public.certificacoes
  FOR SELECT TO authenticated
  USING (public.has_permission('certificacoes.read'));

CREATE POLICY "Permission can insert certificacoes"
  ON public.certificacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('certificacoes.write'));

CREATE POLICY "Permission can update certificacoes"
  ON public.certificacoes
  FOR UPDATE TO authenticated
  USING (public.has_permission('certificacoes.write'))
  WITH CHECK (public.has_permission('certificacoes.write'));

CREATE POLICY "Permission can delete certificacoes"
  ON public.certificacoes
  FOR DELETE TO authenticated
  USING (public.has_permission('certificacoes.write'));

CREATE POLICY "Permission can view certificacao_anexos"
  ON public.certificacao_anexos
  FOR SELECT TO authenticated
  USING (public.has_permission('certificacoes.read'));

CREATE POLICY "Permission can insert certificacao_anexos"
  ON public.certificacao_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('certificacoes.write'));

CREATE POLICY "Permission can update certificacao_anexos"
  ON public.certificacao_anexos
  FOR UPDATE TO authenticated
  USING (public.has_permission('certificacoes.write'))
  WITH CHECK (public.has_permission('certificacoes.write'));

CREATE POLICY "Permission can delete certificacao_anexos"
  ON public.certificacao_anexos
  FOR DELETE TO authenticated
  USING (public.has_permission('certificacoes.write'));

CREATE OR REPLACE FUNCTION public.audit_certificacoes_tables()
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
    jsonb_build_object('source', 'p2_2')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_certificacoes ON public.certificacoes;
CREATE TRIGGER trg_audit_certificacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.certificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_certificacoes_tables();

DROP TRIGGER IF EXISTS trg_audit_certificacao_anexos ON public.certificacao_anexos;
CREATE TRIGGER trg_audit_certificacao_anexos
  AFTER INSERT OR UPDATE OR DELETE ON public.certificacao_anexos
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_certificacoes_tables();

CREATE OR REPLACE FUNCTION public.notify_certificacao_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_msg := format('Certificação %s alterada para status %s', NEW.titulo, NEW.status);
    PERFORM public.create_internal_notification('gestor', v_msg, NULL, 'certificacoes', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_certificacao_status_change ON public.certificacoes;
CREATE TRIGGER trg_notify_certificacao_status_change
  AFTER UPDATE ON public.certificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_certificacao_status_change();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificacao_anexos TO authenticated;
