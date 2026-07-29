import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface IntervencaoPrintRecord {
  id: string;
  setor: "psicossocial" | "servico_social" | null;
  data_atendimento: string;
  motivo_intervencao: string | null;
  descricao_demanda: string | null;
  relato_jovem: string | null;
  percepcao_profissional: string | null;
  plano_acao: string | null;
  conclusao: string | null;
  responsavel_id: string | null;
  jovem: {
    nome_completo: string | null;
    matricula: string | null;
  } | null;
}

export default function IntervencaoPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<IntervencaoPrintRecord | null>(null);
  const [responsavelNome, setResponsavelNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("intervencoes" as any)
        .select(
          `
            id,
            setor,
            data_atendimento,
            motivo_intervencao,
            descricao_demanda,
            relato_jovem,
            percepcao_profissional,
            plano_acao,
            conclusao,
            responsavel_id,
            jovem:jovens(nome_completo, matricula)
          `,
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setError("Não foi possível carregar o registro.");
      } else {
        const nextRecord = data as unknown as IntervencaoPrintRecord;
        setRecord(nextRecord);
        if (nextRecord.responsavel_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("nome_completo, email")
            .eq("id", nextRecord.responsavel_id)
            .maybeSingle();
          setResponsavelNome(profile?.nome_completo || profile?.email || null);
        }
      }
      setLoading(false);
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [id]);

  const title = record?.setor === "servico_social" ? "Atendimento do Serviço Social" : "Intervenção Psicossocial";

  return (
    <div className="min-h-screen bg-muted/20 print:bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Exportar em PDF
          </Button>
        </div>

        <section className="print-area overflow-hidden rounded-2xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <header className="border-b px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              CEFORT · HubCefort
            </p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Exportação detalhada do registro.</p>
          </header>

          {loading ? (
            <div className="px-6 py-16 text-center text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="px-6 py-16 text-center text-destructive">{error}</div>
          ) : record ? (
            <div className="space-y-6 px-6 py-6 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBlock label="Jovem" value={record.jovem?.nome_completo} detail={record.jovem?.matricula ? `Matrícula: ${record.jovem.matricula}` : undefined} />
                <InfoBlock label="Data e hora" value={formatDateTime(record.data_atendimento)} />
                <InfoBlock label="Motivo" value={record.motivo_intervencao} />
                <InfoBlock label="Responsável" value={responsavelNome} />
              </div>

              <InfoSection title="Descrição da demanda" value={record.descricao_demanda} />
              <InfoSection title="Relato do jovem" value={record.relato_jovem} />
              <InfoSection title="Percepção profissional" value={record.percepcao_profissional} />
              <InfoSection title="Plano de ação" value={record.plano_acao} />
              <InfoSection title="Conclusão" value={record.conclusao} />
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-muted-foreground">Registro não encontrado.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | null | undefined;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{value || "Não informado"}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function InfoSection({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl border p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{value || "Não informado."}</p>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Não informada";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}
