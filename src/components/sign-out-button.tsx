"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <DropdownMenuItem
      onClick={async () => {
        await signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="mr-2 size-4" />
      Sign out
    </DropdownMenuItem>
  );
}
