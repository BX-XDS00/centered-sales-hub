import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "admin" | "super_admin";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (uid: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    if (!data || data.length === 0) return setRole("user");
    const roles = data.map((r) => r.role as AppRole);
    if (roles.includes("super_admin")) setRole("super_admin");
    else if (roles.includes("admin")) setRole("admin");
    else setRole("user");
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const uid = s.user.id;
        setTimeout(async () => {
          // Check blocked
          const { data: prof } = await supabase.from("profiles").select("blocked").eq("id", uid).maybeSingle();
          if (prof?.blocked) {
            await supabase.auth.signOut();
            if (typeof window !== "undefined") {
              window.location.href = "/login?blocked=1";
            }
            return;
          }
          fetchRole(uid);
          if (event === "SIGNED_IN") {
            supabase.from("login_events").insert({
              user_id: uid,
              user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            });
          }
        }, 0);
      } else {
        setRole(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchRole(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRole = async () => {
    if (user) await fetchRole(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
