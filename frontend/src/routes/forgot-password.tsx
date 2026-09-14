import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/flowly/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Flowly" },
      {
        name: "description",
        content: "Send yourself a password reset link for your Flowly account.",
      },
      { property: "og:title", content: "Reset your password — Flowly" },
      { property: "og:description", content: "Send yourself a Flowly password reset link." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll send you a link to set a new one."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-lg bg-accent p-4 text-sm text-accent-foreground">
          If an account exists for <span className="font-medium">{email}</span>, a reset link is on
          its way.
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api.auth.requestPasswordReset(email);
              setSent(true);
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Could not request password reset.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
