"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Something went wrong");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
        If an account exists for that email, a reset link is on its way. Check
        your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#20302a]/80">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="rider@buraq.school"
          required
          className="h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full bg-[#7a5a2c] text-[#f4ece0] shadow-sm transition-colors hover:bg-[#6a4d25]"
      >
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
