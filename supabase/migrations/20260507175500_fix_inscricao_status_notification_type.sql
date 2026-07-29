-- Corrige o tipo de entidade usado nas notificações internas de mudança
-- de status de inscrição para respeitar a constraint da tabela.

CREATE OR REPLACE FUNCTION public.notify_inscricao_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_msg TEXT;
  v_jovem_id UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.new_status NOT IN ('approved', 'rejected', 'talent_bank') THEN
    RETURN NEW;
  END IF;

  IF NEW.new_status = 'talent_bank' AND NEW.previous_status <> 'rejected' THEN
    RETURN NEW;
  END IF;

  SELECT i.nome_completo, i.jovem_id
  INTO v_nome, v_jovem_id
  FROM public.inscricoes_jovens_aprendizes i
  WHERE i.id = NEW.inscricao_id;

  IF NEW.new_status = 'approved' THEN
    v_msg := format('Inscrição aprovada: %s', COALESCE(v_nome, 'Sem nome'));
  ELSIF NEW.new_status = 'rejected' THEN
    v_msg := format(
      'Inscrição reprovada: %s. Motivo: %s',
      COALESCE(v_nome, 'Sem nome'),
      COALESCE(NEW.motivo, 'Não informado')
    );
  ELSE
    v_msg := format('Inscrição retornou ao Banco de Talentos: %s', COALESCE(v_nome, 'Sem nome'));
  END IF;

  PERFORM public.create_internal_notification(
    'gestor',
    v_msg,
    v_jovem_id,
    'status_change',
    NEW.inscricao_id
  );

  PERFORM public.create_internal_notification(
    'admin',
    v_msg,
    v_jovem_id,
    'status_change',
    NEW.inscricao_id
  );

  RETURN NEW;
END;
$$;
