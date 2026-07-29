-- =====================================================
-- ACESSO PÚBLICO SEGURO POR TOKEN TEMPORÁRIO (CPF + DATA NASCIMENTO)
-- Substitui políticas RLS inseguras (USING true).
-- Conformidade: LGPD, acesso apenas ao próprio registro.
-- =====================================================

-- ---------------------------------------------------------------------------
-- STEP 1: COLUNAS DE TOKEN E EXPIRAÇÃO
-- ---------------------------------------------------------------------------

-- jovens
ALTER TABLE public.jovens
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_access_request_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jovens_access_token
  ON public.jovens(access_token)
  WHERE access_token IS NOT NULL;

-- inscricoes_jovens_aprendizes
ALTER TABLE public.inscricoes_jovens_aprendizes
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_access_request_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inscricoes_access_token
  ON public.inscricoes_jovens_aprendizes(access_token)
  WHERE access_token IS NOT NULL;

-- ---------------------------------------------------------------------------
-- STEP 2: FUNÇÃO SEGURA (SECURITY DEFINER)
-- Valida CPF + data de nascimento; gera token; não revela se CPF existe.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_cpf_digits(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN regexp_replace(regexp_replace(COALESCE(trim(p_cpf), ''), '[^0-9]', '', 'g'), '^0+', '');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_access_token(p_cpf TEXT, p_birth_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf_normalized TEXT;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ := now() + interval '20 minutes';
  v_inscricao_id UUID;
  v_jovem_id UUID;
  v_rate_limit TIMESTAMPTZ;
BEGIN
  -- Normaliza CPF (apenas dígitos)
  v_cpf_normalized := public.normalize_cpf_digits(p_cpf);
  IF length(v_cpf_normalized) <> 11 THEN
    RETURN NULL; -- CPF inválido; mensagem genérica no cliente
  END IF;

  -- Rate limit: mesma inscrição/jovem não pode solicitar token em menos de 1 minuto
  -- Verifica em inscricoes
  SELECT id, last_access_request_at INTO v_inscricao_id, v_rate_limit
  FROM public.inscricoes_jovens_aprendizes
  WHERE regexp_replace(regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g'), '^0+', '') = v_cpf_normalized
    AND data_nascimento = p_birth_date
  LIMIT 1;
  IF v_inscricao_id IS NOT NULL THEN
    IF v_rate_limit IS NOT NULL AND v_rate_limit > now() - interval '1 minute' THEN
      RETURN NULL; -- throttling
    END IF;
    v_token := encode(gen_random_bytes(32), 'hex');
    UPDATE public.inscricoes_jovens_aprendizes
    SET access_token = v_token,
        access_token_expires_at = v_expires_at,
        last_access_request_at = now()
    WHERE id = v_inscricao_id;
    RETURN v_token;
  END IF;

  -- Verifica em jovens
  SELECT id, last_access_request_at INTO v_jovem_id, v_rate_limit
  FROM public.jovens
  WHERE regexp_replace(regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g'), '^0+', '') = v_cpf_normalized
    AND data_nascimento = p_birth_date
  LIMIT 1;
  IF v_jovem_id IS NOT NULL THEN
    IF v_rate_limit IS NOT NULL AND v_rate_limit > now() - interval '1 minute' THEN
      RETURN NULL;
    END IF;
    v_token := encode(gen_random_bytes(32), 'hex');
    UPDATE public.jovens
    SET access_token = v_token,
        access_token_expires_at = v_expires_at,
        last_access_request_at = now()
    WHERE id = v_jovem_id;
    RETURN v_token;
  END IF;

  -- Sem correspondência: não revelar (retorno genérico no cliente)
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.generate_access_token(TEXT, DATE) IS
  'Gera token temporário de acesso para jovem (CPF + data nascimento). Só retorna token se houver registro em inscricoes ou jovens. Não expõe se CPF existe.';

-- Apenas backend (service_role) ou staff autenticado podem chamar; anon NÃO
REVOKE EXECUTE ON FUNCTION public.generate_access_token(TEXT, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_access_token(TEXT, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_access_token(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_access_token(TEXT, DATE) TO service_role;

-- ---------------------------------------------------------------------------
-- STEP 3: REMOVER POLÍTICAS INSEGURAS (USING true) E CRIAR RLS SEGURO
-- ---------------------------------------------------------------------------

-- ---------- JOVENS ----------
DROP POLICY IF EXISTS "Public can insert jovens" ON public.jovens;
DROP POLICY IF EXISTS "Users with role can view jovens" ON public.jovens;
DROP POLICY IF EXISTS "Users with role can insert jovens" ON public.jovens;
DROP POLICY IF EXISTS "Users with role can update jovens" ON public.jovens;

-- Staff autenticado: acesso total
CREATE POLICY "Staff full access jovens"
  ON public.jovens FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

-- Acesso por token temporário (JWT claim access_token): apenas leitura/atualização do próprio registro
CREATE POLICY "Public token select jovens"
  ON public.jovens FOR SELECT TO anon, authenticated
  USING (
    (auth.jwt() ->> 'access_token') IS NOT NULL
    AND access_token IS NOT NULL
    AND access_token = (auth.jwt() ->> 'access_token')
    AND access_token_expires_at > now()
  );

CREATE POLICY "Public token update jovens"
  ON public.jovens FOR UPDATE TO anon, authenticated
  USING (
    (auth.jwt() ->> 'access_token') IS NOT NULL
    AND access_token IS NOT NULL
    AND access_token = (auth.jwt() ->> 'access_token')
    AND access_token_expires_at > now()
  )
  WITH CHECK (
    (auth.jwt() ->> 'access_token') IS NOT NULL
    AND access_token = (auth.jwt() ->> 'access_token')
    AND access_token_expires_at > now()
  );

-- INSERT jovens: apenas staff (não permitir insert público)
-- (não criamos política de INSERT para anon)

-- ---------- INSCRIÇÕES ----------
DROP POLICY IF EXISTS "Public can insert inscricoes" ON public.inscricoes_jovens_aprendizes;
DROP POLICY IF EXISTS "Public can read own inscricao" ON public.inscricoes_jovens_aprendizes;
DROP POLICY IF EXISTS "Public can update own inscricao" ON public.inscricoes_jovens_aprendizes;
DROP POLICY IF EXISTS "Authenticated users can manage inscricoes" ON public.inscricoes_jovens_aprendizes;

-- Staff: acesso total
CREATE POLICY "Staff full access inscricoes"
  ON public.inscricoes_jovens_aprendizes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid()))
  WITH CHECK (public.has_any_role(auth.uid()));

-- Inserção pública: apenas novas inscrições (anon pode inserir; aplicação garante que não sobrescreve outros)
CREATE POLICY "Public insert inscricoes"
  ON public.inscricoes_jovens_aprendizes FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Leitura/atualização por token temporário
CREATE POLICY "Public token select inscricoes"
  ON public.inscricoes_jovens_aprendizes FOR SELECT TO anon, authenticated
  USING (
    (auth.jwt() ->> 'access_token') IS NOT NULL
    AND access_token IS NOT NULL
    AND access_token = (auth.jwt() ->> 'access_token')
    AND access_token_expires_at > now()
  );

CREATE POLICY "Public token update inscricoes"
  ON public.inscricoes_jovens_aprendizes FOR UPDATE TO anon, authenticated
  USING (
    (auth.jwt() ->> 'access_token') IS NOT NULL
    AND access_token IS NOT NULL
    AND access_token = (auth.jwt() ->> 'access_token')
    AND access_token_expires_at > now()
  )
  WITH CHECK (
    (auth.jwt() ->> 'access_token') IS NOT NULL
    AND access_token = (auth.jwt() ->> 'access_token')
    AND access_token_expires_at > now()
  );
