"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { downloadCsv } from "@/lib/csv";
import { initialActionState } from "@/lib/form";
import { bulkImportStudentsAction } from "./actions";

export function BulkImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    bulkImportStudentsAction,
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
          <Button variant="outline" size="sm">
            <Upload className="mr-2 size-4" />
            Import CSV
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk import students</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: name, email, phone, gender, address,
            password. Missing passwords default to Student@123.
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() =>
            downloadCsv("students-template", [
              {
                name: "Jane Rider",
                email: "jane@example.com",
                phone: "+1 555 000 0000",
                gender: "FEMALE",
                address: "123 Stable Lane",
                password: "Student@123",
              },
            ])
          }
        >
          Download template
        </Button>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv">CSV file</Label>
            <Input
              id="csv"
              name="csv"
              type="file"
              accept=".csv,text/csv"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
