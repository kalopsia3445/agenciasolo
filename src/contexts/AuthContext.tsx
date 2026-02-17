import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isDemoMode } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  isDemoMode: boolean;
  isAdmin: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_EMAILS = ["kalopsia3445@gmail.com", "frds3445@gmail.com"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(!isDemoMode);

  async function fetchProfile(uid: string) {
    const { data } = await supabase!
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data);
  }

  useEffect(() => {
    if (isDemoMode || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Demo mode");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error("Demo mode");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    if (!supabase) throw new Error("Demo mode");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
  const isDemo = !loading && !isAdmin && (!profile || profile.subscription_status === 'free');

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isDemoMode, isAdmin, isDemo, signIn, signUp, signOut, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
