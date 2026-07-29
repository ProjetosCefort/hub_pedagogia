import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GmailIntegrationStatus {
  provider: string;
  sender_email: string;
  scope: string | null;
  last_connected_at: string | null;
  access_token_expires_at: string | null;
}

export function GmailIntegrationCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [integration, setIntegration] = useState<GmailIntegrationStatus | null>(null);

  useEffect(() => {
    void fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/gmail-connection-status`,
        {
          headers: {
            apikey:
              import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
              import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível consultar a integração.");
      }

      setIntegration(data.integration || null);
    } catch (error: any) {
      toast({
        title: "Erro ao consultar Gmail",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke("gmail-oauth-init", {
        body: { return_to: "/configuracoes" },
      });

      if (error || !data?.success || !data?.authorization_url) {
        throw new Error(error?.message || data?.error || "Não foi possível iniciar a conexão.");
      }

      window.location.href = data.authorization_url;
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar OAuth",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Envio por Gmail
            </CardTitle>
            <CardDescription>
              Autorize a conta `hub@cefort.org.br` para que as edge functions enviem e-mails pelo Gmail.
            </CardDescription>
          </div>
          <Badge variant={integration ? "default" : "outline"}>
            {integration ? "Conectado" : "Não conectado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando status da integração...
          </div>
        ) : integration ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Conta conectada: {integration.sender_email}</p>
            {integration.last_connected_at && (
              <p className="text-muted-foreground">
                Última conexão: {new Date(integration.last_connected_at).toLocaleString("pt-BR")}
              </p>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              O refresh token fica armazenado apenas no backend do Supabase.
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ainda não há uma conta Google autorizada para envio. Conecte a conta institucional antes de usar e-mails automáticos.
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecionando...
              </>
            ) : integration ? "Reconectar Gmail" : "Conectar Gmail"}
          </Button>
          <Button variant="outline" onClick={() => void fetchStatus()} disabled={loading}>
            Atualizar status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
