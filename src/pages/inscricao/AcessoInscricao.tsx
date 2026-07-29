import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cleanCpf, formatCpf, isValidCpf, isValidEmail } from "@/lib/formatters";
import { sendAccessRecoveryEmail } from "@/lib/email";
import { supabase } from "@/integrations/supabase/client";

export default function AcessoInscricao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleAccess() {
    const cleanedCpf = cleanCpf(cpf);
    setSuccessMessage("");
    
    if (!cleanedCpf || !isValidCpf(cpf)) {
      toast({
        title: "CPF inválido",
        variant: "destructive",
      });
      return;
    }

    if (!email || !isValidEmail(email)) {
      toast({
        title: "Email inválido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Verifica se existe inscrição com CPF e email
      const { data, error } = await supabase
        .from("inscricoes_jovens_aprendizes")
        .select("id, edit_token")
        .eq("cpf", cleanedCpf)
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (data && data.edit_token) {
        const emailSent = await sendAccessRecoveryEmail(email, data.edit_token);
        if (emailSent) {
          setSuccessMessage("Enviamos um link seguro para o seu e-mail. Verifique a caixa de entrada e o spam.");
        } else {
          toast({
            title: "Não foi possível enviar o e-mail",
            description: "Tente novamente em alguns minutos ou contate nossa equipe.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Cadastro não encontrado",
          description: "Não encontramos uma inscrição com estes dados. Verifique o CPF e email informados.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao acessar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Acessar Meu Cadastro</h1>
          <p className="text-muted-foreground">
            Informe seu CPF e e-mail para acessar ou continuar sua inscrição
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesso ao Cadastro</CardTitle>
            <CardDescription>
              Use os dados informados durante o cadastro inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formatCpf(cpf)}
                onChange={(e) => setCpf(e.target.value)}
                maxLength={14}
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                Enviaremos um link seguro para o e-mail informado. Verifique também a caixa de spam.
              </AlertDescription>
            </Alert>

            {successMessage && (
              <Alert>
                <AlertDescription className="text-sm text-green-700">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAccess}
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Acessar Cadastro
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => navigate("/inscricao")}
                className="text-sm"
              >
                Ou faça uma nova inscrição
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
