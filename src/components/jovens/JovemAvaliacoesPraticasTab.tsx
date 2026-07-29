import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Factory, SquareArrowOutUpRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type PracticalStatus =
  | "solicitada"
  | "respondida"
  | "validada"
  | "atrasada"
  | "cancelada";

interface PracticalEvaluation {
  id: string;
  status: PracticalStatus;
  data_solicitacao: string;
  data_resposta: string | null;
  data_validacao: string | null;
  proxima_data_envio: string | null;
  avaliador_nome: string | null;
  avaliador_email: string | null;
  parecer_empresa: string | null;
  parecer_interno: string | null;
  observacoes: string | null;
  empresa?: { nome_fantasia: string | null; razao_social: string | null } | null;
}

interface JovemAvaliacoesPraticasTabProps {
  jovemId: string;
}

const STATUS_OPTIONS: Array<{ value: PracticalStatus; label: string }> = [
  { value: "solicitada", label: "Solicitada" },
  { value: "respondida", label: "Respondida" },
  { value: "validada", label: "Validada" },
  { value: "atrasada", label: "Atrasada" },
  { value: "cancelada", label: "Cancelada" },
];

function resolvePracticalStatus(item: Pick<PracticalEvaluation, "status" | "proxima_data_envio" | "data_validacao" | "data_resposta" | "parecer_empresa">): PracticalStatus {
  if (item.status === "cancelada") return "cancelada";
  if (item.data_validacao) return "validada";
  if (item.proxima_data_envio && item.proxima_data_envio < new Date().toISOString().slice(0, 10)) {
    return "atrasada";
  }
  if (item.data_resposta || item.parecer_empresa?.trim()) return "respondida";
  return "solicitada";
}

export function JovemAvaliacoesPraticasTab({
  jovemId,
}: JovemAvaliacoesPraticasTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PracticalStatus | "all">("all");
  const [items, setItems] = useState<PracticalEvaluation[]>([]);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [internalDrafts, setInternalDrafts] = useState<Record<string, string>>({});
  const [nextDateDrafts, setNextDateDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchItems();
  }, [jovemId]);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("avaliacoes_praticas" as any)
        .select(
          "id, status, data_solicitacao, data_resposta, data_validacao, proxima_data_envio, avaliador_nome, avaliador_email, parecer_empresa, parecer_interno, observacoes, empresa:empresas(nome_fantasia, razao_social)",
        )
        .eq("jovem_id", jovemId)
        .order("data_solicitacao", { ascending: false });

      if (error) throw error;
      setItems((data || []) as PracticalEvaluation[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar avaliacoes praticas",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterResponse(item: PracticalEvaluation) {
    const parecerEmpresa = responseDrafts[item.id]?.trim();
    if (!parecerEmpresa) {
      toast({
        title: "Informe a resposta da empresa",
        description: "O parecer da empresa nao pode ficar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(item.id);
      const { error } = await supabase
        .from("avaliacoes_praticas" as any)
        .update({
          parecer_empresa: parecerEmpresa,
          status: "respondida",
          data_resposta: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      toast({ title: "Resposta da empresa registrada" });
      setResponseDrafts((prev) => ({ ...prev, [item.id]: "" }));
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar resposta",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleValidate(item: PracticalEvaluation) {
    const parecerInterno = internalDrafts[item.id]?.trim();
    const proximaDataEnvio = nextDateDrafts[item.id]?.trim() || null;

    if (!parecerInterno) {
      toast({
        title: "Informe o parecer interno",
        description: "A validacao interna nao pode ficar vazia.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingId(item.id);
      const { error } = await supabase
        .from("avaliacoes_praticas" as any)
        .update({
          parecer_interno: parecerInterno,
          proxima_data_envio: proximaDataEnvio,
          status: "validada",
          data_validacao: new Date().toISOString(),
          responsavel_id: user?.id || null,
        })
        .eq("id", item.id);

      if (error) throw error;
      toast({ title: "Avaliacao validada" });
      setInternalDrafts((prev) => ({ ...prev, [item.id]: "" }));
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Erro ao validar avaliacao",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => resolvePracticalStatus(item) === statusFilter);
  }, [items, statusFilter]);

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Avaliacoes praticas
          </CardTitle>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PracticalStatus | "all")}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link to="/avaliacoes-praticas">
                <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                Abrir modulo completo
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">
            Carregando avaliacoes praticas...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            Nenhuma avaliacao pratica registrada para este jovem.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-4 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">
                        {item.empresa?.nome_fantasia || item.empresa?.razao_social || "Empresa nao informada"}
                      </p>
                      <Badge variant={resolvePracticalStatus(item) === "atrasada" ? "destructive" : "secondary"}>
                        {STATUS_OPTIONS.find((status) => status.value === resolvePracticalStatus(item))?.label || resolvePracticalStatus(item)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                      <Factory className="h-4 w-4" />
                      Avaliador: {item.avaliador_nome || "Nao informado"}
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Solicitada em{" "}
                        {format(new Date(item.data_solicitacao), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                      {item.proxima_data_envio && (
                        <p>
                          Proximo envio:{" "}
                          {format(new Date(item.proxima_data_envio), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{item.avaliador_email || "Sem e-mail"}</p>
                    {item.data_validacao && (
                      <p>
                        Validada em{" "}
                        {format(new Date(item.data_validacao), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Resposta da empresa</Label>
                    {item.parecer_empresa ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                        {item.parecer_empresa}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Ainda sem resposta registrada.
                      </p>
                    )}
                    <Textarea
                      rows={4}
                      value={responseDrafts[item.id] ?? ""}
                      onChange={(event) =>
                        setResponseDrafts((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Registrar a devolutiva recebida da empresa..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegisterResponse(item)}
                      disabled={updatingId === item.id}
                    >
                      Registrar resposta
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Validacao interna</Label>
                    {item.parecer_interno ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                        {item.parecer_interno}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Ainda sem validacao registrada.
                      </p>
                    )}
                    <Textarea
                      rows={4}
                      value={internalDrafts[item.id] ?? ""}
                      onChange={(event) =>
                        setInternalDrafts((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Registrar parecer do acompanhamento..."
                    />
                    <div>
                      <Label className="mb-2 block">Proxima data de envio</Label>
                      <Input
                        type="date"
                        value={nextDateDrafts[item.id] ?? item.proxima_data_envio ?? ""}
                        onChange={(event) =>
                          setNextDateDrafts((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleValidate(item)}
                      disabled={updatingId === item.id}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Validar avaliacao
                    </Button>
                  </div>
                </div>

                {item.observacoes && (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.observacoes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
