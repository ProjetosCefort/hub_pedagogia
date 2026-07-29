import { useState } from "react";
import { Loader2, Network, Pencil } from "lucide-react";
import { useRegistrosSociais } from "@/hooks/useConfiguracoes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SocialAssistanceNetworkManagerProps {
  inscricaoId: string | null;
  selectedIds: string[];
  canEdit: boolean;
  onSaved: (selectedIds: string[]) => void;
}

export function SocialAssistanceNetworkManager({
  inscricaoId,
  selectedIds,
  canEdit,
  onSaved,
}: SocialAssistanceNetworkManagerProps) {
  const { toast } = useToast();
  const { data: records = [], isLoading } = useRegistrosSociais(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const selectedRecords = records.filter((record) => selectedIds.includes(record.id));

  function openEditor() {
    setDraftIds(selectedIds);
    setOpen(true);
  }

  function toggleRecord(recordId: string) {
    setDraftIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId],
    );
  }

  async function saveNetwork() {
    if (!inscricaoId) return;

    setSaving(true);
    const { error } = await supabase
      .from("inscricoes_jovens_aprendizes")
      .update({ registros_sociais_ids: draftIds })
      .eq("id", inscricaoId);
    setSaving(false);

    if (error) {
      toast({
        title: "Erro ao salvar rede socioassistencial",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    onSaved(draftIds);
    setOpen(false);
    toast({ title: "Rede socioassistencial atualizada com sucesso!" });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Network className="h-4 w-4" />
            Rede socioassistencial e intersetorial
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Registros e serviços em que o jovem está inserido.
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openEditor}
            disabled={!inscricaoId || isLoading}
            title={
              inscricaoId
                ? "Editar rede socioassistencial"
                : "Não há uma inscrição vinculada a este jovem"
            }
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar rede
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando registros sociais...</p>
      ) : selectedRecords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedRecords.map((record) => (
            <span key={record.id} className="rounded-md border bg-muted/40 px-2.5 py-1 text-sm">
              {record.sigla || record.nome}
            </span>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum registro ou serviço selecionado.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Rede socioassistencial e intersetorial</DialogTitle>
            <DialogDescription>
              Selecione os registros e serviços em que o jovem está inserido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border p-4">
            {records.map((record) => (
              <div key={record.id} className="flex items-start gap-2">
                <Checkbox
                  id={`prontuario-registro-${record.id}`}
                  checked={draftIds.includes(record.id)}
                  disabled={!record.ativo && !draftIds.includes(record.id)}
                  onCheckedChange={() => toggleRecord(record.id)}
                />
                <Label
                  htmlFor={`prontuario-registro-${record.id}`}
                  className="cursor-pointer text-sm font-normal leading-5"
                >
                  {record.sigla ? `${record.sigla} - ` : ""}
                  {record.nome}
                  {record.descricao && (
                    <span className="ml-1 text-muted-foreground">
                      ({record.descricao})
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveNetwork} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar rede
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
