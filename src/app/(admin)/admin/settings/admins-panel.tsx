"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/form";
import { formatDate, initials } from "@/lib/format";
import { addAdminAction, removeAdminAction } from "./actions";

export type AdminRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
};

function AddAdminDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addAdminAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Add admin
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add admin</DialogTitle>
          <DialogDescription>
            Create an administrator account with full dashboard access.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Full name</Label>
            <Input id="admin-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Temp password</Label>
            <Input
              id="admin-password"
              name="password"
              type="text"
              defaultValue="Admin@12345"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveButton({ admin, isSelf }: { admin: AdminRow; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (admin.status === "INACTIVE") {
    return <span className="text-xs text-muted-foreground">Removed</span>;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isSelf || pending}
      title={isSelf ? "You cannot remove yourself" : "Remove admin"}
      onClick={() =>
        startTransition(async () => {
          try {
            await removeAdminAction(admin.id);
            toast.success("Admin removed.");
            router.refresh();
          } catch (err) {
            toast.error((err as Error).message);
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function AdminsPanel({
  admins,
  currentUserId,
}: {
  admins: AdminRow[];
  currentUserId: string;
}) {
  const columns: Column<AdminRow>[] = [
    {
      key: "name",
      header: "Admin",
      render: (a) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials(a.name)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="font-medium">
              {a.name}
              {a.id === currentUserId && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (you)
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{a.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: "createdAt",
      header: "Added",
      render: (a) => formatDate(a.createdAt),
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (a) => <RemoveButton admin={a} isSelf={a.id === currentUserId} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={admins}
      getRowKey={(a) => a.id}
      searchText={(a) => `${a.name} ${a.email}`}
      searchPlaceholder="Search admins…"
      toolbar={<AddAdminDialog />}
    />
  );
}
