import { create } from "zustand";
import { persist } from "zustand/middleware";

export const visualStyles: VisualStyle[] = [
  {
    id: "nature",
    name: "Nature",
    image: "/styles-editor/nature.png",
  },
  {
    id: "3d-render",
    name: "3D Render",
    image: "/styles-editor/3d.png",
  },
  {
    id: "cartoon",
    name: "Cartoon",
    image: "/styles-editor/cartoon.png",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    image: "/styles-editor/fantasy.png",
  },
  {
    id: "pixel",
    name: "Pixel",
    image: "/styles-editor/pixel.png",
  },
  {
    id: "retro",
    name: "Retro",
    image: "/styles-editor/retro.png",
  },
  {
    id: "sketch",
    name: "Sketch",
    image: "/styles-editor/sketch.png",
  },
];

type VisualStyle = {
  id: string;
  name: string;
  image: string;
};

type VisualStyleState = {
  selectedStyle: VisualStyle;
  setSelectedStyle: (style: VisualStyle) => void;
  isStyleDrawerOpen: boolean;
  setIsStyleDrawerOpen: (open: boolean) => void;
};

export const useVisualStyle = create<VisualStyleState>()(
  persist(
    (set) => ({
      selectedStyle: visualStyles[0],
      setSelectedStyle: (style) => set({ selectedStyle: style }),
      isStyleDrawerOpen: false,
      setIsStyleDrawerOpen: (open) => set({ isStyleDrawerOpen: open }),
    }),
    {
      name: "style-storage",
    },
  ),
);
