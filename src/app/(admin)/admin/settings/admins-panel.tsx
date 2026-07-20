"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate, initials } from "@/lib/format";
import { trpc } from "@/trpc/client";

export type AdminRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
};

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

function AddAdminDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "Admin@12345" },
  });

  const add = trpc.settings.addAdmin.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      const admin = await add.mutateAsync(values);
      toast.success(`Admin ${admin.name} added.`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

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

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-name">Full name</FieldLabel>
                  <Input
                    id="admin-name"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-email">Email</FieldLabel>
                  <Input
                    id="admin-email"
                    type="email"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-password">
                    Temp password
                  </FieldLabel>
                  <Input
                    id="admin-password"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Adding…" : "Add admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveButton({ admin, isSelf }: { admin: AdminRow; isSelf: boolean }) {
  const router = useRouter();
  const remove = trpc.settings.removeAdmin.useMutation();

  if (admin.status === "INACTIVE") {
    return <span className="text-xs text-muted-foreground">Removed</span>;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isSelf || remove.isPending}
      title={isSelf ? "You cannot remove yourself" : "Remove admin"}
      onClick={async () => {
        try {
          await remove.mutateAsync({ userId: admin.id });
          toast.success("Admin removed.");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
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
