import { useState, useEffect } from "react";
import { Sparkles, LogOut, Shield } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { getDailyUsage } from "@/lib/data-service";
import { DAILY_LIMIT } from "@/types/schema";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const ADMIN_EMAILS = ["kalopsia3445@gmail.com"];

export function AppLayout() {
  const { user, isDemoMode, signOut } = useAuth();
  const navigate = useNavigate();
  const [usageCount, setUsageCount] = useState(0);
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || "");

  useEffect(() => {
    getDailyUsage().then((u) => setUsageCount(u.count));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <h1 className="text-lg font-bold font-[Space_Grotesk]">
            <span className="text-gradient">Solo</span>Reels
          </h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/app/admin")}>
                <Shield className="h-4 w-4 text-primary" />
              </Button>
            )}
            <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Hoje: {usageCount}/{DAILY_LIMIT}</span>
            </div>
            {!isDemoMode && user && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
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
