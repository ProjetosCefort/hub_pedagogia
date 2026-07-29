CREATE TABLE IF NOT EXISTS public.integracoes_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('gmail')),
  sender_email TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_type TEXT,
  scope TEXT,
  access_token_expires_at TIMESTAMPTZ,
  connected_by UUID REFERENCES auth.users(id),
  last_connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integracoes_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manage integracoes_email"
  ON public.integracoes_email
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at_integracoes_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_integracoes_email ON public.integracoes_email;
CREATE TRIGGER trg_set_updated_at_integracoes_email
BEFORE UPDATE ON public.integracoes_email
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_integracoes_email();

COMMENT ON TABLE public.integracoes_email IS
  'Credenciais protegidas para integrações de envio de e-mail do sistema.';
