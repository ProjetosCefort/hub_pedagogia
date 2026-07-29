-- Atualizar status da tabela de inscrições para incluir novos status
ALTER TABLE public.inscricoes_jovens_aprendizes 
DROP CONSTRAINT IF EXISTS inscricoes_jovens_aprendizes_status_check;

ALTER TABLE public.inscricoes_jovens_aprendizes 
ADD CONSTRAINT inscricoes_jovens_aprendizes_status_check 
CHECK (status IN ('draft', 'completed', 'talent_bank', 'under_analysis', 'approved', 'active_apprentice'));

-- Adicionar campos de gestão interna
ALTER TABLE public.inscricoes_jovens_aprendizes
ADD COLUMN IF NOT EXISTS notas_internas TEXT,
ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS jovem_id UUID REFERENCES public.jovens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS data_contrato TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id),
ADD COLUMN IF NOT EXISTS turma_id UUID REFERENCES public.turmas(id);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_status_gestao ON public.inscricoes_jovens_aprendizes(status) WHERE status IN ('draft', 'completed', 'talent_bank', 'under_analysis');
CREATE INDEX IF NOT EXISTS idx_inscricoes_aprovados ON public.inscricoes_jovens_aprendizes(status) WHERE status IN ('approved', 'active_apprentice');
CREATE INDEX IF NOT EXISTS idx_inscricoes_jovem_id ON public.inscricoes_jovens_aprendizes(jovem_id) WHERE jovem_id IS NOT NULL;

-- Função para calcular percentual de preenchimento
CREATE OR REPLACE FUNCTION public.calculate_inscricao_completion(inscricao public.inscricoes_jovens_aprendizes)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_fields INTEGER := 0;
  filled_fields INTEGER := 0;
BEGIN
  -- Step 1 fields (peso: 40%)
  total_fields := total_fields + 10;
  IF inscricao.cpf IS NOT NULL AND inscricao.cpf != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.email IS NOT NULL AND inscricao.email != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.nome_completo IS NOT NULL AND inscricao.nome_completo != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.data_nascimento IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.sexo IS NOT NULL AND inscricao.sexo != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.raca IS NOT NULL AND inscricao.raca != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.contato_1 IS NOT NULL AND inscricao.contato_1 != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.cep IS NOT NULL AND inscricao.cep != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.logradouro IS NOT NULL AND inscricao.logradouro != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.numero IS NOT NULL AND inscricao.numero != '' THEN filled_fields := filled_fields + 1; END IF;
  
  -- Step 2 fields (peso: 30%)
  total_fields := total_fields + 5;
  IF inscricao.pis_pasep IS NOT NULL AND inscricao.pis_pasep != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.tem_ctps_digital IS NOT NULL OR (inscricao.numero_ctps IS NOT NULL AND inscricao.numero_ctps != '') THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.unidade_preferencia IS NOT NULL AND inscricao.unidade_preferencia != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.tamanho_uniforme IS NOT NULL AND inscricao.tamanho_uniforme != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.tamanho_calcado IS NOT NULL AND inscricao.tamanho_calcado != '' THEN filled_fields := filled_fields + 1; END IF;
  
  -- Step 3 fields (peso: 30%)
  total_fields := total_fields + 5;
  IF inscricao.renda_familiar IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.quantidade_membros IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.tipo_moradia IS NOT NULL AND inscricao.tipo_moradia != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.situacao_moradia IS NOT NULL AND inscricao.situacao_moradia != '' THEN filled_fields := filled_fields + 1; END IF;
  IF inscricao.observacoes IS NOT NULL AND inscricao.observacoes != '' THEN filled_fields := filled_fields + 1; END IF;
  
  RETURN ROUND((filled_fields::DECIMAL / total_fields) * 100);
END;
$$;

-- Função para migrar inscrição aprovada para tabela jovens
CREATE OR REPLACE FUNCTION public.migrate_inscricao_to_jovem(inscricao_id UUID, empresa_id_param UUID DEFAULT NULL, turma_id_param UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inscricao_record public.inscricoes_jovens_aprendizes;
  novo_jovem_id UUID;
BEGIN
  -- Buscar inscrição
  SELECT * INTO inscricao_record
  FROM public.inscricoes_jovens_aprendizes
  WHERE id = inscricao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada';
  END IF;
  
  -- Verificar se já existe jovem vinculado
  IF inscricao_record.jovem_id IS NOT NULL THEN
    RETURN inscricao_record.jovem_id;
  END IF;
  
  -- Criar registro na tabela jovens
  INSERT INTO public.jovens (
    nome_completo,
    data_nascimento,
    cpf,
    rg,
    sexo,
    email,
    telefone,
    celular,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    responsavel_nome,
    responsavel_telefone,
    responsavel_parentesco,
    empresa_id,
    turma_id,
    status,
    data_admissao,
    observacoes,
    created_by
  ) VALUES (
    inscricao_record.nome_completo,
    inscricao_record.data_nascimento,
    inscricao_record.cpf,
    inscricao_record.rg,
    inscricao_record.sexo,
    inscricao_record.email,
    inscricao_record.contato_2,
    inscricao_record.contato_1,
    inscricao_record.cep,
    inscricao_record.logradouro,
    inscricao_record.numero,
    inscricao_record.complemento,
    inscricao_record.bairro,
    inscricao_record.cidade,
    inscricao_record.estado,
    inscricao_record.responsavel_nome,
    inscricao_record.responsavel_telefone,
    inscricao_record.responsavel_parentesco,
    COALESCE(empresa_id_param, inscricao_record.empresa_id),
    COALESCE(turma_id_param, inscricao_record.turma_id),
    'ativo',
    COALESCE(inscricao_record.data_contrato::DATE, CURRENT_DATE),
    inscricao_record.observacoes,
    auth.uid()
  )
  RETURNING id INTO novo_jovem_id;
  
  -- Atualizar inscrição com jovem_id
  UPDATE public.inscricoes_jovens_aprendizes
  SET jovem_id = novo_jovem_id,
      status = 'active_apprentice',
      updated_at = now()
  WHERE id = inscricao_id;
  
  RETURN novo_jovem_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_inscricao_to_jovem(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_inscricao_completion(public.inscricoes_jovens_aprendizes) TO authenticated;

-- Atualizar status padrão quando completa step 3
CREATE OR REPLACE FUNCTION public.update_inscricao_status_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se completou step 3 e status é draft ou completed, muda para talent_bank
  IF NEW.step3_completed_at IS NOT NULL 
     AND OLD.step3_completed_at IS NULL 
     AND NEW.status IN ('draft', 'completed') THEN
    NEW.status := 'talent_bank';
    NEW.completed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_status_on_completion ON public.inscricoes_jovens_aprendizes;
CREATE TRIGGER trigger_update_status_on_completion
BEFORE UPDATE ON public.inscricoes_jovens_aprendizes
FOR EACH ROW
EXECUTE FUNCTION public.update_inscricao_status_on_completion();
