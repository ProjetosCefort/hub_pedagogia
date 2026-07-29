-- Permissoes especificas para historicos sensiveis por setor.

INSERT INTO public.permission_keys (chave, modulo, acao, descricao, ativo)
VALUES
  (
    'intervencoes_psicossocial.read',
    'psicossocial',
    'visualizar',
    'Visualizar historico de intervencoes psicossociais',
    TRUE
  ),
  (
    'intervencoes_psicossocial.write',
    'psicossocial',
    'gerenciar',
    'Gerenciar intervencoes psicossociais',
    TRUE
  ),
  (
    'atendimentos_servico_social.read',
    'servico_social',
    'visualizar',
    'Visualizar historico de atendimentos do Servico Social',
    TRUE
  ),  
  (
    'atendimentos_servico_social.write',
    'servico_social',
    'gerenciar',
    'Gerenciar atendimentos do Servico Social',
    TRUE
  )
ON CONFLICT (chave) DO UPDATE
SET
  modulo = EXCLUDED.modulo,
  acao = EXCLUDED.acao,
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

UPDATE public.permission_keys
SET
  ativo = FALSE,
  descricao = 'Permissao legada substituida por permissoes especificas de historico por setor'
WHERE chave IN ('intervencoes.read', 'intervencoes.write');

WITH keys AS (
  SELECT id, chave
  FROM public.permission_keys
  WHERE chave IN (
    'intervencoes_psicossocial.read',
    'intervencoes_psicossocial.write',
    'atendimentos_servico_social.read',
    'atendimentos_servico_social.write'
  )
),
map AS (
  SELECT pg.id AS group_id, k.id AS permission_key_id
  FROM public.permission_groups pg
  JOIN keys k ON (
    pg.nome IN ('Admin Geral', 'Gestao', 'Gestão')
    OR (
      pg.nome = 'Psicossocial'
      AND k.chave IN (
        'intervencoes_psicossocial.read',
        'intervencoes_psicossocial.write',
        'atendimentos_servico_social.read'
      )
    )
    OR (
      pg.nome = 'Serviço Social'
      AND k.chave IN (
        'atendimentos_servico_social.read',
        'atendimentos_servico_social.write',
        'intervencoes_psicossocial.read'
      )
    )
  )
)
INSERT INTO public.permission_group_items (group_id, permission_key_id)
SELECT group_id, permission_key_id
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
        'agenda.read','agenda.write',
        'intervencoes_psicossocial.read','intervencoes_psicossocial.write',
        'atendimentos_servico_social.read','atendimentos_servico_social.write',
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
        'agenda.read','agenda.write',
        'intervencoes_psicossocial.read','intervencoes_psicossocial.write',
        'atendimentos_servico_social.read',
        'menu.setor.psicossocial',
        'projetos.read'
      ];
    WHEN 'analista_social' THEN
      RETURN ARRAY[
        'dashboard.read','jovens.read','inscricoes.read','inscricoes.status.manage',
        'agenda.read','agenda.write',
        'intervencoes_psicossocial.read',
        'atendimentos_servico_social.read','atendimentos_servico_social.write',
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

DROP POLICY IF EXISTS "Users with role can view intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Users with role can insert intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Users with role can update intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can view intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can insert intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can update intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can delete intervencoes" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can view intervencoes by setor" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can insert intervencoes by setor" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can update intervencoes by setor" ON public.intervencoes;
DROP POLICY IF EXISTS "Permission can delete intervencoes by setor" ON public.intervencoes;

CREATE POLICY "Permission can view intervencoes by setor"
  ON public.intervencoes
  FOR SELECT
  TO authenticated
  USING (
    (setor = 'psicossocial' AND public.has_permission('intervencoes_psicossocial.read'))
    OR (setor = 'servico_social' AND public.has_permission('atendimentos_servico_social.read'))
  );

CREATE POLICY "Permission can insert intervencoes by setor"
  ON public.intervencoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (setor = 'psicossocial' AND public.has_permission('intervencoes_psicossocial.write'))
    OR (setor = 'servico_social' AND public.has_permission('atendimentos_servico_social.write'))
  );

CREATE POLICY "Permission can update intervencoes by setor"
  ON public.intervencoes
  FOR UPDATE
  TO authenticated
  USING (
    (setor = 'psicossocial' AND public.has_permission('intervencoes_psicossocial.write'))
    OR (setor = 'servico_social' AND public.has_permission('atendimentos_servico_social.write'))
  )
  WITH CHECK (
    (setor = 'psicossocial' AND public.has_permission('intervencoes_psicossocial.write'))
    OR (setor = 'servico_social' AND public.has_permission('atendimentos_servico_social.write'))
  );

CREATE POLICY "Permission can delete intervencoes by setor"
  ON public.intervencoes
  FOR DELETE
  TO authenticated
  USING (
    (setor = 'psicossocial' AND public.has_permission('intervencoes_psicossocial.write'))
    OR (setor = 'servico_social' AND public.has_permission('atendimentos_servico_social.write'))
  );
