import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type JovemOption = { id: string; nome_completo: string };
type InscricaoOption = { id: string; nome_completo: string | null; status: string };

const statusOptions = [
  { value: "em_analise", label: "Em análise" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "encerrado", label: "Encerrado" },
];

export default function JovemVagaVinculoForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedJovemId = searchParams.get("jovem_id");
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [jovens, setJovens] = useState<JovemOption[]>([]);
  const [inscricoes, setInscricoes] = useState<InscricaoOption[]>([]);

  const [targetType, setTargetType] = useState<"jovem" | "inscricao">("jovem");
  const [formData, setFormData] = useState({
    jovem_id: preselectedJovemId || "",
    inscricao_id: "",
    vaga_ref: "",
    status: "em_analise",
    observacoes: "",
  });

  useEffect(() => {
    (async () => {
      await Promise.all([fetchOptions(), fetchRecordIfEdit()]);
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchOptions() {
    const [jovensRes, inscricoesRes] = await Promise.all([
      supabase.from("jovens").select("id, nome_completo").order("nome_completo"),
      supabase
        .from("inscricoes_jovens_aprendizes")
        .select("id, nome_completo, status")
        .in("status", ["under_analysis", "talent_bank", "approved", "rejected"]) 
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (jovensRes.error?.code === "42501" || inscricoesRes.error?.code === "42501") {
      setAccessDenied(true);
      return;
    }

    setJovens((jovensRes.data as JovemOption[]) ?? []);
    setInscricoes((inscricoesRes.data as InscricaoOption[]) ?? []);
  }

  async function fetchRecordIfEdit() {
    if (!id) return;

    const { data, error } = await supabase
      .from("jovem_vaga_vinculos" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "42501") {
        setAccessDenied(true);
        return;
      }
      toast({ title: "Erro", description: "Vínculo não encontrado", variant: "destructive" });
      navigate("/vagas-vinculos");
      return;
    }

    setFormData({
      jovem_id: data.jovem_id || "",
      inscricao_id: data.inscricao_id || "",
      vaga_ref: data.vaga_ref || "",
      status: data.status || "em_analise",
      observacoes: data.observacoes || "",
    });

    setTargetType(data.jovem_id ? "jovem" : "inscricao");
  }

  const canSubmit = useMemo(() => {
    if (!formData.vaga_ref.trim()) return false;
    if (targetType === "jovem") return !!formData.jovem_id;
    return !!formData.inscricao_id;
  }, [formData.inscricao_id, formData.jovem_id, formData.vaga_ref, targetType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        jovem_id: targetType === "jovem" ? formData.jovem_id : null,
        inscricao_id: targetType === "inscricao" ? formData.inscricao_id : null,
        vaga_ref: formData.vaga_ref.trim(),
        status: formData.status,
        observacoes: formData.observacoes.trim() || null,
        ...(isEdit ? {} : { created_by: user?.id || null }),
      };

      if (isEdit && id) {
        const { error } = await supabase
          .from("jovem_vaga_vinculos" as any)
          .update(payload)
          .eq("id", id);

        if (error) throw error;

        toast({ title: "Sucesso", description: "Vínculo atualizado." });
      } else {
        const { error } = await supabase
          .from("jovem_vaga_vinculos" as any)
          .insert(payload);

        if (error) throw error;

        toast({ title: "Sucesso", description: "Vínculo criado." });
      }

      navigate("/vagas-vinculos");
    } catch (err: any) {
      toast({
        title: err?.code === "42501" ? "Sem permissão" : "Erro ao salvar",
        description:
          err?.code === "42501"
            ? "Você não tem permissão para gerenciar vínculos de vaga."
            : err?.message || "Falha ao salvar vínculo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-destructive font-medium">Sem permissão para acessar vínculos de vaga.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="page-header mb-0">
          <h1 className="page-title">{isEdit ? "Editar vínculo de vaga" : "Novo vínculo de vaga"}</h1>
          <p className="page-description">Registro mínimo de análise de jovem/inscrição para vaga.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do vínculo</CardTitle>
            <CardDescription>Preencha as informações de análise da vaga.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Referência da vaga *</Label>
              <Input
                value={formData.vaga_ref}
                onChange={(e) => setFormData((prev) => ({ ...prev, vaga_ref: e.target.value }))}
                placeholder="Ex.: VAGA-2026-001"
              />
            </div>

            <div>
              <Label>Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de vínculo *</Label>
              <Select
                value={targetType}
                onValueChange={(value: "jovem" | "inscricao") => {
                  setTargetType(value);
                  setFormData((prev) => ({ ...prev, jovem_id: "", inscricao_id: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jovem">Jovem</SelectItem>
                  <SelectItem value="inscricao">Inscrição</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "jovem" ? (
              <div>
                <Label>Jovem *</Label>
                <Select
                  value={formData.jovem_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, jovem_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {jovens.map((jovem) => (
                      <SelectItem key={jovem.id} value={jovem.id}>
                        {jovem.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Inscrição *</Label>
                <Select
                  value={formData.inscricao_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, inscricao_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {inscricoes.map((inscricao) => (
                      <SelectItem key={inscricao.id} value={inscricao.id}>
                        {(inscricao.nome_completo || "Sem nome")} ({inscricao.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={4}
                value={formData.observacoes}
                onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações da análise de vaga"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? "Salvar alterações" : "Criar vínculo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
