"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAnalyzeStyle } from "@/features/style-presets/api/use-analyze-style";
import { useCreateStylePreset } from "@/features/style-presets/api/use-create-style-preset";

// Supabase and the vision model both choke on very large uploads, and the
// reference only needs to convey a look.
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;

type CreateStylePresetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Draft = {
  instruction: string;
  referencePath: string;
  model: string;
};

export default function CreateStylePresetDialog({
  open,
  onOpenChange,
}: CreateStylePresetDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const analyzeStyle = useAnalyzeStyle();
  const createPreset = useCreateStylePreset();

  const reset = () => {
    setPreview(null);
    setName("");
    setDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (file.size > MAX_REFERENCE_BYTES) {
      toast.error("Image is too large. Please keep it under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      // A new reference invalidates the previous analysis.
      setDraft(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!preview) return;

    const result = await analyzeStyle.mutateAsync({ image: preview });
    setDraft(result.data);
  };

  const handleSave = async () => {
    if (!draft) return;

    if (!name.trim()) {
      toast.error("Please give the preset a name");
      return;
    }

    await createPreset.mutateAsync({
      name: name.trim(),
      instruction: draft.instruction,
      referencePath: draft.referencePath,
      model: draft.model,
    });

    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create style preset</DialogTitle>
          <DialogDescription>
            Upload an image whose look you want to reuse. It gets read by a
            vision model, and you can edit the result before saving.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 px-1">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reference image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {preview ? (
                <button
                  type="button"
                  className="relative block w-full overflow-hidden rounded-lg border"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* Local data URL, so next/image optimisation is skipped. */}
                  <Image
                    src={preview}
                    alt="Reference"
                    width={600}
                    height={340}
                    unoptimized
                    className="h-48 w-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs">
                    Change
                  </span>
                </button>
              ) : (
                <Button
                  variant="outline"
                  className="h-32 w-full border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose an image
                </Button>
              )}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!preview || analyzeStyle.isPending}
              className="w-full"
            >
              {analyzeStyle.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reading the image (this can take ~30s)
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {draft ? "Analyze again" : "Analyze"}
                </>
              )}
            </Button>

            {draft && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="preset-name" className="text-sm font-medium">
                    Name
                  </Label>
                  <Input
                    id="preset-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My thumbnail look"
                    maxLength={60}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="preset-instruction"
                    className="text-sm font-medium"
                  >
                    Style instruction
                  </Label>
                  <Textarea
                    id="preset-instruction"
                    value={draft.instruction}
                    onChange={(e) =>
                      setDraft({ ...draft, instruction: e.target.value })
                    }
                    className="h-56 text-xs leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">
                    This text is injected on every generation. Vision models get
                    things wrong — read it and correct anything that does not
                    match your reference.
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!draft || createPreset.isPending}
          >
            {createPreset.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
