import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ADMIN_EMAILS = ["kalopsia3445@gmail.com", "frds3445@gmail.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verificar auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se é admin
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Usar service_role pra queries administrativas
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar estatísticas
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Total de usuários (excluindo admins)
    const { data: { users: allUsersRaw }, error: usersError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    const allUsers = (allUsersRaw || []).filter(u => !ADMIN_EMAILS.includes(u.email || ""));
    const adminIds = (allUsersRaw || []).filter(u => ADMIN_EMAILS.includes(u.email || "")).map(u => u.id);

    const totalUsers = allUsers.length;

    // Usuários novos últimos 7 dias
    const newUsersWeek = allUsers.filter((u) => u.created_at >= sevenDaysAgo).length || 0;

    // Usuários novos últimos 30 dias
    const newUsersMonth = allUsers.filter((u) => u.created_at >= thirtyDaysAgo).length || 0;

    // Total de scripts gerados (excluindo admins)
    const { count: totalScripts } = await admin
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .not("user_id", "in", `(${adminIds.join(",")})`);

    // Scripts gerados hoje
    const { count: scriptsToday } = await admin
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`)
      .not("user_id", "in", `(${adminIds.join(",")})`);

    // Scripts últimos 7 dias
    const { count: scriptsWeek } = await admin
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${sevenDaysAgo}T00:00:00`)
      .not("user_id", "in", `(${adminIds.join(",")})`);

    // Total de brand kits (= usuários que completaram onboarding)
    const { count: totalBrandKits } = await admin
      .from("brand_kits")
      .select("*", { count: "exact", head: true })
      .not("user_id", "in", `(${adminIds.join(",")})`);

    // Uso diário hoje
    const { data: usageToday } = await admin
      .from("daily_usage")
      .select("count")
      .eq("usage_date", today)
      .not("user_id", "in", `(${adminIds.join(",")})`);

    const totalGenerationsToday = usageToday?.reduce((sum: number, u: any) => sum + (u.count || 0), 0) || 0;
    const activeUsersToday = usageToday?.length || 0;

    // Estatísticas de Assinatura
    const { data: profileStats } = await admin
      .from("profiles")
      .select("id, subscription_status")
      .not("id", "in", `(${adminIds.join(",")})`);

    const subsCount = { free: 0, basic: 0, pro: 0, enterprise: 0 };
    profileStats?.forEach((p: any) => {
      const s = (p.subscription_status || 'free') as keyof typeof subsCount;
      if (subsCount.hasOwnProperty(s)) {
        subsCount[s]++;
      } else {
        subsCount.free++;
      }
    });

    const mrr = (subsCount.basic * 37) + (subsCount.pro * 67) + (subsCount.enterprise * 127);

    // Top nichos
    const { data: nicheData } = await admin
      .from("brand_kits")
      .select("niche");

    const nicheCounts: Record<string, number> = {};
    nicheData?.forEach((bk: any) => {
      nicheCounts[bk.niche] = (nicheCounts[bk.niche] || 0) + 1;
    });
    const topNiches = Object.entries(nicheCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([niche, count]) => ({ niche, count }));

    // Últimos usuários cadastrados + status
    const recentUsers = allUsers
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map((u) => {
        const profile = profileStats?.find((p: any) => p.id === u.id);
        return {
          id: u.id,
          email: u.email,
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at,
          subscriptionStatus: profile?.subscription_status || 'free'
        };
      });

    // Scripts por dia (últimos 30 dias)
    const { data: scriptsRaw } = await admin
      .from("scripts")
      .select("created_at")
      .gte("created_at", `${thirtyDaysAgo}T00:00:00`);

    const scriptsByDay: Record<string, number> = {};
    scriptsRaw?.forEach((s: any) => {
      const day = s.created_at.split("T")[0];
      scriptsByDay[day] = (scriptsByDay[day] || 0) + 1;
    });

    const stats = {
      users: {
        total: totalUsers,
        newWeek: newUsersWeek,
        newMonth: newUsersMonth,
        activeToday: activeUsersToday,
      },
      scripts: {
        total: totalScripts || 0,
        today: scriptsToday || 0,
        week: scriptsWeek || 0,
        generationsToday: totalGenerationsToday,
      },
      brandKits: totalBrandKits || 0,
      subscriptions: subsCount,
      mrr,
      topNiches,
      recentUsers,
      scriptsByDay,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
