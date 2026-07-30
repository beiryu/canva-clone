"use client";

import { FormEvent, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProject } from "@/features/projects/api/use-update-project";

/** Mirrors the max on the PATCH validator. The column is unbounded `text`, so
 * this is a UX guard rather than a storage one. */
const MAX_NAME_LENGTH = 100;

interface RenameProjectDialogProps {
  project: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Deliberately takes the project as a prop rather than reading it from a store:
 * `useUpdateProject` binds its id at hook-call time, so it cannot be called
 * inside the per-row map in the projects list. Owning the mutation here keeps
 * that id non-null and stable for as long as the dialog exists.
 */
export const RenameProjectDialog = ({
  project,
  open,
  onOpenChange,
}: RenameProjectDialogProps) => {
  // An initializer, so it only reads the prop on mount — the caller keys this
  // component by project id to force a fresh one per row.
  const [name, setName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useUpdateProject(project.id);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (mutation.isPending) return;

      // The component stays mounted after closing, so an abandoned draft would
      // still be sitting in the field the next time this row is opened.
      setName(project.name);
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = name.trim();

    if (!trimmed) {
      toast.error("Please give the project a name");
      return;
    }

    // Every PATCH bumps updatedAt, and the list is ordered by it — a pointless
    // save would reshuffle the rows and reset every "x minutes ago" cell.
    if (trimmed === project.name) {
      handleOpenChange(false);
      return;
    }

    // mutate with a per-call onSuccess rather than awaiting mutateAsync: the
    // hook already toasts on failure and rethrows, which would surface as an
    // unhandled rejection here.
    mutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName(trimmed);
          toast.success("Project renamed");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md"
        onOpenAutoFocus={(event) => {
          // Radix's default focus leaves the caret at the end of the existing
          // name, so typing appends instead of replacing. Select it instead.
          // The rAF also lands after the dropdown menu restores focus to its
          // trigger, which would otherwise clear the selection.
          event.preventDefault();

          requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          });
        }}
      >
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            Choose a new name for this project. Your design is not affected.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="rename-project-name"
              className="text-sm font-medium"
            >
              Name
            </Label>
            <Input
              id="rename-project-name"
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Untitled project"
              maxLength={MAX_NAME_LENGTH}
              disabled={mutation.isPending}
            />
          </div>

          <DialogFooter>
            {/* Explicit type: a bare button inside a form submits it. */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
