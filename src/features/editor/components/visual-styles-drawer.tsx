"use client";

import { useState } from "react";
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
import { useStyleStore } from "@/store/style-store";

// Define the available visual styles
const visualStyles = [
  {
    id: "3d-cube",
    name: "3D Cube",
    image: "https://placehold.co/250x250",
  },
  {
    id: "anime-jump",
    name: "Anime Jump",
    image: "https://placehold.co/250x250",
  },
  {
    id: "simpsons",
    name: "Cartoon Network",
    image: "https://placehold.co/250x250",
  },
  {
    id: "sketch",
    name: "Sketch Portrait",
    image: "https://placehold.co/250x250",
  },
  {
    id: "retro",
    name: "Retro Vibes",
    image: "https://placehold.co/250x250",
  },
  {
    id: "realistic",
    name: "Realistic Portrait",
    image: "https://placehold.co/250x250",
  },
  {
    id: "urban",
    name: "Urban Style",
    image: "https://placehold.co/250x250",
  },
  {
    id: "nature",
    name: "Nature DJ",
    image: "https://placehold.co/250x250",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    image: "https://placehold.co/250x250",
  },
  {
    id: "street",
    name: "Street Style",
    image: "https://placehold.co/250x250",
  },
  {
    id: "animal",
    name: "Animal Character",
    image: "https://placehold.co/250x250",
  },
  {
    id: "noir",
    name: "Film Noir",
    image: "https://placehold.co/250x250",
  },
];

export default function VisualStylesDrawer() {
  const {
    selectedStyle,
    setSelectedStyle,
    isStyleDrawerOpen,
    setIsStyleDrawerOpen,
  } = useStyleStore();

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
                    selectedStyle === style.id
                      ? "ring-4 ring-[#c4ff33]"
                      : "hover:opacity-90",
                  )}
                  onClick={() => setSelectedStyle(style.id)}
                  aria-label={`Select ${style.name} style`}
                >
                  <Image
                    src={style.image}
                    alt={style.name}
                    width={250}
                    height={250}
                    className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-125"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-3xl font-bold drop-shadow-md uppercase">
                      {style.name}
                    </span>
                  </div>
                  {selectedStyle === style.id && (
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
