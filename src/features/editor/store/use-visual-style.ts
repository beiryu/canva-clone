import { create } from "zustand";
import { persist } from "zustand/middleware";

export const visualStyles: VisualStyle[] = [
  {
    id: "nature",
    name: "Nature",
    image: "/styles-editor/nature.png",
  },
  {
    id: "pixel",
    name: "Pixel",
    image: "/styles-editor/pixel.png",
  },
  {
    id: "sketch",
    name: "Sketch",
    image: "/styles-editor/sketch.png",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    image: "/styles-editor/cinematic.png",
  },
  {
    id: "comic",
    name: "Comic",
    image: "/styles-editor/comic.png",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    image: "/styles-editor/cyberpunk.png",
  },
  {
    id: "ghibli",
    name: "Ghibli",
    image: "/styles-editor/ghibli.png",
  },
];

export type VisualStyle = {
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
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<VisualStyleState>;
        return {
          ...currentState,
          ...state,
          // Ensure selectedStyle is never null by using the default if persisted value is null
          selectedStyle: state.selectedStyle || currentState.selectedStyle,
        };
      },
    },
  ),
);
