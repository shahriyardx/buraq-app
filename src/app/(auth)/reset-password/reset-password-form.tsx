"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("newPassword"));
    const confirm = String(fd.get("confirm"));
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Reset failed");
      return;
    }
    toast.success("Password updated. Please sign in.");
    router.push("/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-[#20302a]/80">
          New password
        </Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className="h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-[#20302a]/80">
          Confirm password
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="h-11 border-[#20302a]/15 bg-white/70 focus-visible:border-[#a5772f] focus-visible:ring-[#a5772f]/25"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full bg-[#7a5a2c] text-[#f4ece0] shadow-sm transition-colors hover:bg-[#6a4d25]"
      >
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
