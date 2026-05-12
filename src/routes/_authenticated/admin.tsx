import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  leadCount: number;
  wonValue: number;
}

function AdminPage() {
  const { role } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: leads }] = await Promise.all([
      supabase.from("profiles").select("id, full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("leads").select("id, name, status, value, assigned_to"),
    ]);

    const roleByUser = new Map<string, string>();
    (roles ?? []).forEach((r) => {
      const cur = roleByUser.get(r.user_id);
      const rank: Record<string, number> = { user: 1, admin: 2, super_admin: 3 };
      if (!cur || rank[r.role] > rank[cur]) roleByUser.set(r.user_id, r.role);
    });

    const leadsByUser = new Map<string, any[]>();
    (leads ?? []).forEach((l) => {
      if (!l.assigned_to) return;
      const arr = leadsByUser.get(l.assigned_to) ?? [];
      arr.push(l);
      leadsByUser.set(l.assigned_to, arr);
    });

    setMembers(
      (profiles ?? []).map((p) => {
        const userLeads = leadsByUser.get(p.id) ?? [];
        return {
          id: p.id,
          full_name: p.full_name,
          role: roleByUser.get(p.id) ?? "user",
          leadCount: userLeads.length,
          wonValue: userLeads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.value || 0), 0),
        };
      }),
    );
    setUnassigned((leads ?? []).filter((l) => !l.assigned_to));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setRoleFor = async (userId: string, newRole: string) => {
    if (role !== "super_admin" && newRole === "super_admin") {
      return toast.error("Only Super Admins can grant Super Admin role.");
    }
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const assignLead = async (leadId: string, userId: string) => {
    const { error } = await (supabase.from("leads").update as any)({ assigned_to: userId }).eq("id", leadId);
    if (error) return toast.error(error.message);
    toast.success("Lead assigned");
    load();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const sorted = [...members].sort((a, b) => b.wonValue - a.wonValue);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <Badge variant="secondary" className="mb-3">Manager view</Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Team & lead routing</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage roles, assign leads, and track rep performance.</p>
      </header>

      <div className="mx-auto max-w-4xl">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-center font-display">Leaderboard</CardTitle></CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title="No team members yet" />
            ) : (
              <ul className="divide-y divide-border">
                {sorted.map((m, i) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-sm font-semibold">{i + 1}</span>
                      <div>
                        <div className="font-medium">{m.full_name ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{m.leadCount} leads</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">${m.wonValue.toLocaleString()}</span>
                      <Select value={m.role} onValueChange={(v) => setRoleFor(m.id, v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {role === "super_admin" && <SelectItem value="super_admin">Super Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {unassigned.length > 0 && (
        <div className="mx-auto max-w-4xl">
          <Card className="border-border/70 shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-center font-display">Unassigned leads</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {unassigned.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{l.status.replace("_", " ")}</div>
                    </div>
                    <Select onValueChange={(v) => assignLead(l.id, v)}>
                      <SelectTrigger className="w-56"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? "Unnamed"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
