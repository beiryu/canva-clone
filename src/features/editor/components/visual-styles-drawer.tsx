"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useVisualStyle,
  VisualStyle,
  visualStyles,
} from "@/features/editor/store/use-visual-style";
import { useStylePresets } from "@/features/style-presets/api/use-style-presets";
import { useDeleteStylePreset } from "@/features/style-presets/api/use-delete-style-preset";
import { getImageUrl } from "@/features/images/utils";
import { useConfirm } from "@/hooks/use-confirm";
import CreateStylePresetDialog from "./create-style-preset-dialog";

export default function VisualStylesDrawer() {
  const {
    selectedStyle,
    setSelectedStyle,
    isStyleDrawerOpen,
    setIsStyleDrawerOpen,
    reconcileCustomStyles,
  } = useVisualStyle();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: presets } = useStylePresets();
  const deletePreset = useDeleteStylePreset();

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete this preset?",
    "The style will no longer be selectable. This cannot be undone.",
  );

  const customStyles = useMemo<VisualStyle[]>(
    () =>
      (presets ?? []).map((preset) => ({
        id: preset.id,
        name: preset.name,
        image: preset.referencePath ? getImageUrl(preset.referencePath) : "",
        isCustom: true,
      })),
    [presets],
  );

  // Drop a selected preset that has since been deleted, so generation does not
  // silently fall back to no style guidance at all.
  useEffect(() => {
    if (!presets) return;
    reconcileCustomStyles(presets.map((preset) => preset.id));
  }, [presets, reconcileCustomStyles]);

  const handleStyleClick = (style: VisualStyle): void => {
    setSelectedStyle(style);
    setIsStyleDrawerOpen(false);
  };

  const handleDelete = async (style: VisualStyle) => {
    const ok = await confirm();
    if (!ok) return;

    await deletePreset.mutateAsync(style.id);

    if (selectedStyle.id === style.id) {
      setSelectedStyle(visualStyles[0]);
    }
  };

  const allStyles = [...customStyles, ...visualStyles];

  return (
    <>
      <ConfirmDialog />
      <CreateStylePresetDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
      <Drawer
        open={isStyleDrawerOpen}
        onOpenChange={setIsStyleDrawerOpen}
        direction="right"
      >
        <DrawerContent className="h-full max-h-screen rounded-none">
          <div className="bg-[#111] text-white h-full overflow-auto">
            <DrawerHeader className="border-b border-gray-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-2xl font-bold">
                  Visual Styles
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-5 w-5" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 text-gray-400 transition-colors hover:border-[#c4ff33] hover:text-[#c4ff33]"
                  onClick={() => setIsCreateOpen(true)}
                  aria-label="Create a style preset from a reference image"
                >
                  <Plus className="h-8 w-8" />
                  <span className="text-sm font-medium">Create preset</span>
                </button>

                {allStyles.map((style) => (
                  <div key={style.id} className="relative">
                    <button
                      className={cn(
                        "relative block w-full rounded-lg overflow-hidden transition-all duration-200 group",
                        selectedStyle.id === style.id
                          ? "ring-4 ring-[#c4ff33]"
                          : "hover:opacity-90",
                      )}
                      onClick={() => handleStyleClick(style)}
                      aria-label={`Select ${style.name} style`}
                    >
                      {style.image ? (
                        <Image
                          src={style.image}
                          alt={style.name}
                          width={500}
                          height={500}
                          quality={100}
                          className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-125"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center bg-gray-800" />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200">
                        <span className="text-2xl font-bold drop-shadow-md uppercase text-center px-2">
                          {style.name}
                        </span>
                      </div>
                      {selectedStyle.id === style.id && (
                        <div className="absolute bottom-2 right-2 bg-[#c4ff33] text-black text-xs px-2 py-1 rounded-full">
                          Selected
                        </div>
                      )}
                    </button>

                    {style.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 hover:bg-red-600"
                        onClick={() => handleDelete(style)}
                        aria-label={`Delete ${style.name} preset`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
