import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface EmentaPrintRecord {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  carga_horaria_teorica: number;
  carga_horaria_pratica: number;
  disciplinas?: Array<{
    id: string;
    ordem: number;
    disciplina: {
      nome: string;
      codigo: string;
      tipo_modulo: string;
      carga_horaria: number;
      numero_encontros: number;
      descricao: string | null;
    } | null;
  }>;
}

export default function EmentaPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EmentaPrintRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("ementas")
        .select(
          `
            *,
            disciplinas:ementa_disciplinas(
              id,
              ordem,
              disciplina:disciplinas(
                nome,
                codigo,
                tipo_modulo,
                carga_horaria,
                numero_encontros,
                descricao
              )
            )
          `,
        )
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setError("Não foi possível carregar a ementa.");
        setLoading(false);
        return;
      }

      setRecord(data as unknown as EmentaPrintRecord);
      setLoading(false);
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-muted/20 print:bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
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

        <section className="print-area overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <header className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Planejamento Pedagógico · HubCefort
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-3xl">
              {record?.titulo || "Ementa"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Código {record?.codigo || "-"} · Exportação detalhada em PDF.
            </p>
          </header>

          {loading ? (
            <div className="px-6 py-16 text-center text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="px-6 py-16 text-center text-destructive">{error}</div>
          ) : (
            <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Carga teórica</p>
                  <p className="mt-2 text-2xl font-semibold">{record?.carga_horaria_teorica || 0}h</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Carga prática</p>
                  <p className="mt-2 text-2xl font-semibold">{record?.carga_horaria_pratica || 0}h</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disciplinas</p>
                  <p className="mt-2 text-2xl font-semibold">{record?.disciplinas?.length || 0}</p>
                </div>
              </div>

              <div className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">Descrição</h2>
                <p className="mt-2 text-sm text-slate-600">{record?.descricao || "Não informada."}</p>
              </div>

              <div className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">Disciplinas vinculadas</h2>
                <div className="mt-4 space-y-4">
                  {record?.disciplinas?.map((item, index) => (
                    <div key={item.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {index + 1}. {item.disciplina?.nome || "Disciplina"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.disciplina?.codigo || "-"} · {item.disciplina?.tipo_modulo || "-"}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{item.disciplina?.carga_horaria || 0}h</p>
                          <p>{item.disciplina?.numero_encontros || 0} encontro(s)</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {item.disciplina?.descricao || "Sem descrição."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
