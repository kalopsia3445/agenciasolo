import { Sparkles } from "lucide-react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { getDailyUsage } from "@/lib/demo-store";
import { DAILY_LIMIT } from "@/types/schema";

export function AppLayout() {
  const usage = getDailyUsage();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <h1 className="text-lg font-bold font-[Space_Grotesk]">
            <span className="text-gradient">Solo</span>Reels
          </h1>
          <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Hoje: {usage.count}/{DAILY_LIMIT}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-20 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
