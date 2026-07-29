import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EncaminhamentoRecord {
  id: string;
  data_encaminhamento: string;
  retorno_previsto: string | null;
  destino_instituicao: string | null;
  destino_nome: string | null;
  destino_cargo: string | null;
  destino_contato: string | null;
  descricao_encaminhamento: string | null;
  jovem: {
    nome_completo: string;
    matricula: string | null;
  } | null;
  modelo?: {
    nome: string | null;
  } | null;
  responsavel?: {
    nome_completo: string | null;
    cargo: string | null;
  } | null;
}

export default function EncaminhamentoPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EncaminhamentoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("encaminhamentos")
        .select(
          `
            id,
            data_encaminhamento,
            retorno_previsto,
            destino_instituicao,
            destino_nome,
            destino_cargo,
            destino_contato,
            descricao_encaminhamento,
            jovem:jovens(nome_completo, matricula),
            modelo:config_modelos_encaminhamento(nome),
            responsavel:profiles!encaminhamentos_responsavel_id_profiles_fkey(nome_completo, cargo)
          `,
        )
        .eq("id", id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setError("Não foi possível carregar o encaminhamento.");
      } else {
        setRecord(data as unknown as EncaminhamentoRecord);
      }
      setLoading(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const formatLabelDate = (value: string | null) => {
    if (!value) return "—";
    try {
      return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return value;
    }
  };

  useEffect(() => {
    if (record) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
    return;
  }, [record]);

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

      <section className="print-area space-y-2 border rounded-lg p-6 bg-card shadow-sm">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Centro de Formação do Trabalhador - CEFORT
          </p>
          <h1 className="text-2xl font-semibold">Encaminhamento Oficial</h1>
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
                  {record.jovem?.nome_completo || "Não informado"}
                </p>
                {record.jovem?.matricula && (
                  <p className="text-muted-foreground text-xs">
                    Matrícula: {record.jovem.matricula}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Data</p>
                <p className="font-medium">
                  {formatLabelDate(record.data_encaminhamento)}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Instituição
                </p>
                <p className="font-medium">
                  {record.destino_instituicao || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Área / Setor
                </p>
                <p className="font-medium">{record.destino_nome || "—"}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Contato
                </p>
                <p className="font-medium">{record.destino_contato || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Retorno previsto
                </p>
                <p className="font-medium">
                  {formatLabelDate(record.retorno_previsto)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Descrição / Motivo
              </p>
              <p className="font-medium whitespace-pre-wrap">
                {record.descricao_encaminhamento || "—"}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Modelo utilizado
                </p>
                <p className="font-medium">{record.modelo?.nome || "—"}</p>
              </div>
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
            Encaminhamento não encontrado.
          </p>
        )}
      </section>
    </div>
  );
}
