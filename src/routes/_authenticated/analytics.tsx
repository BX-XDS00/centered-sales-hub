import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

interface Lead {
  id: string;
  status: string;
  value: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  company: string | null;
}

const STAGE_ORDER = ["new", "contacted", "qualified", "proposal", "negotiation", "won"] as const;
const STAGE_PROBABILITY: Record<string, number> = {
  new: 0.1,
  contacted: 0.25,
  qualified: 0.5,
  proposal: 0.7,
  negotiation: 0.9,
  won: 1,
  lost: 0,
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--success, 142 70% 45%))",
];

const TARGET = 100000;

function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from("leads").select("*");
      setLeads((l ?? []) as Lead[]);
      const { data: p } = await supabase.from("profiles").select("id, full_name");
      const map: Record<string, string> = {};
      (p ?? []).forEach((r: { id: string; full_name: string | null }) => {
        map[r.id] = r.full_name ?? "Unknown";
      });
      setProfiles(map);
    })();
  }, []);

  const funnelData = useMemo(
    () =>
      STAGE_ORDER.map((s, i) => ({
        name: s.charAt(0).toUpperCase() + s.slice(1),
        value: leads.filter((l) => l.status === s).length || 0,
        fill: COLORS[i % COLORS.length],
      })).filter((d) => d.value > 0 || true),
    [leads],
  );

  const trendData = useMemo(() => {
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = d.toLocaleString("en", { month: "short" });
      buckets.set(k, 0);
    }
    leads.forEach((l) => {
      if (l.status !== "won") return;
      const d = new Date(l.updated_at);
      const k = d.toLocaleString("en", { month: "short" });
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + Number(l.value || 0));
    });
    return Array.from(buckets, ([month, revenue]) => ({ month, revenue }));
  }, [leads]);

  const wonValue = leads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.value || 0), 0);
  const attainment = Math.min(100, Math.round((wonValue / TARGET) * 100));
  const gaugeData = [{ name: "Attainment", value: attainment, fill: "hsl(var(--primary))" }];

  const repData = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      if (!l.assigned_to) return;
      map.set(l.assigned_to, (map.get(l.assigned_to) ?? 0) + Number(l.value || 0));
    });
    return Array.from(map, ([id, value]) => ({
      name: (profiles[id] ?? id.slice(0, 6)).split(" ")[0],
      value,
    })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [leads, profiles]);

  const pipelineData = useMemo(() => {
    const out: { stage: string; weighted: number; raw: number }[] = [];
    STAGE_ORDER.filter((s) => s !== "won").forEach((s) => {
      const stageLeads = leads.filter((l) => l.status === s);
      const raw = stageLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);
      out.push({
        stage: s.charAt(0).toUpperCase() + s.slice(1),
        weighted: Math.round(raw * (STAGE_PROBABILITY[s] ?? 0)),
        raw,
      });
    });
    return out;
  }, [leads]);

  const winLossData = useMemo(() => {
    const won = leads.filter((l) => l.status === "won").length;
    const lost = leads.filter((l) => l.status === "lost").length;
    return [
      { name: "Won", value: won, fill: "hsl(var(--primary))" },
      { name: "Lost", value: lost, fill: "hsl(var(--destructive))" },
    ];
  }, [leads]);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <Badge variant="secondary" className="mb-3">Sales analytics</Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Performance & pipeline insights
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Six core visuals to monitor funnel health, trends, targets, and team performance.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Sales funnel"
          description="Volume of deals at each stage. Identifies bottlenecks where prospects drop out."
        >
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Sales trend"
          description="Closed-won revenue over the last 6 months. Spot growth, decline, and seasonality."
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={`Quota attainment — $${TARGET.toLocaleString()} target`}
          description="Real-time progress vs. team goal."
        >
          <div className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={gaugeData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--muted))" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
              <div className="font-display text-4xl font-bold">{attainment}%</div>
              <div className="text-xs text-muted-foreground">${wonValue.toLocaleString()} closed</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Revenue by salesperson"
          description="Compare performance across reps. Identify top and underperformers."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={repData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Weighted pipeline value"
          description="Forecast based on stage probability. Raw vs. weighted dollar volume per stage."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="raw" name="Raw" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="weighted" name="Weighted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Win / Loss ratio"
          description="Percentage of closed deals that were won vs. lost."
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={winLossData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                label={(e: { name: string; value: number }) => `${e.name}: ${e.value}`}
              >
                {winLossData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="font-display text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
