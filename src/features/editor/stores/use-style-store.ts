import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StyleState {
  selectedStyle: string | null;
  setSelectedStyle: (style: string | null) => void;
  isStyleDrawerOpen: boolean;
  setIsStyleDrawerOpen: (open: boolean) => void;
}

export const useStyleStore = create<StyleState>()(
  persist(
    (set) => ({
      selectedStyle: null,
      setSelectedStyle: (style) => set({ selectedStyle: style }),
      isStyleDrawerOpen: false,
      setIsStyleDrawerOpen: (open) => set({ isStyleDrawerOpen: open }),
    }),
    {
      name: "style-storage",
    },
  ),
);
