import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Eye,
  FileImage,
  FileText,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Redo2,
  ToggleLeft,
  ToggleRight,
  Underline,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModeloDocumento, useModelosDocumentos, useMutateModeloDocumento } from "@/hooks/useConfiguracoes";
import { useToast } from "@/hooks/use-toast";

const MODELO_TIPOS = [
  { value: "certificado", label: "Certificado" },
  { value: "comprovante_matricula", label: "Comprovante de matrícula" },
  { value: "advertencia", label: "Advertência" },
  { value: "outros", label: "Outros" },
] as const;

const FONT_FAMILIES = ["Arial", "Times New Roman", "Georgia", "Verdana", "Courier New"] as const;

const ALIGNMENT_OPTIONS = [
  { value: "left", label: "Esquerda", icon: AlignLeft },
  { value: "center", label: "Centro", icon: AlignCenter },
  { value: "right", label: "Direita", icon: AlignRight },
  { value: "justify", label: "Justificado", icon: AlignJustify },
] as const;

const IMAGE_POSITIONS = [
  { value: "top", label: "Antes do texto" },
  { value: "bottom", label: "Depois do texto" },
] as const;

const MAX_TEMPLATE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const defaultFormData = {
  nome: "",
  tipo: "outros" as ModeloDocumento["tipo"],
  descricao: "",
  corpo_template: "",
  fonte_familia: "Arial",
  fonte_tamanho: 14,
  negrito: false,
  alinhamento: "left" as ModeloDocumento["alinhamento"],
  logo_url: "",
  imagem_url: "",
  imagem_posicao: "top" as ModeloDocumento["imagem_posicao"],
  ativo: true,
  ordem: 0,
};

const TEMPLATE_VARIABLES = [
  { key: "{{nome_jovem}}", description: "Nome completo do jovem aprendiz", sample: "Joao da Silva" },
  { key: "{{cpf}}", description: "CPF do jovem", sample: "123.456.789-00" },
  { key: "{{matricula}}", description: "Matricula do jovem", sample: "MAT-2026-0142" },
  { key: "{{turma}}", description: "Turma vinculada", sample: "Turma A - Manha" },
  { key: "{{empresa}}", description: "Empresa vinculada", sample: "Empresa Exemplo Ltda." },
  { key: "{{data_emissao}}", description: "Data de emissao do documento", sample: "29/03/2026" },
  { key: "{{responsavel_setor}}", description: "Nome do responsavel pela emissao", sample: "Maria Oliveira" },
  { key: "{{cargo_responsavel}}", description: "Cargo do responsavel", sample: "Analista Pedagogica" },
  { key: "{{descricao_ocorrencia}}", description: "Descricao da ocorrencia", sample: "Atrasos recorrentes no mes." },
  { key: "{{plano_acao}}", description: "Plano de acao definido", sample: "Acompanhamento semanal por 30 dias." },
  { key: "{{informacoes_complementares}}", description: "Informacoes adicionais", sample: "Documento emitido para fins de comprovacao." },
] as const;

