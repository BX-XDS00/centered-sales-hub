import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import { ShieldCheck, Loader2, Ban, CheckCircle2, History, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

interface TeamMember {
  id: string;
  full_name: string | null;
  role: "user" | "admin" | "super_admin";
  blocked: boolean;
  leadCount: number;
  wonValue: number;
  lastLogin: string | null;
}

function AdminPage() {
  const { role: viewerRole, user } = useAuth();
  const isSuper = viewerRole === "super_admin";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState<TeamMember | null>(null);
  const [history, setHistory] = useState<{ created_at: string; user_agent: string | null }[]>([]);
  const [editOpen, setEditOpen] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const nameOf = (id: string) => members.find((m) => m.id === id)?.full_name ?? id.slice(0, 8);

  const recordAudit = async (target: TeamMember, action: string, details?: any) => {
    if (!user) return;
    await (supabase.from("audit_log") as any).insert({
      actor_id: user.id,
      target_user_id: target.id,
      action,
      details: details ?? null,
    });
  };

  const loadAudit = async () => {
    const { data } = await (supabase.from("audit_log") as any)
      .select("id, actor_id, target_user_id, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setAuditLog(data ?? []);
  };

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: leads }, { data: logins }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, blocked"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("leads").select("id, name, status, value, assigned_to"),
      supabase.from("login_events").select("user_id, created_at").order("created_at", { ascending: false }),
    ]);
    loadAudit();

    const roleByUser = new Map<string, "user" | "admin" | "super_admin">();
    (roles ?? []).forEach((r) => {
      const cur = roleByUser.get(r.user_id);
      const rank: Record<string, number> = { user: 1, admin: 2, super_admin: 3 };
      if (!cur || rank[r.role] > rank[cur]) roleByUser.set(r.user_id, r.role as any);
    });

    const leadsByUser = new Map<string, any[]>();
    (leads ?? []).forEach((l) => {
      if (!l.assigned_to) return;
      const arr = leadsByUser.get(l.assigned_to) ?? [];
      arr.push(l);
      leadsByUser.set(l.assigned_to, arr);
    });

    const lastLoginByUser = new Map<string, string>();
    (logins ?? []).forEach((l) => {
      if (!lastLoginByUser.has(l.user_id)) lastLoginByUser.set(l.user_id, l.created_at);
    });

    setMembers(
      (profiles ?? []).map((p: any) => {
        const userLeads = leadsByUser.get(p.id) ?? [];
        return {
          id: p.id,
          full_name: p.full_name,
          role: roleByUser.get(p.id) ?? "user",
          blocked: !!p.blocked,
          leadCount: userLeads.length,
          wonValue: userLeads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.value || 0), 0),
          lastLogin: lastLoginByUser.get(p.id) ?? null,
        };
      }),
    );
    setUnassigned((leads ?? []).filter((l) => !l.assigned_to));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const canManage = (target: TeamMember) => {
    if (target.id === user?.id) return false;
    if (target.role === "super_admin") return false;
    if (target.role === "admin") return isSuper;
    return true; // regular user → admin or super
  };

  const setRoleFor = async (target: TeamMember, newRole: string) => {
    if (!canManage(target) && !(isSuper && target.role === "admin")) {
      return toast.error("You can't change this user's role.");
    }
    if (newRole === "super_admin") return toast.error("Super Admin role can't be assigned here.");
    const previous = target.role;
    await supabase.from("user_roles").delete().eq("user_id", target.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: target.id, role: newRole as any });
    if (error) return toast.error(error.message);
    await recordAudit(target, "role_change", { from: previous, to: newRole });
    toast.success("Role updated");
    load();
  };

  const removeAdmin = async (target: TeamMember) => {
    if (!isSuper) return toast.error("Only Super Admins can remove an admin.");
    if (target.role !== "admin") return;
    await supabase.from("user_roles").delete().eq("user_id", target.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: target.id, role: "user" as any });
    if (error) return toast.error(error.message);
    await recordAudit(target, "admin_removed", { from: "admin", to: "user" });
    toast.success("Admin removed");
    load();
  };

  const toggleBlock = async (target: TeamMember) => {
    if (!canManage(target)) return toast.error("You can't block this user.");
    const { error } = await (supabase.from("profiles").update as any)({ blocked: !target.blocked }).eq("id", target.id);
    if (error) return toast.error(error.message);
    await recordAudit(target, target.blocked ? "unblock" : "block");
    toast.success(target.blocked ? "User unblocked" : "User blocked");
    load();
  };

  const openHistory = async (m: TeamMember) => {
    setHistoryOpen(m);
    const { data } = await supabase
      .from("login_events")
      .select("created_at, user_agent")
      .eq("user_id", m.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(data ?? []);
  };

  const openEdit = (m: TeamMember) => {
    setEditOpen(m);
    setEditName(m.full_name ?? "");
  };

  const saveEdit = async () => {
    if (!editOpen) return;
    const { error } = await (supabase.from("profiles").update as any)({ full_name: editName }).eq("id", editOpen.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditOpen(null);
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
        <Badge variant="secondary" className="mb-3">{isSuper ? "Super Admin view" : "Manager view"}</Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Team & access management</h1>
        <p className="mt-2 text-sm text-muted-foreground">Edit profiles, review login history, and control access.</p>
      </header>

      <div className="mx-auto max-w-5xl">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-center font-display">Team members</CardTitle></CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title="No team members yet" />
            ) : (
              <ul className="divide-y divide-border">
                {sorted.map((m, i) => {
                  const manageable = canManage(m);
                  return (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-sm font-semibold">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-medium">
                            <span className="truncate">{m.full_name ?? "Unnamed"}</span>
                            {m.blocked && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
                            {m.role !== "user" && <Badge variant="outline" className="text-[10px] capitalize">{m.role.replace("_", " ")}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.leadCount} leads · ${m.wonValue.toLocaleString()} won · last login {m.lastLogin ? new Date(m.lastLogin).toLocaleString() : "never"}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openHistory(m)} title="Login history">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(m)} disabled={!manageable && !isSuper} title="Edit profile">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Select
                          value={m.role}
                          onValueChange={(v) => setRoleFor(m, v)}
                          disabled={m.role === "super_admin" || (m.role === "admin" && !isSuper) || m.id === user?.id}
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {m.role === "super_admin" && <SelectItem value="super_admin">Super Admin</SelectItem>}
                          </SelectContent>
                        </Select>
                        {isSuper && m.role === "admin" && (
                          <Button size="sm" variant="outline" onClick={() => removeAdmin(m)} title="Remove admin">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={m.blocked ? "outline" : "destructive"}
                          onClick={() => toggleBlock(m)}
                          disabled={!manageable}
                        >
                          {m.blocked ? <><CheckCircle2 className="mr-1 h-4 w-4" />Unblock</> : <><Ban className="mr-1 h-4 w-4" />Block</>}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {unassigned.length > 0 && (
        <div className="mx-auto max-w-5xl">
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
                        {members.filter((m) => !m.blocked).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? "Unnamed"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-center font-display">Audit log</CardTitle></CardHeader>
          <CardContent>
            {auditLog.length === 0 ? (
              <EmptyState icon={<History className="h-7 w-7" />} title="No admin actions yet" />
            ) : (
              <ul className="divide-y divide-border">
                {auditLog.map((e) => {
                  const label =
                    e.action === "block" ? "Blocked" :
                    e.action === "unblock" ? "Unblocked" :
                    e.action === "role_change" ? `Role changed (${e.details?.from ?? "?"} → ${e.details?.to ?? "?"})` :
                    e.action === "admin_removed" ? "Removed admin" : e.action;
                  return (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{label} — {nameOf(e.target_user_id)}</div>
                        <div className="text-xs text-muted-foreground">by {nameOf(e.actor_id)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!historyOpen} onOpenChange={(o) => !o && setHistoryOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Login history — {historyOpen?.full_name ?? "Unnamed"}</DialogTitle></DialogHeader>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No login events recorded.</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {history.map((h, i) => (
                <li key={i} className="rounded-md border border-border/60 p-2 text-xs">
                  <div className="font-medium">{new Date(h.created_at).toLocaleString()}</div>
                  <div className="text-muted-foreground truncate">{h.user_agent ?? "Unknown device"}</div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOpen} onOpenChange={(o) => !o && setEditOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">Full name</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditOpen(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
