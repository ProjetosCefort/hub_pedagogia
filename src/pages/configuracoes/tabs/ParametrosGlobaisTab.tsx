import { useState, useEffect } from "react";
import { Loader2, Save, Building2, Users, ClipboardList, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParametros, useMutateParametro, agruparParametrosPorCategoria, Parametro } from "@/hooks/useConfiguracoes";
import { GmailIntegrationCard } from "@/components/configuracoes/GmailIntegrationCard";

const categoryIcons: Record<string, React.ElementType> = {
  "Instituição": Building2,
  "Jovem Aprendiz": Users,
  "Atendimentos": ClipboardList,
  "Sistema": Settings,
};

export function ParametrosGlobaisTab() {
  const { data: parametros, isLoading } = useParametros();
  const { update } = useMutateParametro();
  
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Sincroniza valores editados com dados do servidor
  useEffect(() => {
    if (parametros) {
      const initialValues: Record<string, string> = {};
      parametros.forEach(p => {
        initialValues[p.id] = p.valor || "";
      });
      setEditedValues(initialValues);
    }
  }, [parametros]);

  const handleValueChange = (id: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (parametro: Parametro) => {
    const newValue = editedValues[parametro.id];
    if (newValue === parametro.valor) return;
    
    setSavingIds(prev => new Set([...prev, parametro.id]));
    try {
      await update.mutateAsync({ id: parametro.id, valor: newValue });
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(parametro.id);
        return next;
      });
    }
  };

  const hasChanges = (parametro: Parametro) => {
    return editedValues[parametro.id] !== parametro.valor;
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

  const groupedParams = parametros ? agruparParametrosPorCategoria(parametros) : {};

  const renderParametroInput = (parametro: Parametro) => {
    const value = editedValues[parametro.id] || "";
    const isSaving = savingIds.has(parametro.id);
    const changed = hasChanges(parametro);

    switch (parametro.tipo) {
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(parametro.id, e.target.value)}
            disabled={!parametro.editavel || isSaving}
            className={changed ? "border-amber-400" : ""}
          />
        );
      
      case "boolean":
        return (
          <Select
            value={value}
            onValueChange={(v) => handleValueChange(parametro.id, v)}
            disabled={!parametro.editavel || isSaving}
          >
            <SelectTrigger className={changed ? "border-amber-400" : ""}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case "select": {
        const options = parametro.opcoes_select 
          ? JSON.parse(parametro.opcoes_select) 
          : parametro.valor?.split(",").map(o => o.trim()) || [];
        return (
          <Select
            value={value}
            onValueChange={(v) => handleValueChange(parametro.id, v)}
            disabled={!parametro.editavel || isSaving}
          >
            <SelectTrigger className={changed ? "border-amber-400" : ""}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(parametro.id, e.target.value)}
            disabled={!parametro.editavel || isSaving}
            className={changed ? "border-amber-400" : ""}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <GmailIntegrationCard />

      {Object.entries(groupedParams).map(([categoria, params]) => {
        const Icon = categoryIcons[categoria] || Settings;
        
        return (
          <Card key={categoria}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Icon className="w-5 h-5 text-muted-foreground" />
                {categoria}
              </CardTitle>
              <CardDescription>
                Configurações relacionadas a {categoria.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {params.map((parametro) => {
                  const isSaving = savingIds.has(parametro.id);
                  const changed = hasChanges(parametro);
                  
                  return (
                    <div key={parametro.id} className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={parametro.chave} className="flex items-center gap-2">
                          {parametro.nome_exibicao}
                          {!parametro.editavel && (
                            <span className="text-xs text-muted-foreground">(somente leitura)</span>
                          )}
                        </Label>
                        {changed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(parametro)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-1" />
                                Salvar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          {renderParametroInput(parametro)}
                        </div>
                      </div>
                      {parametro.descricao && (
                        <p className="text-xs text-muted-foreground">
                          {parametro.descricao}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {Object.keys(groupedParams).length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            Nenhum parâmetro configurado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
