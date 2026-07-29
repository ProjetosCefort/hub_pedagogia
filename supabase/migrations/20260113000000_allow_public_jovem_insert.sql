-- Permite que usuários não autenticados possam inserir jovens (cadastro público)
-- Mas não permite leitura ou atualização sem autenticação

DROP POLICY IF EXISTS "Public can insert jovens" ON public.jovens;

CREATE POLICY "Public can insert jovens" ON public.jovens 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Função para verificar se CPF existe (sem expor dados sensíveis)
CREATE OR REPLACE FUNCTION public.check_cpf_exists(_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.jovens
    WHERE cpf = _cpf
  );
END;
$$;

-- Permite que usuários anônimos possam usar a função de verificação de CPF
GRANT EXECUTE ON FUNCTION public.check_cpf_exists(TEXT) TO anon;

