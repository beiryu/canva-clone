"use client";

import Image from "next/image";
import { X } from "lucide-react";
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

export default function VisualStylesDrawer() {
  const {
    selectedStyle,
    setSelectedStyle,
    isStyleDrawerOpen,
    setIsStyleDrawerOpen,
  } = useVisualStyle();

  const handleStyleClick = (style: VisualStyle): void => {
    setSelectedStyle(style);
    setIsStyleDrawerOpen(false);
  };

  return (
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
            {/* Visual Styles Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visualStyles.map((style) => (
                <button
                  key={style.id}
                  className={cn(
                    "relative rounded-lg overflow-hidden transition-all duration-200 group",
                    selectedStyle.id === style.id
                      ? "ring-4 ring-[#c4ff33]"
                      : "hover:opacity-90",
                  )}
                  onClick={() => handleStyleClick(style)}
                  aria-label={`Select ${style.name} style`}
                >
                  <Image
                    src={style.image}
                    alt={style.name}
                    width={500}
                    height={500}
                    quality={100}
                    priority
                    className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-125"
                  />
                  {/* Style Name Overlay - Always Visible with Hover Effect */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200">
                    <span className="text-3xl font-bold drop-shadow-md uppercase">
                      {style.name}
                    </span>
                  </div>
                  {selectedStyle.id === style.id && (
                    <div className="absolute bottom-2 right-2 bg-[#c4ff33] text-black text-xs px-2 py-1 rounded-full">
                      Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
