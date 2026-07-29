import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [message, setMessage] = useState("Conectando conta Google...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      toast({
        title: "Conexão cancelada",
        description: "A autorização no Google não foi concluída.",
        variant: "destructive",
      });
      navigate("/configuracoes", { replace: true });
      return;
    }

    if (!code || !state) {
      toast({
        title: "Callback inválido",
        description: "Não foi possível concluir a conexão com o Google.",
        variant: "destructive",
      });
      navigate("/configuracoes", { replace: true });
      return;
    }

    void (async () => {
      const { data, error: invokeError } = await supabase.functions.invoke("gmail-oauth-callback", {
        body: { code, state },
      });

      if (invokeError || !data?.success) {
        toast({
          title: "Erro ao conectar Gmail",
          description: invokeError?.message || data?.error || "Tente novamente.",
          variant: "destructive",
        });
        navigate("/configuracoes", { replace: true });
        return;
      }

      setMessage(`Conta ${data.sender_email} conectada com sucesso.`);
      toast({
        title: "Gmail conectado",
        description: `A conta ${data.sender_email} está pronta para envio.`,
      });
      navigate(data.return_to || "/configuracoes", { replace: true });
    })();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Integração com Google</CardTitle>
          <CardDescription>Concluindo autorização para envio de e-mails pelo Gmail.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{message}</span>
        </CardContent>
      </Card>
    </div>
  );
}
