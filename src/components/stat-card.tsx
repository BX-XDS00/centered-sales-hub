import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-card)]">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="text-center sm:text-left">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-foreground">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
