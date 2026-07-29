import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <Card className="card-elevated">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Construction className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Módulo em Desenvolvimento</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Esta funcionalidade será implementada nas próximas versões do sistema.
            A estrutura do banco de dados já está preparada para receber os dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
