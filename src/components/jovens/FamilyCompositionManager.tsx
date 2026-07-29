import { useState } from "react";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FamilyMember {
  nome: string;
  parentesco: string;
  idade: string;
  escolaridade: string;
  renda: string;
  ocupacao: string;
}

interface FamilyCompositionManagerProps {
  inscricaoId: string | null;
  value: unknown;
  canEdit: boolean;
  onSaved: (value: FamilyMember[]) => void;
}

const emptyMember = (): FamilyMember => ({
  nome: "",
  parentesco: "",
  idade: "",
  escolaridade: "",
  renda: "",
  ocupacao: "",
});

function normalizeComposition(value: unknown): FamilyMember[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const member = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      nome: String(member.nome ?? ""),
      parentesco: String(member.parentesco ?? ""),
      idade: String(member.idade ?? ""),
      escolaridade: String(member.escolaridade ?? ""),
      renda: String(member.renda ?? ""),
      ocupacao: String(member.ocupacao ?? ""),
    };
  });
}

export function FamilyCompositionManager({
  inscricaoId,
  value,
  canEdit,
  onSaved,
}: FamilyCompositionManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const savedMembers = normalizeComposition(value);

  function openEditor() {
    setMembers(savedMembers);
    setOpen(true);
  }

  function updateMember(index: number, field: keyof FamilyMember, value: string) {
    setMembers((current) =>
      current.map((member, itemIndex) =>
        itemIndex === index ? { ...member, [field]: value } : member,
      ),
    );
  }

  async function saveComposition() {
    if (!inscricaoId) return;

    setSaving(true);
    const composition = members.map((member) => ({
      nome: member.nome.trim(),
      parentesco: member.parentesco.trim(),
      idade: member.idade,
      escolaridade: member.escolaridade.trim(),
      renda: member.renda,
      ocupacao: member.ocupacao.trim(),
    }));

    const { error } = await supabase
      .from("inscricoes_jovens_aprendizes")
      .update({ composicao_familiar: composition })
      .eq("id", inscricaoId);

    setSaving(false);
    if (error) {
      toast({
        title: "Erro ao salvar composição familiar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    onSaved(composition);
    setOpen(false);
    toast({ title: "Composição familiar atualizada com sucesso!" });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" />
          Composição familiar
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openEditor}
            disabled={!inscricaoId}
            title={
              inscricaoId
                ? "Editar integrantes da composição familiar"
                : "Não há uma inscrição vinculada a este jovem"
            }
          >
            <Users className="h-4 w-4 mr-2" />
            Integrantes
          </Button>
        )}
      </div>

      {savedMembers.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum integrante cadastrado.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {savedMembers.map((member, index) => (
            <div
              key={`${member.nome}-${index}`}
              className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] sm:gap-4"
            >
              <span className="font-medium">{member.nome || "Nome não informado"}</span>
              <span className="text-muted-foreground">
                {member.parentesco || "Parentesco não informado"}
              </span>
              <span className="text-muted-foreground">
                {member.idade ? `${member.idade} anos` : "Idade não informada"}
              </span>
              <span className="text-muted-foreground">
                {member.ocupacao || member.escolaridade || "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Integrantes da composição familiar</DialogTitle>
            <DialogDescription>
              Atualize as informações dos familiares vinculados ao cadastro do jovem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {members.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Nenhum integrante cadastrado.
              </p>
            ) : (
              members.map((member, index) => (
                <div key={index} className="space-y-3 border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Integrante {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setMembers((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label={`Remover integrante ${index + 1}`}
                      title="Remover integrante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <MemberInput
                      id={`member-name-${index}`}
                      label="Nome"
                      value={member.nome}
                      className="lg:col-span-2"
                      onChange={(value) => updateMember(index, "nome", value)}
                    />
                    <MemberInput
                      id={`member-relationship-${index}`}
                      label="Parentesco"
                      value={member.parentesco}
                      onChange={(value) => updateMember(index, "parentesco", value)}
                    />
                    <MemberInput
                      id={`member-age-${index}`}
                      label="Idade"
                      type="number"
                      min="0"
                      value={member.idade}
                      onChange={(value) => updateMember(index, "idade", value)}
                    />
                    <MemberInput
                      id={`member-education-${index}`}
                      label="Escolaridade"
                      value={member.escolaridade}
                      onChange={(value) => updateMember(index, "escolaridade", value)}
                    />
                    <MemberInput
                      id={`member-income-${index}`}
                      label="Renda (R$)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={member.renda}
                      onChange={(value) => updateMember(index, "renda", value)}
                    />
                    <MemberInput
                      id={`member-occupation-${index}`}
                      label="Ocupação"
                      value={member.ocupacao}
                      className="sm:col-span-2 lg:col-span-6"
                      onChange={(value) => updateMember(index, "ocupacao", value)}
                    />
                  </div>
                </div>
              ))
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setMembers((current) => [...current, emptyMember()])}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar integrante
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveComposition} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar composição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberInput({
  id,
  label,
  value,
  onChange,
  className,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Pick<React.ComponentProps<typeof Input>, "type" | "min" | "step">) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
    </div>
  );
}
