import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useInscricaoStatusHistory } from "@/hooks/useInscricaoStatusHistory";
import { supabase } from "@/integrations/supabase/client";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  completed: "Completo",
  talent_bank: "Banco de Talentos",
  under_analysis: "Em Análise",
  approved: "Aprovado",
  active_apprentice: "Aprendiz Ativo",
  rejected: "Rejeitado",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricaoId?: string;
  currentStatus?: string;
  onStatusUpdated?: () => Promise<void> | void;
}

export function InscricaoStatusHistoryDialog({
  open,
  onOpenChange,
  inscricaoId,
  currentStatus,
  onStatusUpdated,
}: Props) {
  const { toast } = useToast();
  const { history, reprovacoes, loading, error, refetch } =
    useInscricaoStatusHistory(inscricaoId, open);

  const [returnReason, setReturnReason] = useState("");
  const [returnObs, setReturnObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleReturnToTalentBank() {
    if (!inscricaoId) return;

    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc("change_inscricao_status", {
        p_inscricao_id: inscricaoId,
        p_new_status: "talent_bank",
        p_motivo: returnReason || "Retorno ao banco de talentos",
        p_observacao: returnObs || null,
        p_origem: "gestao",
      });

      if (rpcError) throw rpcError;

      toast({
        title: "Sucesso",
        description: "Inscrição retornada ao Banco de Talentos.",
      });

      setReturnReason("");
      setReturnObs("");
      await refetch();
      await onStatusUpdated?.();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível retornar a inscrição",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Status e Reprovações</DialogTitle>
          <DialogDescription>
            Histórico completo da inscrição com motivos e retornos ao Banco de Talentos.
          </DialogDescription>
        </DialogHeader>

        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transição registrada.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {STATUS_LABELS[item.previous_status || ""] || item.previous_status || "-"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">-&gt;</span>
                  <Badge>{STATUS_LABELS[item.new_status] || item.new_status}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {item.motivo ? <p className="text-sm"><strong>Motivo:</strong> {item.motivo}</p> : null}
                {item.observacao ? (
                  <p className="text-sm"><strong>Observação:</strong> {item.observacao}</p>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Histórico de Reprovações</h3>
          {reprovacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma reprovação registrada.</p>
          ) : (
            reprovacoes.map((item) => (
              <div key={item.id} className="rounded-md border p-3 space-y-2">
                <p className="text-sm"><strong>Motivo:</strong> {item.motivo}</p>
                {item.observacao ? (
                  <p className="text-sm"><strong>Observação:</strong> {item.observacao}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Reprovado em {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
                {item.retornada_ao_banco_em ? (
                  <p className="text-xs text-emerald-700">
                    Retornado ao Banco em {format(new Date(item.retornada_ao_banco_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>

        {currentStatus === "rejected" ? (
          <div className="rounded-md border p-3 space-y-3">
            <h3 className="text-sm font-semibold">Retornar ao Banco de Talentos</h3>
            <div className="space-y-1">
              <Label>Motivo do retorno</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Ex.: nova avaliação autorizada"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Textarea
                value={returnObs}
                onChange={(e) => setReturnObs(e.target.value)}
                placeholder="Detalhes adicionais (opcional)"
                rows={2}
              />
            </div>
            <Button onClick={handleReturnToTalentBank} disabled={submitting}>
              Retornar ao Banco
            </Button>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
