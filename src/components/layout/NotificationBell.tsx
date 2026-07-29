import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotificacoes } from "@/hooks/useNotificacoes";

export function NotificationBell() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { notifications, unreadCount, loading, hasAccess, markAsRead, markAllAsRead } = useNotificacoes();

  const bellIndicator = useMemo(() => {
    if (loading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    return <Bell className="h-5 w-5" />;
  }, [loading]);

  if (!hasAccess) {
    return null;
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          {bellIndicator}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">Nenhuma notificação</div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 py-3",
                    !notification.lida && "bg-primary/5",
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{notification.related_entity_type ?? "geral"}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{notification.mensagem}</p>
                  {!notification.lida && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Marcar como lida</span>
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
