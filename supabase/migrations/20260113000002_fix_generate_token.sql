-- Migration para garantir que a função generate_edit_token existe
-- Se a extensão pgcrypto não estiver habilitada, execute manualmente no Supabase Dashboard:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remove função se existir para recriar
DROP FUNCTION IF EXISTS public.generate_edit_token();

-- Função para gerar token único usando pgcrypto
CREATE OR REPLACE FUNCTION public.generate_edit_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Tenta usar gen_random_bytes se pgcrypto estiver disponível
  BEGIN
    token := encode(gen_random_bytes(32), 'base64');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: usa random() se pgcrypto não estiver disponível
    token := encode(
      (SELECT string_agg(chr(floor(random() * 256)::int), '') 
       FROM generate_series(1, 32)), 
      'base64'
    );
  END;
  
  RETURN replace(replace(token, '/', '_'), '+', '-');
END;
$$;

-- Garante permissões
GRANT EXECUTE ON FUNCTION public.generate_edit_token() TO anon;
GRANT EXECUTE ON FUNCTION public.generate_edit_token() TO authenticated;
