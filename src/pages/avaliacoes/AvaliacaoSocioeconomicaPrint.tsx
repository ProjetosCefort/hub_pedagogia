import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RegistroSocial {
  registros_sociais?: {
    nome: string | null;
    sigla: string | null;
  } | null;
}

interface AvaliacaoSocioRecord {
  id: string;
  data_avaliacao: string;
  pcd_status: string | null;
  tipo_deficiencia: string | null;
  problemas_saude: string | null;
  cadunico_status: string | null;
  renda_familiar: number | null;
  quantidade_membros: number | null;
  composicao_familiar: any;
  moradia_tipo: string | null;
  situacao_moradia: string | null;
  beneficios_sociais: string | null;
  observacoes: string | null;
  jovem: {
    nome_completo: string;
    matricula: string | null;
  } | null;
  responsavel?: { nome_completo: string | null; cargo: string | null } | null;
  registros?: RegistroSocial[] | null;
}

const pcdLabels: Record<string, string> = {
  pcd: "PCD",
  nao_pcd: "Não PCD",
  em_analise: "Em análise",
};

const cadunicoLabels: Record<string, string> = {
  atualizado: "Atualizado",
  desatualizado: "Desatualizado",
  nao_inscrito: "Não inscrito",
  pendente: "Pendente",
};

export default function AvaliacaoSocioeconomicaPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AvaliacaoSocioRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("avaliacoes_socioeconomicas")
        .select(
          `
            id,
            data_avaliacao,
            pcd_status,
            tipo_deficiencia,
            problemas_saude,
            cadunico_status,
            renda_familiar,
            quantidade_membros,
            composicao_familiar,
            moradia_tipo,
            situacao_moradia,
            beneficios_sociais,
            observacoes,
            jovem:jovens(nome_completo, matricula),
            responsavel:profiles!avaliacoes_socioeconomicas_responsavel_id_profiles_fkey(nome_completo, cargo)
          `,
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(error);
        setError("Não foi possível carregar a avaliação.");
      } else {
        setRecord({
          ...(data as unknown as AvaliacaoSocioRecord),
          registros: [],
        });
      }
      setLoading(false);
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (record) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [record]);

  const formatDate = (value: string) =>
    format(new Date(value), "dd/MM/yyyy", { locale: ptBR });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCode = (value: string | null, map: Record<string, string>) =>
    value ? map[value] || value : "—";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-background">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <section className="print-area space-y-3 border rounded-lg p-6 bg-card shadow-sm">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">HubCefort</p>
          <h1 className="text-2xl font-semibold">
            Avaliação Socioeconômica
          </h1>
        </div>
        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : error ? (
          <p className="text-center text-destructive">{error}</p>
        ) : record ? (
          <div className="space-y-5 text-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Jovem</p>
                <p className="font-medium">
                  {record.jovem?.nome_completo || "—"}
                </p>
                {record.jovem?.matricula && (
                  <p className="text-xs text-muted-foreground">
                    Matrícula: {record.jovem.matricula}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Data da avaliação
                </p>
                <p className="font-medium">{formatDate(record.data_avaliacao)}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">PCD</p>
                <p className="font-medium">
                  {formatCode(record.pcd_status, pcdLabels)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  CadÚnico
                </p>
                <p className="font-medium">
                  {formatCode(record.cadunico_status, cadunicoLabels)}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Quantidade de membros
                </p>
                <p className="font-medium">
                  {record.quantidade_membros ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Renda familiar
                </p>
                <p className="font-medium">
                  {formatCurrency(record.renda_familiar)}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Situação de moradia
                </p>
                <p className="font-medium">
                  {record.moradia_tipo || record.situacao_moradia || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Benefícios sociais
                </p>
                <p className="font-medium">
                  {record.beneficios_sociais || "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Problemas de saúde
              </p>
              <p className="whitespace-pre-wrap">
                {record.problemas_saude || "—"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Observações gerais
              </p>
              <p className="whitespace-pre-wrap">
                {record.observacoes || "—"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Registros sociais
              </p>
              <ul className="list-disc list-inside">
                {record.registros && record.registros.length > 0 ? (
                  record.registros.map((registro, index) => (
                    <li key={`${registro.registros_sociais?.sigla}-${index}`}>
                      {registro.registros_sociais?.sigla ||
                        registro.registros_sociais?.nome ||
                        "—"}
                    </li>
                  ))
                ) : (
                  <li>—</li>
                )}
              </ul>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Responsável
                </p>
                <p className="font-medium">
                  {record.responsavel?.nome_completo || "—"}
                </p>
                {record.responsavel?.cargo && (
                  <p className="text-xs text-muted-foreground">
                    {record.responsavel.cargo}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Avaliação não encontrada.
          </p>
        )}
      </section>
    </div>
  );
}
