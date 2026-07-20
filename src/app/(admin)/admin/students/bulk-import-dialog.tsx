"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import { trpc } from "@/trpc/client";

export function BulkImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const bulk = trpc.students.bulkImport.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a CSV file.");
      return;
    }
    try {
      const csv = await file.text();
      const res = await bulk.mutateAsync({ csv });
      toast.success(
        `Imported ${res.created} student${res.created === 1 ? "" : "s"}.` +
          (res.failed ? ` ${res.failed} failed.` : ""),
      );
      setOpen(false);
      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
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

        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="csv">CSV file</FieldLabel>
            <Input
              id="csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={bulk.isPending}>
              {bulk.isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
