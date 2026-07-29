import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { User, Plus, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface InternalNote {
  id: string;
  jovem_id: string;
  note: string;
  created_by: string;
  created_at: string;
  createdByName?: string;
  createdByCargo?: string;
}

interface InternalNotesProps {
  jovemId: string;
}

export function InternalNotes({ jovemId }: InternalNotesProps) {
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [supportsInternalNotes, setSupportsInternalNotes] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setNotes([]);

      const { error } = await supabase
        .from("internal_notes")
        .select("id")
        .limit(1);

      if (error) {
        // Tabela/visão não existe neste ambiente.
        if (error.code === "PGRST205" || error.code === "42P01") {
          setSupportsInternalNotes(false);
          setLoading(false);
          return;
        }

        // Se for apenas permissão, recurso existe e seguimos com comportamento de acesso.
        if (error.code === "42501" || error.message.includes("permission")) {
          setSupportsInternalNotes(true);
          setLoading(false);
          return;
        }

        console.error("Erro ao verificar suporte de observações internas:", error);
        setSupportsInternalNotes(false);
        setLoading(false);
        return;
      }

      setSupportsInternalNotes(true);
      await fetchNotes();
    }

    bootstrap();
  }, [jovemId]);

  async function fetchNotes() {
    try {
      const { data: notesData, error } = await supabase
        .from("internal_notes")
        .select("*")
        .eq("jovem_id", jovemId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "PGRST205") return;
        // Se o erro for de permissão (RLS), não mostrar erro, apenas não exibir notas
        if (error.code === "42501" || error.message.includes("permission")) {
          setNotes([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!notesData || notesData.length === 0) {
        setNotes([]);
        setLoading(false);
        return;
      }

      // Coletar todos os user IDs únicos para buscar profiles
      const userIds = new Set<string>();
      notesData.forEach((note: any) => {
        if (note.created_by) userIds.add(note.created_by);
      });

      // Buscar todos os profiles de uma vez
      const profilesMap = new Map<
        string,
        { nome_completo: string; cargo: string | null }
      >();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome_completo, cargo")
          .in("id", Array.from(userIds));

        profiles?.forEach((p) => {
          profilesMap.set(p.id, {
            nome_completo: p.nome_completo,
            cargo: p.cargo,
          });
        });
      }

      // Enriquecer notas com dados dos profiles
      const enrichedNotes: InternalNote[] = notesData.map((note: any) => {
        const profile = note.created_by
          ? profilesMap.get(note.created_by)
          : null;

        return {
          ...note,
          createdByName: profile?.nome_completo || "Sistema",
          createdByCargo: profile?.cargo || null,
        };
      });

      setNotes(enrichedNotes);
    } catch (error) {
      console.error("Erro ao buscar notas internas:", error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!supportsInternalNotes) {
      toast({
        title: "Recurso indisponivel",
        description: "Observacoes internas nao estao habilitadas neste ambiente.",
        variant: "destructive",
      });
      return;
    }

    if (!newNote.trim()) {
      toast({
        title: "Erro",
        description: "A nota não pode estar vazia",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("internal_notes").insert({
        jovem_id: jovemId,
        note: newNote.trim(),
        created_by: user.id,
      });

      if (error) {
        if (error.code === "PGRST205") return;
        // Se o erro for de permissão, informar que apenas staff pode adicionar notas
        if (error.code === "42501" || error.message.includes("permission")) {
          toast({
            title: "Acesso negado",
            description: "Apenas usuários staff podem adicionar notas internas",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setNewNote("");
      await fetchNotes();
      toast({
        title: "Sucesso",
        description: "Nota interna adicionada com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao adicionar nota:", error);
      toast({
        title: "Erro",
        description:
          error.message || "Erro ao adicionar nota. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse-soft text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {supportsInternalNotes === false ? (
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Observacoes internas indisponiveis neste ambiente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Formulário para adicionar nota */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Observação Interna
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Digite sua observação interna aqui..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button
            onClick={handleAddNote}
            disabled={submitting || !newNote.trim()}
            size="sm"
          >
            {submitting ? "Adicionando..." : "Adicionar Nota"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de notas */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Observações Internas ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma observação interna encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione observações internas sobre este jovem
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {note.createdByName || "Sistema"}
                        </span>
                        {note.createdByCargo && (
                          <Badge
                            variant="outline"
                            className="text-xs py-0 px-1.5 h-5"
                          >
                            {note.createdByCargo}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(
                          new Date(note.created_at),
                          "dd/MM/yyyy",
                          { locale: ptBR },
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                        {format(new Date(note.created_at), "HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