export function ModelosDocumentosTab() {
  const [showAll, setShowAll] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModeloDocumento | null>(null);
  const [previewItem, setPreviewItem] = useState<ModeloDocumento | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const imagemInputRef = useRef<HTMLInputElement | null>(null);

  const { data: modelosResult, isLoading } = useModelosDocumentos(!showAll, true);
  const modelos = modelosResult?.items || [];
  const modelosDisponiveis = modelosResult?.available ?? true;
  const { create, update } = useMutateModeloDocumento();
  const { toast } = useToast();

  const [formData, setFormData] = useState(defaultFormData);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingItem(null);
  };

  const handleOpenForm = (item?: ModeloDocumento) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        tipo: item.tipo,
        descricao: item.descricao || "",
        corpo_template: item.corpo_template || "",
        fonte_familia: item.fonte_familia || "Arial",
        fonte_tamanho: item.fonte_tamanho || 14,
        negrito: item.negrito ?? false,
        alinhamento: item.alinhamento || "left",
        logo_url: item.logo_url || "",
        imagem_url: item.imagem_url || "",
        imagem_posicao: item.imagem_posicao || "top",
        ativo: item.ativo,
        ordem: item.ordem,
      });
    } else {
      resetForm();
    }
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!modelosDisponiveis) return;
    if (editingItem) {
      try {
        await update.mutateAsync({ id: editingItem.id, ...formData });
      } catch {
        return;
      }
    } else {
      try {
        await create.mutateAsync(formData);
      } catch {
        return;
      }
    }
    setFormOpen(false);
    resetForm();
  };

  const handlePreview = (item: ModeloDocumento) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  const handleToggleAtivo = async (item: ModeloDocumento) => {
    await update.mutateAsync({ id: item.id, ativo: !item.ativo });
  };

  const handleImageFieldUpload = async (
    field: "logo_url" | "imagem_url",
    file: File | undefined,
  ) => {
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setFormData((current) => ({ ...current, [field]: dataUrl }));
      toast({
        title: "Imagem anexada",
        description: "A imagem foi incorporada ao modelo.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível anexar a imagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">
            Modelos de Documentos
            <Badge variant="secondary" className="ml-2">
              {modelos.length || 0} modelos
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="show-all-modelos-docs" checked={showAll} onCheckedChange={setShowAll} />
              <Label htmlFor="show-all-modelos-docs" className="text-sm text-muted-foreground">
                Mostrar inativos
              </Label>
            </div>
            <Button size="sm" onClick={() => handleOpenForm()} disabled={!modelosDisponiveis}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Modelo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!modelosDisponiveis && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Recurso indisponível neste ambiente: a tabela de modelos de documentos ainda não existe no banco.
            </div>
          )}

          {formOpen && (
            <div className="mb-6 rounded-lg border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-medium">
                    {editingItem ? "Editar modelo de documento" : "Novo modelo de documento"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cadastre modelos para emissão interna de documentos do CEFORT.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="nome-modelo-doc">Nome do modelo *</Label>
                <Input
                  id="nome-modelo-doc"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex.: Certificado de participação"
                />
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value as ModeloDocumento["tipo"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELO_TIPOS.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="descricao-modelo-doc">Descrição</Label>
                <Input
                  id="descricao-modelo-doc"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição interna do modelo"
                />
              </div>
              <div>
                <Label>Corpo do template</Label>
                <RichTextEditor
                  value={formData.corpo_template}
                  fontFamily={formData.fonte_familia}
                  fontSize={formData.fonte_tamanho}
                  fontWeight={formData.negrito ? 700 : 400}
                  textAlign={formData.alinhamento}
                  onChange={(value) =>
                    setFormData({ ...formData, corpo_template: value })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Fonte</Label>
                  <Select
                    value={formData.fonte_familia}
                    onValueChange={(value) => setFormData({ ...formData, fonte_familia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fonte-tamanho-modelo-doc">Tamanho da fonte</Label>
                  <Input
                    id="fonte-tamanho-modelo-doc"
                    type="number"
                    min={8}
                    max={72}
                    value={formData.fonte_tamanho}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fonte_tamanho: Number(e.target.value) || 14,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Alinhamento</Label>
                  <Select
                    value={formData.alinhamento}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        alinhamento: value as ModeloDocumento["alinhamento"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALIGNMENT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="inline-flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {option.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="negrito-modelo-doc"
                    checked={formData.negrito}
                    onCheckedChange={(checked) => setFormData({ ...formData, negrito: checked })}
                  />
                  <Label htmlFor="negrito-modelo-doc" className="inline-flex items-center gap-2">
                    <Bold className="h-4 w-4" />
                    Negrito
                  </Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="logo-url-modelo-doc">Logo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logo-url-modelo-doc"
                      value={
                        isEmbeddedImage(formData.logo_url)
                          ? "Imagem anexada ao modelo"
                          : formData.logo_url
                      }
                      readOnly={isEmbeddedImage(formData.logo_url)}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="https://... ou anexe uma imagem"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Anexar
                    </Button>
                  </div>
                  {formData.logo_url && (
                    <div className="mt-2 flex items-center gap-3 rounded-md border bg-background p-2">
                      <img
                        src={formData.logo_url}
                        alt="Prévia da logo"
                        className="h-10 w-16 rounded object-contain"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, logo_url: "" })}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleImageFieldUpload("logo_url", event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="imagem-url-modelo-doc">Imagem</Label>
                  <div className="flex gap-2">
                    <Input
                      id="imagem-url-modelo-doc"
                      value={
                        isEmbeddedImage(formData.imagem_url)
                          ? "Imagem anexada ao modelo"
                          : formData.imagem_url
                      }
                      readOnly={isEmbeddedImage(formData.imagem_url)}
                      onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                      placeholder="https://... ou anexe uma imagem"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => imagemInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Anexar
                    </Button>
                  </div>
                  {formData.imagem_url && (
                    <div className="mt-2 flex items-center gap-3 rounded-md border bg-background p-2">
                      <img
                        src={formData.imagem_url}
                        alt="Prévia da imagem"
                        className="h-10 w-16 rounded object-contain"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, imagem_url: "" })}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                  <input
                    ref={imagemInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleImageFieldUpload("imagem_url", event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div>
                <Label>Posição da imagem</Label>
                <Select
                  value={formData.imagem_posicao}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      imagem_posicao: value as ModeloDocumento["imagem_posicao"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_POSITIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-background p-3 space-y-2">
                <p className="text-sm font-medium">Variaveis disponiveis</p>
                <div className="space-y-1.5">
                  {TEMPLATE_VARIABLES.map((item) => (
                    <div key={item.key} className="text-xs sm:text-sm">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono mr-2">{item.key}</code>
                      <span className="text-muted-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Pre-visualizacao com dados de teste</Label>
                <div className="mt-2 bg-background rounded-lg border min-h-[120px]">
                  <TemplateVisual modelo={formData} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ordem-modelo-doc">Ordem de exibição</Label>
                  <Input
                    id="ordem-modelo-doc"
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="ativo-modelo-doc"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo-modelo-doc">Modelo ativo</Label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!modelosDisponiveis || !formData.nome || create.isPending || update.isPending}
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Ordem</TableHead>
                  <TableHead>Nome do modelo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelos.map((modelo) => (
                  <TableRow key={modelo.id} className={!modelo.ativo ? "opacity-50" : ""}>
                    <TableCell className="text-muted-foreground">{modelo.ordem}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {modelo.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {MODELO_TIPOS.find((t) => t.value === modelo.tipo)?.label || modelo.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {modelo.descricao || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={modelo.ativo ? "default" : "secondary"}>
                        {modelo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(modelo)} title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAtivo(modelo)}
                          title={modelo.ativo ? "Desativar" : "Ativar"}
                        >
                          {modelo.ativo ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(modelo)}
                          disabled={!modelosDisponiveis}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {modelos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum modelo de documento cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {previewItem?.nome}
            </DialogTitle>
            <DialogDescription>Visualização do template de documento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">
                  {MODELO_TIPOS.find((t) => t.value === previewItem?.tipo)?.label || "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Descrição:</span>
                <p className="font-medium">{previewItem?.descricao || "-"}</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Pré-visualização com dados de teste:</span>
              <div className="mt-2 bg-muted/20 rounded-lg border">
                {previewItem ? (
                  <TemplateVisual modelo={previewItem} />
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">Sem conteúdo definido.</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ModeloVisual = {
  corpo_template: string | null;
  fonte_familia: string;
  fonte_tamanho: number;
  negrito: boolean;
  alinhamento: ModeloDocumento["alinhamento"];
  logo_url: string | null;
  imagem_url: string | null;
  imagem_posicao: ModeloDocumento["imagem_posicao"];
};

type RichTextEditorProps = {
  value: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlign: ModeloDocumento["alinhamento"];
  onChange: (value: string) => void;
};

function RichTextEditor({
  value,
  fontFamily,
  fontSize,
  fontWeight,
  textAlign,
  onChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;

    const nextValue = normalizeTemplateForEditor(value || "");
    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue;
    }
  }, [value]);

  const syncEditorValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeTemplateHtml(editor.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, commandValue);
    syncEditorValue();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncEditorValue();
  };

  const handleLink = () => {
    const href = window.prompt("Informe o link");
    if (!href) return;
    runCommand("createLink", href);
  };

  const handleInlineImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      insertHtml(
        `<img src="${dataUrl}" alt="${escapeHtml(file.name)}" style="max-width:100%;height:auto;border-radius:6px;margin:12px 0;" />`,
      );
      toast({
        title: "Imagem anexada",
        description: "A imagem foi inserida no corpo do modelo.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível anexar a imagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const editorStyle: CSSProperties = {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight,
    textAlign,
  };

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <Select
          onValueChange={(block) =>
            runCommand("formatBlock", block === "normal" ? "p" : block)
          }
        >
          <SelectTrigger className="h-8 w-[132px]">
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Texto normal</SelectItem>
            <SelectItem value="h1">Título 1</SelectItem>
            <SelectItem value="h2">Título 2</SelectItem>
            <SelectItem value="h3">Título 3</SelectItem>
            <SelectItem value="blockquote">Citação</SelectItem>
          </SelectContent>
        </Select>

        <ToolbarButton title="Negrito" onClick={() => runCommand("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Itálico" onClick={() => runCommand("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Sublinhado" onClick={() => runCommand("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Alinhar à esquerda" onClick={() => runCommand("justifyLeft")}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Centralizar" onClick={() => runCommand("justifyCenter")}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Alinhar à direita" onClick={() => runCommand("justifyRight")}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Justificar" onClick={() => runCommand("justifyFull")}>
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Lista com marcadores" onClick={() => runCommand("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Citação" onClick={() => runCommand("formatBlock", "blockquote")}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Inserir link" onClick={handleLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Anexar imagem" onClick={() => imageInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInlineImage}
        />

        <Select onValueChange={(variable) => insertHtml(escapeHtml(variable))}>
          <SelectTrigger className="h-8 w-[132px]">
            <SelectValue placeholder="Variável" />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_VARIABLES.map((variable) => (
              <SelectItem key={variable.key} value={variable.key}>
                {variable.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton title="Desfazer" onClick={() => runCommand("undo")}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Refazer" onClick={() => runCommand("redo")}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Limpar formatação" onClick={() => runCommand("removeFormat")}>
          <Eraser className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div
        ref={editorRef}
        className="document-template-editor min-h-[260px] w-full overflow-auto px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
        contentEditable
        suppressContentEditableWarning
        style={editorStyle}
        onInput={syncEditorValue}
        onBlur={syncEditorValue}
        data-placeholder="Digite o texto do modelo, aplique formatações e anexe imagens."
      />
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function TemplateVisual({ modelo }: { modelo: ModeloVisual }) {
  const content = renderTemplatePreviewHtml(modelo.corpo_template || "");
  const textStyle: CSSProperties = {
    fontFamily: modelo.fonte_familia,
    fontSize: `${modelo.fonte_tamanho}px`,
    fontWeight: modelo.negrito ? 700 : 400,
    textAlign: modelo.alinhamento,
    lineHeight: 1.65,
  };
  const alignItems =
    modelo.alinhamento === "center"
      ? "items-center"
      : modelo.alinhamento === "right"
        ? "items-end"
        : "items-start";

  return (
    <div className={`flex flex-col gap-4 p-4 ${alignItems}`}>
      {modelo.logo_url && (
        <img
          src={modelo.logo_url}
          alt="Logo"
          className="max-h-20 max-w-[220px] object-contain"
        />
      )}
      {modelo.imagem_url && modelo.imagem_posicao === "top" && (
        <img
          src={modelo.imagem_url}
          alt="Imagem do modelo"
          className="max-h-64 w-full max-w-xl rounded-md object-contain"
        />
      )}
      {content ? (
        <div
          className="document-template-preview w-full"
          style={textStyle}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileImage className="h-4 w-4" />
          Sem conteúdo definido.
        </div>
      )}
      {modelo.imagem_url && modelo.imagem_posicao === "bottom" && (
        <img
          src={modelo.imagem_url}
          alt="Imagem do modelo"
          className="max-h-64 w-full max-w-xl rounded-md object-contain"
        />
      )}
    </div>
  );
}

function renderTemplatePreviewHtml(template: string): string {
  const content = replaceTemplateVariables(template);
  if (!content) return "";

  if (!isHtmlContent(content)) {
    return plainTextToHtml(content);
  }

  return sanitizeTemplateHtml(content);
}

function normalizeTemplateForEditor(template: string): string {
  if (!template) return "";

  if (!isHtmlContent(template)) {
    return plainTextToHtml(template);
  }

  return sanitizeTemplateHtml(template);
}

function replaceTemplateVariables(template: string): string {
  if (!template) return "";

  let output = template;
  TEMPLATE_VARIABLES.forEach((variable) => {
    output = output.replaceAll(variable.key, variable.sample);
  });
  return output;
}

function isHtmlContent(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function plainTextToHtml(content: string) {
  return escapeHtml(content)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function escapeHtml(content: string) {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeTemplateHtml(html: string) {
  if (!html || typeof window === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  root
    .querySelectorAll("script, style, iframe, object, embed, link, meta, form, input, button")
    .forEach((element) => element.remove());

  root.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === "href" || name === "src") {
        if (!isSafeTemplateUrl(value, name === "src")) {
          element.removeAttribute(attribute.name);
        }
        return;
      }

      if (name === "style") {
        const safeStyle = sanitizeInlineStyle(value);
        if (safeStyle) {
          element.setAttribute("style", safeStyle);
        } else {
          element.removeAttribute("style");
        }
        return;
      }

      if (!["alt", "title", "target", "rel"].includes(name)) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName.toLowerCase() === "a") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    }

    if (element.tagName.toLowerCase() === "img") {
      const currentStyle = element.getAttribute("style") || "";
      if (!currentStyle.includes("max-width")) {
        element.setAttribute(
          "style",
          `${currentStyle};max-width:100%;height:auto;`.replace(/^;/, ""),
        );
      }
    }
  });

  return root.innerHTML;
}

function isSafeTemplateUrl(value: string, allowImageDataUrl: boolean) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  if (allowImageDataUrl && trimmed.startsWith("data:image/")) return true;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:")
  );
}

function isEmbeddedImage(value: string | null | undefined) {
  return Boolean(value?.startsWith("data:image/"));
}

function sanitizeInlineStyle(style: string) {
  const allowedProperties = new Set([
    "background-color",
    "border-radius",
    "color",
    "display",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "height",
    "line-height",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "margin-top",
    "max-width",
    "text-align",
    "text-decoration",
    "width",
  ]);

  return style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const [property, ...valueParts] = declaration.split(":");
      const normalizedProperty = property.trim().toLowerCase();
      const value = valueParts.join(":").trim();
      const unsafeValue = /javascript:|expression\(|url\(/i.test(value);
      if (!allowedProperties.has(normalizedProperty) || !value || unsafeValue) {
        return "";
      }
      return `${normalizedProperty}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

async function readImageFileAsDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  if (file.size > MAX_TEMPLATE_IMAGE_SIZE_BYTES) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}
