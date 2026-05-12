import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { ShieldAlert, Database, KeyRound, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super-admin")({
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role && role !== "super_admin") router.navigate({ to: "/dashboard" });
  }, [role, router]);

  if (role !== "super_admin") return null;

  return (
    <div className="space-y-8">
      <header className="text-center">
        <Badge variant="secondary" className="mb-3">System owner</Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Super Admin Console</h1>
        <p className="mt-2 text-sm text-muted-foreground">Global controls, integrations, and audit oversight.</p>
      </header>

      <section className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="System status" value="Healthy" hint="All services online" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Active region" value="us-east" icon={<Database className="h-5 w-5" />} />
        <StatCard label="Integrations" value="Cloud" hint="Lovable Cloud" icon={<KeyRound className="h-5 w-5" />} />
        <StatCard label="Security level" value="High" icon={<ShieldAlert className="h-5 w-5" />} />
      </section>

      <div className="mx-auto max-w-3xl">
        <Card className="border-border/70 shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-center font-display">Audit log</CardTitle></CardHeader>
          <CardContent>
            <p className="py-10 text-center text-sm text-muted-foreground">
              Audit logging will appear here. (Coming in next iteration.)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
