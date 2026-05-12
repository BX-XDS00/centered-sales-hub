import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link2, Unlink, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { UserIdentity } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, refreshRole } = useAuth();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null }>({ full_name: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(data?.identities ?? []);
  };

  useEffect(() => {
    refresh();
    if (user) {
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        .then(({ data }) => setProfile({ full_name: data?.full_name ?? "" }));
    }
  }, [user]);

  const linkGoogle = async () => {
    setBusy("link");
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    setBusy(null);
    if (error) {
      toast.error(error.message.includes("Manual linking") || error.message.includes("not enabled")
        ? "Account linking isn't enabled in your auth settings. Enable manual linking in the backend, then try again."
        : error.message);
    }
  };

  const unlinkIdentity = async (identity: UserIdentity) => {
    if (identities.length <= 1) return toast.error("You must keep at least one sign-in method.");
    if (!confirm(`Disconnect ${identity.provider}? You won't be able to sign in with it.`)) return;
    setBusy(identity.identity_id);
    const { error } = await supabase.auth.unlinkIdentity(identity);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${identity.provider} disconnected`);
    await refresh();
    await refreshRole();
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await (supabase.from("profiles").update as any)({ full_name: profile.full_name }).eq("id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const hasGoogle = identities.some((i) => i.provider === "google");
  const hasEmail = identities.some((i) => i.provider === "email");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="text-center">
        <Badge variant="secondary" className="mb-3">Account</Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <Card className="border-border/70 shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-center font-display">Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="flex flex-col items-center gap-3">
            <div className="w-full space-y-1.5">
              <Label>Full name</Label>
              <Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ full_name: e.target.value })} />
            </div>
            <Button type="submit" disabled={savingProfile} className="w-full sm:w-auto">
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-center font-display">
            <ShieldCheck className="h-4 w-4" /> Connected sign-in methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-xs text-muted-foreground">
            Link Google to your existing account to sign in either way — no duplicate profile is created.
          </p>

          <ul className="divide-y divide-border rounded-lg border border-border">
            {identities.map((identity) => (
              <li key={identity.identity_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  {identity.provider === "google" ? <GoogleIcon /> : <Mail className="h-4 w-4" />}
                  <div>
                    <div className="text-sm font-medium capitalize">{identity.provider}</div>
                    <div className="text-xs text-muted-foreground">
                      {(identity.identity_data?.email as string) ?? identity.id}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === identity.identity_id || identities.length <= 1}
                  onClick={() => unlinkIdentity(identity)}
                >
                  {busy === identity.identity_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Unlink className="mr-1 h-3.5 w-3.5" /> Disconnect</>}
                </Button>
              </li>
            ))}
            {identities.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">No identities loaded.</li>
            )}
          </ul>

          <div className="flex flex-col items-center gap-2">
            {!hasGoogle && (
              <Button onClick={linkGoogle} disabled={busy === "link"} className="w-full sm:w-auto" variant="outline" size="lg">
                {busy === "link" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2" />}
                Connect Google account
              </Button>
            )}
            {hasGoogle && hasEmail && (
              <p className="text-center text-xs text-success">
                <Link2 className="mr-1 inline h-3 w-3" /> Email and Google are linked to the same account.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
