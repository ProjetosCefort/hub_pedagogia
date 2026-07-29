CREATE TABLE IF NOT EXISTS public.public_access_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('ip', 'cpf_ip')),
  key_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS idx_public_access_attempts_blocked_until
  ON public.public_access_attempts(blocked_until)
  WHERE blocked_until IS NOT NULL;

ALTER TABLE public.public_access_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.public_access_attempts FROM anon;
REVOKE ALL ON public.public_access_attempts FROM authenticated;

COMMENT ON TABLE public.public_access_attempts IS
  'Controle antifraude do acesso publico do jovem. Armazena apenas hashes de CPF/IP para limitar tentativas abusivas.';
