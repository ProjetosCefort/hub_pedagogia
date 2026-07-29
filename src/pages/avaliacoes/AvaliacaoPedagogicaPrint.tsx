import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createDocumentoSignedUrl } from "@/lib/documentos";

interface AvaliacaoPedagogicaRecord {
  id: string;
  data_avaliacao: string;
  jovem_id?: string | null;
  turma_id?: string | null;
  aproveitamento_escolar_id?: string | null;
  responsavel_id?: string | null;
  motivo_intervencao: string | null;
  dificuldades?: string[] | null;
  descricao_conducao: string | null;
  estrategias_aplicadas: string | null;
  manifestacao_jovem: string | null;
  parecer_final: string | null;
  assinatura_profissional: string | null;
  assinatura_jovem: string | null;
  jovem: {
    nome_completo: string;
    matricula: string | null;
  } | null;
  turma: {
    nome: string;
  } | null;
  motivo?: { nome: string | null } | null;
  aproveitamento?: { nome: string | null } | null;
  responsavel?: { nome_completo: string | null; cargo: string | null } | null;
}

interface AvaliacaoPedagogicaAnexo {
  id: string;
  nome_arquivo: string;
  storage_path: string;
}

export default function AvaliacaoPedagogicaPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AvaliacaoPedagogicaRecord | null>(null);
  const [anexos, setAnexos] = useState<AvaliacaoPedagogicaAnexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("avaliacoes_pedagogicas")
        .select(
          `
            id,
            data_avaliacao,
            motivo_intervencao,
            dificuldades,
            descricao_conducao,
            estrategias_aplicadas,
            manifestacao_jovem,
            parecer_final,
            assinatura_profissional,
            assinatura_jovem,
            jovem:jovens(nome_completo, matricula),
            turma:turmas(nome),
            motivo:config_motivos_intervencao(nome),
            aproveitamento:config_aproveitamento_escolar(nome),
            responsavel:profiles!avaliacoes_pedagogicas_responsavel_id_profiles_fkey(nome_completo, cargo)
          `,
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      let finalRecord: AvaliacaoPedagogicaRecord | null = null;

      if (!error && data) {
        finalRecord = data as unknown as AvaliacaoPedagogicaRecord;
      } else {
        // Fallback para ambientes com schema reduzido (sem turma/modelo/FKs nomeadas)
        const { data: baseData, error: baseError } = await supabase
          .from("avaliacoes_pedagogicas")
          .select(
            `
              id,
              data_avaliacao,
              jovem_id,
              turma_id,
              responsavel_id,
              aproveitamento_escolar_id,
              motivo_intervencao,
              dificuldades,
              descricao_conducao,
              estrategias_aplicadas,
              manifestacao_jovem,
              parecer_final,
              assinatura_profissional,
              assinatura_jovem
            `,
          )
          .eq("id", id)
          .maybeSingle();

        if (baseError || !baseData) {
          console.error(error || baseError);
          setError("Não foi possível carregar a avaliação.");
          setLoading(false);
          return;
        }

        const fallbackRecord: AvaliacaoPedagogicaRecord = {
          ...(baseData as AvaliacaoPedagogicaRecord),
          jovem: null,
          turma: null,
          motivo: null,
          aproveitamento: null,
          responsavel: null,
        };

        if (fallbackRecord.jovem_id) {
          const { data: jovemData } = await supabase
            .from("jovens")
            .select("nome_completo, matricula")
            .eq("id", fallbackRecord.jovem_id)
            .maybeSingle();
          if (jovemData) {
            fallbackRecord.jovem = jovemData as AvaliacaoPedagogicaRecord["jovem"];
          }
        }

        if (fallbackRecord.turma_id) {
          const { data: turmaData } = await supabase
            .from("turmas")
            .select("nome")
            .eq("id", fallbackRecord.turma_id)
            .maybeSingle();
          if (turmaData) {
            fallbackRecord.turma = turmaData as AvaliacaoPedagogicaRecord["turma"];
          }
        }

        if (fallbackRecord.responsavel_id) {
          const { data: responsavelData } = await supabase
            .from("profiles")
            .select("nome_completo, cargo")
            .eq("id", fallbackRecord.responsavel_id)
            .maybeSingle();
          if (responsavelData) {
            fallbackRecord.responsavel =
              responsavelData as AvaliacaoPedagogicaRecord["responsavel"];
          }
        }

        if (fallbackRecord.aproveitamento_escolar_id) {
          const { data: aproveitamentoData } = await supabase
            .from("config_aproveitamento_escolar")
            .select("nome")
            .eq("id", fallbackRecord.aproveitamento_escolar_id)
            .maybeSingle();
          if (aproveitamentoData) {
            fallbackRecord.aproveitamento =
              aproveitamentoData as AvaliacaoPedagogicaRecord["aproveitamento"];
          }
        }

        finalRecord = fallbackRecord;
      }

      setRecord(finalRecord);
      const { data: anexosData } = await supabase
        .from("avaliacoes_pedagogicas_anexos" as any)
        .select("id, nome_arquivo, storage_path")
        .eq("avaliacao_id", id)
        .order("created_at", { ascending: false });
      setAnexos((anexosData || []) as AvaliacaoPedagogicaAnexo[]);
      setLoading(false);
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [id]);

  const formatDate = (value: string) =>
    format(new Date(value), "dd/MM/yyyy", { locale: ptBR });

  const openAnexo = async (storagePath: string) => {
    try {
      const signedUrl = await createDocumentoSignedUrl(storagePath, 300);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Erro ao abrir anexo:", err);
    }
  };

  const isTurmaAvaliacao = !!record && !record.jovem?.nome_completo;
  const valueOrDash = (value?: string | null) =>
    value && value.trim().length > 0 ? value : "Não informado";

  return (
    <div className="min-h-screen bg-muted/20 print:bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Exportar em PDF
          </Button>
        </div>

        <section className="print-area overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Relatório Pedagógico · HubCefort
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-3xl">
              {record?.jovem?.nome_completo
                ? "Avaliação Pedagógica Individual"
                : "Avaliação Pedagógica de Turma"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Visualização detalhada para conferência e emissão em PDF.
            </p>
          </header>

          {loading ? (
            <div className="px-6 py-16 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center text-destructive">
              {error}
            </div>
          ) : record ? (
            <div className="px-4 py-5 sm:px-6 lg:px-8">
              <div className="mb-6 border-b border-slate-200 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.07em] text-slate-500">
                  {record.jovem?.nome_completo ? "Jovem avaliado" : "Turma avaliada"}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {record.jovem?.nome_completo || record.turma?.nome || "Não informado"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  {record.jovem?.matricula && (
                    <span>Matrícula: {record.jovem.matricula}</span>
                  )}
                  <span>Data: {formatDate(record.data_avaliacao)}</span>
                  {isTurmaAvaliacao && <span>Tipo: Coletiva por turma</span>}
                </div>
              </div>

              <div className="mb-6 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      Motivo
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {valueOrDash(record.motivo?.nome || record.motivo_intervencao)}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      Aproveitamento
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {valueOrDash(record.aproveitamento?.nome)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 border-t border-slate-200">
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      Responsável
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {valueOrDash(record.responsavel?.nome_completo)}
                    </p>
                    {record.responsavel?.cargo && (
                      <p className="text-xs text-slate-500">{record.responsavel.cargo}</p>
                    )}
                  </div>
                  {!isTurmaAvaliacao && (
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        Assinatura do jovem
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {valueOrDash(record.assinatura_jovem)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {record.dificuldades && record.dificuldades.length > 0 && (
                <div className="mb-6 rounded-xl border border-slate-200 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Dificuldades observadas
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {record.dificuldades.map((dificuldade) => (
                      <span
                        key={dificuldade}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {dificuldade}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <article className="border-b border-slate-200 pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-slate-700">
                    Descrição da condução
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {valueOrDash(record.descricao_conducao)}
                  </p>
                </article>
                <article className="border-b border-slate-200 pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-slate-700">
                    Estratégias aplicadas
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {valueOrDash(record.estrategias_aplicadas)}
                  </p>
                </article>
                <article className="border-b border-slate-200 pb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-slate-700">
                    Manifestação do jovem
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {valueOrDash(record.manifestacao_jovem)}
                  </p>
                </article>
                <article>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-slate-700">
                    Parecer final
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {valueOrDash(record.parecer_final)}
                  </p>
                </article>
              </div>

              {anexos.length > 0 && (
                <div className="mt-6 rounded-xl border bg-background p-4 print:hidden">
                  <h2 className="mb-3 text-sm font-semibold">Anexos</h2>
                  <div className="flex flex-wrap gap-2">
                    {anexos.map((anexo) => (
                      <Button
                        key={anexo.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openAnexo(anexo.storage_path)}
                      >
                        {anexo.nome_arquivo}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-muted-foreground">
              Avaliação não encontrada.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
