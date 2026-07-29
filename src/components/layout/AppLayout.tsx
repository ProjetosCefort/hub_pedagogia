import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border/70 bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" aria-label="Abrir menu lateral">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
            </div>
          </header>
          <main className="app-main flex-1 overflow-auto">
            <div className="app-content-container">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
