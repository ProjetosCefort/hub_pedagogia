import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPublicAccessJwt, setPublicAccessJwt } from "@/integrations/supabase/publicAccessClient";
import { formatDateOnly } from "@/lib/formatters";
import { Loader2, LogOut, UploadCloud } from "lucide-react";
import { DOCUMENTO_TIPOS, type DocumentoTipo } from "@/lib/documentos";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EXPIRED_MESSAGE = "Sessão expirada. Por favor, valide novamente seus dados.";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type InscricaoRow = Record<string, unknown>;
type JovemRow = Record<string, unknown>;
type DocumentoPublicoRow = {
  id: string;
  tipo: DocumentoTipo;
  nome_arquivo: string;
  status_validacao: "pendente" | "aprovado" | "rejeitado";
  enviado_em: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLIC_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const PUBLIC_UPLOAD_URL = SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/public-upload-document";
const PUBLIC_GET_REGISTRO_URL = SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/public-get-registro";

export default function MeuRegistro() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const requestedTipo = (location.state as { tipoDocumento?: string } | null)
    ?.tipoDocumento;
  const initialTipo = DOCUMENTO_TIPOS.some((tipo) => tipo.value === requestedTipo)
    ? (requestedTipo as DocumentoTipo)
    : "rg";
  const [inscricao, setInscricao] = useState<InscricaoRow | null>(null);
  const [jovem, setJovem] = useState<JovemRow | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoPublicoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<DocumentoTipo>(initialTipo);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const jwt = getPublicAccessJwt();
    if (!jwt) {
      setLoading(false);
      setExpired(true);
      return;
    }

    loadRegistro(jwt).finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (!loading && expired) {
      setPublicAccessJwt(null);
      navigate("/acesso-jovem", { replace: true, state: { message: EXPIRED_MESSAGE } });
    }
  }, [loading, expired, navigate]);

  const handleSair = () => {
    setPublicAccessJwt(null);
    navigate("/acesso-jovem", { replace: true });
  };

  const loadRegistro = async (jwt: string) => {
    try {
      const res = await fetch(PUBLIC_GET_REGISTRO_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
          apikey: SUPABASE_PUBLIC_KEY,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setExpired(true);
        return;
      }

      setJovem((data.jovem || null) as JovemRow | null);
      setInscricao((data.inscricao || null) as InscricaoRow | null);
      setDocumentos((data.documentos || []) as DocumentoPublicoRow[]);
    } catch {
      setExpired(true);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      toast({
        title: "Arquivo muito grande",
        description: `"${oversizedFile.name}" excede o limite de 10 MB.`,
        variant: "destructive",
      });
      return;
    }

    const jwt = getPublicAccessJwt();
    if (!jwt) {
      setExpired(true);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("tipo", selectedTipo);
      selectedFiles.forEach((file) => {
        formData.append("file", file);
      });

      const res = await fetch(PUBLIC_UPLOAD_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          apikey: SUPABASE_PUBLIC_KEY,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha no upload");
      }

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadRegistro(jwt);
    } catch {
      toast({
        title: "Falha no envio",
        description: "Não foi possível enviar o documento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const record = jovem ?? inscricao;
  const isJovem = jovem != null;
  const nome = (record?.nome_completo as string) ?? "—";
  const status = (record?.status as string) ?? (inscricao ? "Inscrição" : "—");

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Meu registro</h1>
          <Button variant="outline" size="sm" onClick={handleSair}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados cadastrais</CardTitle>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">{isJovem ? "Aprendiz" : "Inscrição"}</Badge>
              {status && <Badge variant="outline">{String(status)}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Nome</span>
              <p className="font-medium">{nome}</p>
            </div>
            {record?.data_nascimento && (
              <div>
                <span className="text-sm text-muted-foreground">Data de nascimento</span>
                <p className="font-medium">{formatDateOnly(String(record.data_nascimento))}</p>
              </div>
            )}
            {record?.email && (
              <div>
                <span className="text-sm text-muted-foreground">E-mail</span>
                <p className="font-medium">{String(record.email)}</p>
              </div>
            )}
            {record?.contato_1 && (
              <div>
                <span className="text-sm text-muted-foreground">Contato</span>
                <p className="font-medium">{String(record.contato_1)}</p>
              </div>
            )}
            {record?.celular && !record?.contato_1 && (
              <div>
                <span className="text-sm text-muted-foreground">Celular</span>
                <p className="font-medium">{String(record.celular)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload de documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Documentos obrigatórios: RG (frente e verso), CPF, comprovante de endereço, comprovante de escolaridade/matrícula e carteira de trabalho.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo do documento</Label>
                <Select value={selectedTipo} onValueChange={(value) => setSelectedTipo(value as DocumentoTipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENTO_TIPOS.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Arquivo</Label>
                <Input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  accept=".pdf,image/*"
                  onChange={(event) =>
                    setSelectedFiles(Array.from(event.target.files ?? []))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} arquivo(s) selecionado(s)`
                    : "PDF ou imagem. Max. 10 MB por arquivo"}
                </p>
              </div>
            </div>
            <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {selectedFiles.length > 1 ? "Enviar documentos" : "Enviar documento"}
                </>
              )}
            </Button>

            <div className="space-y-2">
              <p className="text-sm font-medium">Documentos enviados</p>
              {documentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div key={doc.id} className="rounded-md border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{doc.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOCUMENTO_TIPOS.find((tipo) => tipo.value === doc.tipo)?.label || doc.tipo} •{" "}
                          {format(new Date(doc.enviado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant={doc.status_validacao === "aprovado" ? "default" : doc.status_validacao === "rejeitado" ? "destructive" : "secondary"}>
                        {doc.status_validacao === "aprovado"
                          ? "Aprovado"
                          : doc.status_validacao === "rejeitado"
                            ? "Rejeitado"
                            : "Pendente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
