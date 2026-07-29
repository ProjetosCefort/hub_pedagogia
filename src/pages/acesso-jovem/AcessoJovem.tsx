import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cleanCpf, formatCpf, isValidCpf } from "@/lib/formatters";
import { setPublicAccessJwt } from "@/integrations/supabase/publicAccessClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const FUNCTIONS_URL = SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/request-public-access";

const GENERIC_ERROR = "Dados inválidos. Verifique CPF e data de nascimento e tente novamente.";
const RATE_LIMIT_ERROR = "Por segurança, aguarde alguns minutos antes de tentar novamente.";
const THROTTLE_MS = 2000;

export default function AcessoJovem() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedTipo = new URLSearchParams(location.search).get("tipo");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [throttled, setThrottled] = useState(false);

  useEffect(() => {
    const msg = (location.state as { message?: string })?.message;
    if (msg) setError(msg);
  }, [location.state]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (throttled || loading) return;

      const cleanedCpf = cleanCpf(cpf);
      if (!cleanedCpf || !isValidCpf(cpf)) {
        setError(GENERIC_ERROR);
        return;
      }
      if (!birthDate.trim()) {
        setError(GENERIC_ERROR);
        return;
      }

      setError("");
      setLoading(true);
      setThrottled(true);
      setTimeout(() => setThrottled(false), THROTTLE_MS);

      try {
        const res = await fetch(FUNCTIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_PUBLIC_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}`,
          },
          body: JSON.stringify({ cpf: cleanedCpf, birth_date: birthDate.trim().slice(0, 10) }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 429) {
          setError(data.error || RATE_LIMIT_ERROR);
          return;
        }

        if (!res.ok || !data.success || !data.access_token) {
          setError(GENERIC_ERROR);
          return;
        }

        setPublicAccessJwt(data.access_token);
        navigate("/meu-registro", {
          replace: true,
          state: requestedTipo ? { tipoDocumento: requestedTipo } : undefined,
        });
      } catch {
        setError(GENERIC_ERROR);
      } finally {
        setLoading(false);
      }
    },
    [cpf, birthDate, loading, requestedTipo, throttled, navigate]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Acessar meu registro</CardTitle>
          <CardDescription>
            Informe seu CPF e data de nascimento para acessar seus dados. A sessão expira em cerca de 20 minutos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acesso-cpf">CPF</Label>
              <Input
                id="acesso-cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                maxLength={14}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acesso-birth">Data de nascimento</Label>
              <Input
                id="acesso-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || throttled}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                "Acessar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
