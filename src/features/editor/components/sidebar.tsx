"use client";

import {
  LayoutTemplate,
  ImageIcon,
  Pencil,
  Settings,
  Shapes,
  Sparkles,
  Type,
} from "lucide-react";

import { ActivePanel, CanvasMode } from "@/features/editor/types";
import { SidebarItem } from "@/features/editor/components/sidebar-item";

interface SidebarProps {
  activePanel: ActivePanel | null;
  canvasMode: CanvasMode;
  onTogglePanel: (panel: ActivePanel) => void;
  onToggleDrawMode: () => void;
}

export const Sidebar = ({
  activePanel,
  canvasMode,
  onTogglePanel,
  onToggleDrawMode,
}: SidebarProps) => {
  return (
    <aside className="bg-black flex flex-col w-[100px] h-full border-r overflow-y-auto">
      <ul className="flex flex-col">
        <SidebarItem
          icon={Pencil}
          label="Draw"
          isActive={canvasMode === "draw"}
          onClick={onToggleDrawMode}
        />
        {/* <SidebarItem
          icon={LayoutTemplate}
          label="Design"
          isActive={activePanel === "templates"}
          onClick={() => onTogglePanel("templates")}
        /> */}
        <SidebarItem
          icon={ImageIcon}
          label="Image"
          isActive={activePanel === "images"}
          onClick={() => onTogglePanel("images")}
        />
        <SidebarItem
          icon={Type}
          label="Text"
          isActive={activePanel === "text"}
          onClick={() => onTogglePanel("text")}
        />
        <SidebarItem
          icon={Shapes}
          label="Shapes"
          isActive={activePanel === "shapes"}
          onClick={() => onTogglePanel("shapes")}
        />
        {/* <SidebarItem
          icon={Sparkles}
          label="AI"
          isActive={activePanel === "ai"}
          onClick={() => onTogglePanel("ai")}
        /> */}
        <SidebarItem
          icon={Settings}
          label="Settings"
          isActive={activePanel === "settings"}
          onClick={() => onTogglePanel("settings")}
        />
      </ul>
    </aside>
  );
};
