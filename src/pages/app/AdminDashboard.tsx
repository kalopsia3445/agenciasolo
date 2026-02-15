import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Users, FileText, TrendingUp, Activity, Shield, Loader2, ArrowLeft, BarChart3 } from "lucide-react";

interface AdminStats {
  users: {
    total: number;
    newWeek: number;
    newMonth: number;
    activeToday: number;
  };
  scripts: {
    total: number;
    today: number;
    week: number;
    generationsToday: number;
  };
  brandKits: number;
  topNiches: { niche: string; count: number }[];
  recentUsers: { id: string; email: string; createdAt: string; lastSignIn: string | null }[];
  scriptsByDay: Record<string, number>;
}

const ADMIN_EMAILS = ["kalopsia3445@gmail.com"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || "");

  useEffect(() => {
    if (!isAdmin || !supabase) {
      setLoading(false);
      return;
    }

    supabase.functions
      .invoke("admin-stats")
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setStats(data as AdminStats);
        }
        setLoading(false);
      });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold">Acesso negado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Você não tem permissão para acessar esta página.</p>
            <Button className="mt-4" onClick={() => navigate("/app/generate")}>Voltar ao app</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive font-medium">Erro: {error}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  // Últimos 7 dias para o mini gráfico
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const maxScriptsDay = Math.max(...last7Days.map((d) => stats.scriptsByDay[d] || 0), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/app/generate")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold font-[Space_Grotesk]">
              <span className="text-gradient">Admin</span> Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            {user?.email}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Usuários</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.users.total}</p>
              <p className="text-xs text-muted-foreground">+{stats.users.newWeek} esta semana</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Ativos hoje</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.users.activeToday}</p>
              <p className="text-xs text-muted-foreground">{stats.scripts.generationsToday} gerações</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Roteiros</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.scripts.total}</p>
              <p className="text-xs text-muted-foreground">+{stats.scripts.week} esta semana</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Onboarding</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.brandKits}</p>
              <p className="text-xs text-muted-foreground">
                {stats.users.total > 0 ? Math.round((stats.brandKits / stats.users.total) * 100) : 0}% dos usuários
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de scripts por dia (últimos 7 dias) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Roteiros gerados (últimos 7 dias)</h3>
            </div>
            <div className="flex items-end gap-1 h-32">
              {last7Days.map((day) => {
                const count = stats.scriptsByDay[day] || 0;
                const height = Math.max((count / maxScriptsDay) * 100, 4);
                const dayLabel = new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{count}</span>
                    <div
                      className="w-full rounded-t gradient-primary transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground capitalize">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Nichos */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">🎯 Top Nichos</h3>
              {stats.topNiches.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum dado ainda</p>
              ) : (
                <div className="space-y-2">
                  {stats.topNiches.map((n, i) => (
                    <div key={n.niche} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-sm">{n.niche}</span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{n.count} usuários</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimos usuários */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">👥 Últimos cadastros</h3>
              {!stats.recentUsers?.length ? (
                <p className="text-xs text-muted-foreground">Nenhum dado ainda</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 mr-2">{u.email}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
