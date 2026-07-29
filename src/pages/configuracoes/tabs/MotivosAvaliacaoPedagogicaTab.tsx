import { useState } from "react";
import { Plus, Pencil, Loader2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useMotivosAvaliacaoPedagogica,
  useMutateMotivoAvaliacaoPedagogica,
  MotivoAvaliacaoPedagogica,
} from "@/hooks/useConfiguracoes";

export function MotivosAvaliacaoPedagogicaTab() {
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MotivoAvaliacaoPedagogica | null>(null);

  const { data: itens, isLoading } = useMotivosAvaliacaoPedagogica(!showAll);
  const { create, update, remove } = useMutateMotivoAvaliacaoPedagogica();

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    categoria: "",
    ativo: true,
    ordem: 0,
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      categoria: "",
      ativo: true,
      ordem: 0,
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: MotivoAvaliacaoPedagogica) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        descricao: item.descricao || "",
        categoria: item.categoria || "",
        ativo: item.ativo,
        ordem: item.ordem,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await update.mutateAsync({ id: editingItem.id, ...formData });
      } else {
        await create.mutateAsync(formData);
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      // Mutation already handles toast feedback.
    }
  };

  const handleToggleAtivo = async (item: MotivoAvaliacaoPedagogica) => {
    try {
      await update.mutateAsync({ id: item.id, ativo: !item.ativo });
    } catch {
      // Mutation already handles toast feedback.
    }
  };

  const handleDelete = async (item: MotivoAvaliacaoPedagogica) => {
    try {
      await remove.mutateAsync({ id: item.id, nome: item.nome });
    } catch {
      // Mutation already handles toast feedback.
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">
          Tipos de Abordagem Pedagógica
          <Badge variant="secondary" className="ml-2">
            {itens?.length || 0} itens
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-all-motivos-pedagogicos"
              checked={showAll}
              onCheckedChange={setShowAll}
            />
            <Label
              htmlFor="show-all-motivos-pedagogicos"
              className="text-sm text-muted-foreground"
            >
              Mostrar inativos
            </Label>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Tipo" : "Novo Tipo de Abordagem"}
                </DialogTitle>
                <DialogDescription>
                  Este tipo ficará disponível no campo "Tipo de abordagem pedagógica" da Avaliação Pedagógica.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="nome-motivo-pedagogico">Nome *</Label>
                  <Input
                    id="nome-motivo-pedagogico"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Defasagem de aprendizagem"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao-motivo-pedagogico">Descrição</Label>
                  <Textarea
                    id="descricao-motivo-pedagogico"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoria-motivo-pedagogico">Categoria</Label>
                    <Input
                      id="categoria-motivo-pedagogico"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder="Ex: Aprendizagem"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ordem-motivo-pedagogico">Ordem</Label>
                    <Input
                      id="ordem-motivo-pedagogico"
                      type="number"
                      value={formData.ordem}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ordem: Number.parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="ativo-motivo-pedagogico"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo-motivo-pedagogico">Ativo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.nome || create.isPending || update.isPending}>
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens?.map((item) => (
                <TableRow key={item.id} className={!item.ativo ? "opacity-50" : ""}>
                  <TableCell className="text-muted-foreground">{item.ordem}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {item.categoria ? <Badge variant="outline">{item.categoria}</Badge> : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                    {item.descricao}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ativo ? "default" : "secondary"}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAtivo(item)}
                        title={item.ativo ? "Desativar" : "Ativar"}
                      >
                        {item.ativo ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            disabled={remove.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir tipo de abordagem?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A exclusão só será permitida se este tipo não estiver vinculado a nenhuma avaliação pedagógica.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!itens || itens.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum tipo de abordagem cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
