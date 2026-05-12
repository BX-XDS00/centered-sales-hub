import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Plus, Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads/")({
  component: LeadsPage,
});

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: string;
  value: number;
  assigned_to: string | null;
  updated_at: string;
}

const STATUSES = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived"] as const;

function LeadsPage() {
  const { user, role } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
    setLeads(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const visible = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Leads</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {role === "user" ? "Your assigned leads and pipeline" : "All leads across the team"}
        </p>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1.5 h-4 w-4" /> New lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a new lead</DialogTitle></DialogHeader>
            <NewLeadForm onCreated={() => { setOpen(false); load(); }} userId={user!.id} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-7 w-7" />}
            title="No leads to show"
            description="Add a new lead to populate your pipeline."
          />
        ) : (
          <Card className="border-border/70 shadow-[var(--shadow-card)]">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {visible.map((l) => (
                  <li key={l.id}>
                    <Link to="/leads/$id" params={{ id: l.id }} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{l.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{l.company ?? "—"} · {l.email ?? "no email"}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">{l.status.replace("_", " ")}</Badge>
                        <span className="w-24 text-right text-sm font-semibold">${Number(l.value).toLocaleString()}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NewLeadForm({ onCreated, userId }: { onCreated: () => void; userId: string }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [value, setValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      name, company: company || null, email: email || null, phone: phone || null,
      value: Number(value) || 0, notes: notes || null,
      created_by: userId, assigned_to: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lead created");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="flex flex-col items-center gap-3">
      <div className="w-full space-y-1.5"><Label>Contact name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="w-full space-y-1.5"><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
      <div className="grid w-full grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </div>
      <div className="w-full space-y-1.5"><Label>Estimated value (USD)</Label><Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} /></div>
      <div className="w-full space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create lead
      </Button>
    </form>
  );
}
