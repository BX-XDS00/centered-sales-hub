import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Briefcase, CheckCircle2, DollarSign, Users, TrendingUp, Activity, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Lead {
  id: string;
  name: string;
  company: string | null;
  status: string;
  value: number;
  assigned_to: string | null;
  updated_at: string;
}

function Dashboard() {
  const { role, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activitiesCount, setActivitiesCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [recentSales, setRecentSales] = useState<Array<{ trans_no: string; sales_date: string | null; cust_no: string | null; emp_no: string | null }>>([]);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
      setLeads(l ?? []);
      const { count: a } = await supabase.from("activities").select("*", { count: "exact", head: true });
      setActivitiesCount(a ?? 0);
      if (role === "admin" || role === "super_admin") {
        const { count: u } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        setUsersCount(u ?? 0);
      }
      const { count: sc } = await supabase.from("sales").select("*", { count: "exact", head: true });
      setSalesCount(sc ?? 0);
      const { data: s } = await supabase
        .from("sales")
        .select("trans_no,sales_date,cust_no,emp_no")
        .order("sales_date", { ascending: false })
        .limit(8);
      setRecentSales(s ?? []);
    })();
  }, [role]);

  const won = leads.filter((l) => l.status === "won");
  const active = leads.filter((l) => !["won", "lost", "archived"].includes(l.status));
  const pipelineValue = active.reduce((s, l) => s + Number(l.value || 0), 0);
  const wonValue = won.reduce((s, l) => s + Number(l.value || 0), 0);

  const isManager = role === "admin" || role === "super_admin";

  return (
    <div className="space-y-10">
      <header className="text-center">
        <Badge variant="secondary" className="mb-3 capitalize">{role?.replace("_", " ")} workspace</Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {isManager ? "Team performance overview" : "Your sales dashboard"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={isManager ? "Team revenue" : "Deals won"}
          value={`$${wonValue.toLocaleString()}`}
          hint={`${won.length} closed`}
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          label="Pipeline value"
          value={`$${pipelineValue.toLocaleString()}`}
          hint={`${active.length} active`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Activities logged"
          value={activitiesCount}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label={isManager ? "Active users" : "Win rate"}
          value={isManager ? usersCount : `${leads.length ? Math.round((won.length / leads.length) * 100) : 0}%`}
          icon={isManager ? <Users className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
        />
      </section>

      <section className="mx-auto max-w-4xl">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent leads</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/leads">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="h-7 w-7" />}
                title="No leads yet"
                description="Add your first lead to start tracking your pipeline."
                action={<Button asChild><Link to="/leads">Add a lead</Link></Button>}
              />
            ) : (
              <ul className="divide-y divide-border">
                {leads.slice(0, 6).map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link to="/leads/$id" params={{ id: l.id }} className="font-medium hover:underline">
                        {l.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{l.company ?? "—"}</div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <Badge variant="outline" className="capitalize">{l.status.replace("_", " ")}</Badge>
                      <span className="text-sm font-semibold">${Number(l.value).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-4xl">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="font-display">Recent sales ({salesCount.toLocaleString()})</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <EmptyState icon={<DollarSign className="h-7 w-7" />} title="No sales yet" description="Sales transactions will appear here." />
            ) : (
              <ul className="divide-y divide-border">
                {recentSales.map((s) => (
                  <li key={s.trans_no} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-mono">{s.trans_no}</span>
                    <span className="text-muted-foreground">{s.sales_date ?? "—"}</span>
                    <span>Cust {s.cust_no ?? "—"}</span>
                    <span className="text-muted-foreground">Emp {s.emp_no ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {!isManager && (
        <p className="text-center text-xs text-muted-foreground">
          <CheckCircle2 className="mr-1 inline h-3 w-3 text-success" /> You see only the leads assigned to you.
        </p>
      )}
    </div>
  );
}
