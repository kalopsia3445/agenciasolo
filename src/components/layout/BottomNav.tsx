import { Sparkles, BookOpen, Palette, PenTool, BarChart3, CreditCard, Crown, User, Zap } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAILS = ["kalopsia3445@gmail.com"];

const baseItems = [
  { to: "/app/generate", label: "Gerar", icon: Zap },
  { to: "/app/library", label: "Biblioteca", icon: BookOpen },
  { to: "/app/brand-kit", label: "Marca", icon: PenTool },
  { to: "/app/packs", label: "Packs", icon: Palette },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || "");
  const tier = profile?.subscription_status || 'free';
  const isPaid = tier !== 'free';

  let items = [...baseItems];

  if (isAdmin) {
    items.push({ to: "/app/admin", label: "Admin", icon: BarChart3 });
  }

  items.push({
    to: "/app/checkout",
    label: isPaid ? "Status" : "Assinar",
    icon: isPaid ? Crown : CreditCard
  });

  items.push({ to: "/app/profile", label: "Perfil", icon: User });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-sm")} />
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
