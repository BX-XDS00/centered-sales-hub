import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Phone, Mail, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  component: LeadDetail,
});

const STATUSES = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived"] as const;
const ACTIVITY_TYPES = [
  { v: "call", icon: Phone },
  { v: "email", icon: Mail },
  { v: "meeting", icon: FileText },
  { v: "note", icon: FileText },
] as const;

function LeadDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState<string>("note");
  const [activityContent, setActivityContent] = useState("");

  const load = async () => {
    const { data: l } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
    setLead(l);
    const { data: a } = await supabase.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false });
    setActivities(a ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const updateField = async (field: string, value: any) => {
    const { error } = await supabase.from("leads").update({ [field]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    setLead((p: any) => ({ ...p, [field]: value }));
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityContent.trim() || !user) return;
    const { error } = await supabase.from("activities").insert({
      lead_id: id, user_id: user.id, type: activityType as any, content: activityContent.trim(),
    });
    if (error) return toast.error(error.message);
    setActivityContent("");
    load();
  };

  const deleteLead = async () => {
    if (!confirm("Permanently delete this lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lead deleted");
    router.navigate({ to: "/leads" });
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!lead) return <div className="text-center text-muted-foreground">Lead not found.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link to="/leads"><ArrowLeft className="mr-1 h-4 w-4" /> Back to leads</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold tracking-tight">{lead.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lead.company ?? "—"}</p>
      </div>

      <Card className="border-border/70 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-center font-display">Lead details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={lead.name} onChange={(v) => updateField("name", v)} />
          <Field label="Company" value={lead.company ?? ""} onChange={(v) => updateField("company", v || null)} />
          <Field label="Email" value={lead.email ?? ""} onChange={(v) => updateField("email", v || null)} />
          <Field label="Phone" value={lead.phone ?? ""} onChange={(v) => updateField("phone", v || null)} />
          <Field label="Value (USD)" type="number" value={String(lead.value)} onChange={(v) => updateField("value", Number(v) || 0)} />
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={lead.status} onValueChange={(v) => updateField("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={lead.notes ?? ""} onChange={(e) => setLead((p: any) => ({ ...p, notes: e.target.value }))} onBlur={(e) => updateField("notes", e.target.value || null)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-center font-display">Activity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addActivity} className="flex flex-col items-center gap-3">
            <div className="grid w-full gap-3 sm:grid-cols-[160px_1fr]">
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((a) => <SelectItem key={a.v} value={a.v} className="capitalize">{a.v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Log a call, email, or note…" value={activityContent} onChange={(e) => setActivityContent(e.target.value)} />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={!activityContent.trim()}>Add activity</Button>
          </form>

          {activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activities.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <Badge variant="secondary" className="capitalize">{a.type}</Badge>
                    <p className="mt-1 text-sm">{a.content}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {role === "super_admin" && (
        <div className="flex justify-center">
          <Button variant="destructive" size="sm" onClick={deleteLead}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Permanently delete (Super Admin)
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onChange(v)} />
    </div>
  );
}
