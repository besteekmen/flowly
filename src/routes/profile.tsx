import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/flowly/app-header";
import { RequireAuth } from "@/components/flowly/require-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { api, type User } from "@/services";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profile & settings — Flowly" },
      { name: "description", content: "Update your Flowly name, avatar, and password, or delete your account." },
      { property: "og:title", content: "Profile & settings — Flowly" },
      { property: "og:description", content: "Manage your Flowly account details." },
    ],
  }),
  component: () => <RequireAuth>{(user) => <ProfilePage user={user} />}</RequireAuth>,
});

function ProfilePage({ user }: { user: User }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api.auth.updateProfile({ name, avatarUrl: avatarUrl || null });
      setUser(updated);
      toast.success("Profile saved");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.auth.changePassword(current, next);
      setCurrent("");
      setNext("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    await api.auth.deleteAccount();
    setUser(null);
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Profile &amp; settings</h1>

        <form onSubmit={saveProfile} className="card-soft space-y-4 p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback>{name.slice(0, 2).toUpperCase() || "F"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="avatar">Avatar image URL</Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} readOnly disabled />
          </div>
          <Button type="submit" disabled={busy}>
            Save changes
          </Button>
        </form>

        {user.provider === "password" && (
          <form onSubmit={savePassword} className="card-soft space-y-4 p-5">
            <h2 className="text-sm font-semibold">Change password</h2>
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">New password</Label>
              <Input
                id="next"
                type="password"
                minLength={6}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={busy}>
              Update password
            </Button>
          </form>
        )}

        <div className="card-soft space-y-3 border-destructive/30 p-5">
          <h2 className="text-sm font-semibold text-destructive">Delete account</h2>
          <p className="text-sm text-muted-foreground">
            This permanently removes your account, your board, and every task on it.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your Flowly account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your account, board, and all tasks will be permanently deleted. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void deleteAccount()}>
                  Delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
