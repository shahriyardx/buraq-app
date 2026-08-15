"use client";

import { MoreHorizontal, ShieldCheck, ShieldMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";
import { trpc } from "@/trpc/client";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isSuperAdmin: boolean;
  photoUrl: string | null;
  studentId: string | null;
  instructorId: string | null;
};

function roleLabel(u: UserRow) {
  if (u.isSuperAdmin) return "Super Admin";
  if (u.role === "ADMIN") return "Admin";
  if (u.role === "INSTRUCTOR") return "Instructor";
  return "Student";
}

function RowActions({
  user,
  canManage,
  currentUserId,
}: {
  user: UserRow;
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const makeAdmin = trpc.users.makeAdmin.useMutation();
  const revokeAdmin = trpc.users.revokeAdmin.useMutation();
  const busy = makeAdmin.isPending || revokeAdmin.isPending;

  // Only the super-admin manages roles; never on self or the super-admin.
  if (!canManage || user.isSuperAdmin || user.id === currentUserId) return null;

  const isAdmin = user.role === "ADMIN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={busy}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAdmin ? (
          <DropdownMenuItem
            className="whitespace-nowrap"
            onClick={async () => {
              try {
                await revokeAdmin.mutateAsync({ userId: user.id });
                toast.success("Admin access removed.");
                router.refresh();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <ShieldMinus className="mr-2 size-4" /> Remove admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="whitespace-nowrap"
            onClick={async () => {
              try {
                await makeAdmin.mutateAsync({ userId: user.id });
                toast.success(`${user.name} is now an admin.`);
                router.refresh();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <ShieldCheck className="mr-2 size-4" /> Make admin
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UsersTable({
  users,
  isSuperAdmin,
  currentUserId,
}: {
  users: UserRow[];
  isSuperAdmin: boolean;
  currentUserId: string;
}) {
  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {u.photoUrl && <AvatarImage src={u.photoUrl} alt={u.name} />}
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials(u.name)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">
              {u.studentId ?? u.instructorId ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (u) => roleLabel(u) },
    {
      key: "status",
      header: "Status",
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (u) => (
        <RowActions
          user={u}
          canManage={isSuperAdmin}
          currentUserId={currentUserId}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={users}
      getRowKey={(u) => u.id}
      searchText={(u) => `${u.name} ${u.email} ${roleLabel(u)}`}
      searchPlaceholder="Search users…"
      csv={{
        filename: "users",
        rows: () =>
          users.map((u) => ({
            name: u.name,
            email: u.email,
            role: roleLabel(u),
            status: u.status,
          })),
      }}
    />
  );
}
