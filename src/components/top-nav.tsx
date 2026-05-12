import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, ShieldCheck, Settings2, UserCircle2, BarChart3 } from "lucide-react";

export function TopNav() {
  const { role, signOut, user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container-center flex h-16 items-center justify-between gap-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">S</span>
          Salesline
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-1">
          <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <NavLink to="/leads" icon={<Users className="h-4 w-4" />} label="Leads" />
          <NavLink to="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
          {(role === "admin" || role === "super_admin") && (
            <NavLink to="/admin" icon={<ShieldCheck className="h-4 w-4" />} label="Team" />
          )}
          {role === "super_admin" && (
            <NavLink to="/super-admin" icon={<Settings2 className="h-4 w-4" />} label="System" />
          )}
          <NavLink to="/account" icon={<UserCircle2 className="h-4 w-4" />} label="Account" />
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <div className="font-medium text-foreground">{user?.email}</div>
            <div className="text-muted-foreground capitalize">{role?.replace("_", " ")}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-primary/5 text-primary" }}
    >
      {icon} {label}
    </Link>
  );
}
