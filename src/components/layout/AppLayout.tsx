import { useState, useEffect } from "react";
import { Sparkles, LogOut, Shield, User, Zap } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { getWeeklyUsage } from "@/lib/data-service";
import { WEEKLY_LIMITS, type SubscriptionTier } from "@/types/schema";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const ADMIN_EMAILS = ["kalopsia3445@gmail.com", "frds3445@gmail.com"];

const TIER_LABELS: Record<string, string> = {
  free: "Grátis",
  basic: "Básico",
  pro: "Pro",
  enterprise: "Enterprise"
};

export function AppLayout() {
  const { user, isDemoMode, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [usageCount, setUsageCount] = useState(0);
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || "");
  const tier = (profile?.subscription_status || "free") as SubscriptionTier;
  const limit = WEEKLY_LIMITS[tier] || WEEKLY_LIMITS.free;

  useEffect(() => {
    getWeeklyUsage().then((u) => setUsageCount(u.count));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
            <div className="h-12 w-12 flex-shrink-0 transition-all group-hover:scale-105">
              <img
                src="/logo-agencia-solo.png"
                alt="SoloReels"
                className="h-full w-full object-contain filter drop-shadow-[0_0_8px_rgba(232,80,26,0.3)]"
              />
            </div>
            <div className="flex flex-col items-start leading-none mt-1">
              <span className="text-[9px] uppercase tracking-widest text-primary font-black mb-0.5">Agência Solo</span>
              <h1 className="text-xl font-bold font-[Space_Grotesk]">
                <span className="text-gradient">Solo</span>Reels
              </h1>
            </div>
            {tier !== 'free' && (
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                {TIER_LABELS[tier]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/app/admin")}>
                <Shield className="h-4 w-4 text-primary" />
              </Button>
            )}

            <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium" onClick={() => navigate("/app/checkout")} style={{ cursor: 'pointer' }}>
              <Zap className="h-3 w-3 text-primary fill-primary" />
              <span>Semana: {usageCount}/{limit}</span>
            </div>

            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ml-1"
              onClick={() => navigate("/app/profile")}
            >
              <div className="h-8 w-8 rounded-full border border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={async () => {
                await signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
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
