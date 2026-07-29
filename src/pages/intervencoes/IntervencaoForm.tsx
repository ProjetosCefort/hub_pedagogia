import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMotivosIntervencao } from "@/hooks/useConfiguracoes";
import { logAudit } from "@/hooks/useAuditLog";

interface Jovem {
  id: string;
  nome_completo: string;
  matricula: string | null;
}

type SectorKey = "psicossocial" | "servico_social";

interface IntervencaoFormProps {
  sector?: SectorKey;
  basePath?: string;
  title?: string;
  editTitle?: string;
  submitCreateLabel?: string;
  submitEditLabel?: string;
  motivoLabel?: string;
}

export default function IntervencaoForm({
  sector = "psicossocial",
  basePath = "/intervencoes",
  title = "Nova Intervenção",
  editTitle = "Editar Intervenção",
  submitCreateLabel = "Intervenção registrada com sucesso!",
  submitEditLabel = "Intervenção atualizada com sucesso!",
  motivoLabel = "Motivo da Intervenção",
}: IntervencaoFormProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id);
  const [accessDenied, setAccessDenied] = useState(false);
  const [jovens, setJovens] = useState<Jovem[]>([]);

  const preselectedJovemId = searchParams.get("jovem_id");

  const [formData, setFormData] = useState({
    jovem_id: preselectedJovemId || "",
    data_atendimento: new Date().toISOString().slice(0, 16),
    motivo_intervencao_id: "",
    motivo_intervencao: "",
    descricao_demanda: "",
    relato_jovem: "",
    percepcao_profissional: "",
    plano_acao: "",
    conclusao: "",
  });

  // Carrega motivos de intervenção configurados
  const { data: motivosIntervencao, isLoading: loadingMotivos } =
    useMotivosIntervencao(true, sector);

  const isEdit = Boolean(id);

  useEffect(() => {
    fetchJovens();
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("intervencoes" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        if (error?.code === "42501") {
          setAccessDenied(true);
          toast({
            title: "Sem permissão",
            description: "Você não tem permissão para acessar esta intervenção.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }
        toast({
          title: "Intervenção não encontrada",
          variant: "destructive",
        });
        navigate(basePath);
        return;
      }
      if ((data as any).setor && (data as any).setor !== sector) {
        toast({
          title: "Registro não encontrado neste setor",
          description: "Este atendimento pertence a outro setor.",
          variant: "destructive",
        });
        navigate(basePath);
        return;
      }
      const d = data as Record<string, unknown>;
      setFormData({
        jovem_id: (d.jovem_id as string) ?? "",
        data_atendimento: d.data_atendimento
          ? new Date(d.data_atendimento as string).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        motivo_intervencao_id: (d.motivo_intervencao_id as string) ?? "",
        motivo_intervencao: (d.motivo_intervencao as string) ?? "",
        descricao_demanda: (d.descricao_demanda as string) ?? "",
        relato_jovem: (d.relato_jovem as string) ?? "",
        percepcao_profissional: (d.percepcao_profissional as string) ?? "",
        plano_acao: (d.plano_acao as string) ?? "",
        conclusao: (d.conclusao as string) ?? "",
      });
      setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, toast, basePath, sector]);

  async function fetchJovens() {
    const { data, error } = await supabase
      .from("jovens")
      .select("id, nome_completo, matricula")
      .eq("status", "active_apprentice")
      .order("nome_completo");

    if (error?.code === "42501") {
      setAccessDenied(true);
      toast({
        title: "Sem permissão",
        description:
          sector === "servico_social"
            ? "Você não tem permissão para cadastrar atendimentos."
            : "Você não tem permissão para cadastrar intervenções.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    if (data) setJovens(data);
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        motivo_intervencao_id: formData.motivo_intervencao_id || null,
        motivo_intervencao: formData.motivo_intervencao || null,
        setor: sector,
        responsavel_id: user?.id,
      };

      if (isEdit && id) {
        const { data: updatedData, error } = await supabase
          .from("intervencoes" as any)
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        if (updatedData?.id) {
          await logAudit({
            entityType: "intervencoes",
            entityId: updatedData.id,
            actionType: "update",
            newData: updatedData,
          });
        }

        toast({ title: submitEditLabel });
      } else {
        const { data: insertedData, error } = await supabase
          .from("intervencoes" as any)
          .insert({
            ...payload,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (insertedData?.id) {
          await logAudit({
            entityType: "intervencoes",
            entityId: insertedData.id,
            actionType: "create",
            newData: insertedData,
          });
        }

        toast({ title: submitCreateLabel });
      }

      if (preselectedJovemId) {
        navigate(`/jovens/${preselectedJovemId}`);
      } else {
        navigate(basePath);
      }
    } catch (error: any) {
      toast({
        title: error?.code === "42501" ? "Sem permissão" : "Erro ao salvar",
        description:
          error?.code === "42501"
            ? sector === "servico_social"
              ? "Você não tem permissão para salvar atendimentos."
              : "Você não tem permissão para salvar intervenções."
            : error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-destructive font-medium">
          {sector === "servico_social"
            ? "Sem permissão para acessar atendimentos."
            : "Sem permissão para acessar intervenções."}
        </p>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="page-header mb-0">
            <h1 className="page-title">{isEdit ? editTitle : title}</h1>
            <p className="page-description">
              {isEdit
                ? "Altere os dados do atendimento"
                : "Registre um novo atendimento"}
            </p>
          </div>
        </div>
        {isEdit && id && (
          <Button variant="outline" asChild>
            <Link to={`${basePath}/${id}/imprimir`}>
              <Printer className="mr-2 h-4 w-4" />
              Exportar em PDF
            </Link>
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Informações do Atendimento
            </CardTitle>
            <CardDescription>Dados básicos da intervenção</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="jovem_id">Jovem *</Label>
              <Select
                value={formData.jovem_id}
                onValueChange={(v) => handleChange("jovem_id", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o jovem" />
                </SelectTrigger>
                <SelectContent>
                  {jovens.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nome_completo} {j.matricula && `(${j.matricula})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="data_atendimento">
                Data e hora do atendimento *
              </Label>
              <Input
                id="data_atendimento"
                type="datetime-local"
                value={formData.data_atendimento}
                onChange={(e) =>
                  handleChange("data_atendimento", e.target.value)
                }
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="motivo_intervencao_id">
                {motivoLabel}
              </Label>
              <Select
                value={formData.motivo_intervencao_id}
                onValueChange={(v) => {
                  const motivo = motivosIntervencao?.find((m) => m.id === v);
                  setFormData((prev) => ({
                    ...prev,
                    motivo_intervencao_id: v,
                    motivo_intervencao: motivo?.nome || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingMotivos ? "Carregando..." : "Selecione o motivo"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {motivosIntervencao?.map((motivo) => (
                    <SelectItem key={motivo.id} value={motivo.id}>
                      {motivo.nome}
                      {motivo.categoria && ` (${motivo.categoria})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Motivos configuráveis em Configurações → Motivos de Intervenção
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Descrição da Demanda</CardTitle>
            <CardDescription>
              Descreva detalhadamente a demanda apresentada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="descricao_demanda"
              value={formData.descricao_demanda}
              onChange={(e) =>
                handleChange("descricao_demanda", e.target.value)
              }
              rows={4}
              placeholder="Descreva detalhadamente a demanda apresentada..."
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relato do Jovem</CardTitle>
            <CardDescription>
              Registro das percepções e falas do jovem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="relato_jovem"
              value={formData.relato_jovem}
              onChange={(e) => handleChange("relato_jovem", e.target.value)}
              rows={4}
              placeholder="Registre o relato e percepções do jovem sobre a situação..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Percepção Profissional</CardTitle>
            <CardDescription>
              Análise e observações do profissional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="percepcao_profissional"
              value={formData.percepcao_profissional}
              onChange={(e) =>
                handleChange("percepcao_profissional", e.target.value)
              }
              rows={4}
              placeholder="Registre suas observações e análise profissional..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plano de Ação</CardTitle>
            <CardDescription>Estratégias e ações definidas</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="plano_acao"
              value={formData.plano_acao}
              onChange={(e) => handleChange("plano_acao", e.target.value)}
              rows={4}
              placeholder="Descreva o plano de ação e encaminhamentos..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conclusão</CardTitle>
            <CardDescription>Fechamento e considerações finais</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="conclusao"
              value={formData.conclusao}
              onChange={(e) => handleChange("conclusao", e.target.value)}
              rows={4}
              placeholder="Registre a conclusão do atendimento..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEdit ? "Salvar alterações" : "Registrar Intervenção"}
          </Button>
        </div>
      </form>
    </div>
  );
}
