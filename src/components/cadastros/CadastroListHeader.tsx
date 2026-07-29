import { ReactNode } from "react";
import { Input } from "@/components/ui/input";

interface CadastroListHeaderProps {
  title: string;
  description: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function CadastroListHeader({
  title,
  description,
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  actions,
  filters,
}: CadastroListHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="page-header mb-0">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
          {filters}
        </div>
        {actions}
      </div>
    </div>
  );
}

