"use client";

import { fabric } from "fabric";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";

import { ResponseType } from "@/features/projects/api/use-get-project";
import { useUpdateProject } from "@/features/projects/api/use-update-project";

import {
  ActivePanel,
  CanvasMode,
  selectionDependentPanels,
} from "@/features/editor/types";
import { Navbar } from "@/features/editor/components/navbar";
import { Footer } from "@/features/editor/components/footer";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { useRemoveBackground } from "@/features/editor/hooks/use-remove-background";
import { useCrop } from "@/features/editor/hooks/use-crop";
import { Sidebar } from "@/features/editor/components/sidebar";
import { Toolbar } from "@/features/editor/components/toolbar";
import { ShapeSidebar } from "@/features/editor/components/shape-sidebar";
import { FillColorSidebar } from "@/features/editor/components/fill-color-sidebar";
import { StrokeColorSidebar } from "@/features/editor/components/stroke-color-sidebar";
import { StrokeWidthSidebar } from "@/features/editor/components/stroke-width-sidebar";
import { OpacitySidebar } from "@/features/editor/components/opacity-sidebar";
import { TextSidebar } from "@/features/editor/components/text-sidebar";
import { FontSidebar } from "@/features/editor/components/font-sidebar";
import { ImageSidebar } from "@/features/editor/components/image-sidebar";
import { FilterSidebar } from "@/features/editor/components/filter-sidebar";
import { DrawSidebar } from "@/features/editor/components/draw-sidebar";
import { TemplateSidebar } from "@/features/editor/components/template-sidebar";
import { SettingsSidebar } from "@/features/editor/components/settings-sidebar";
import { GenerateSidebar } from "@/features/editor/components/generate-sidebar";
import { MagicWandButton } from "@/features/editor/components/magic-wand-button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

import { GeneratedImage } from "@/features/editor/components/generated-image";

interface EditorProps {
  initialData: ResponseType["data"];
}

export const Editor = ({ initialData }: EditorProps) => {
  const { mutate } = useUpdateProject(initialData.id);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((values: { json: string; height: number; width: number }) => {
      mutate(values);
    }, 500),
    [mutate],
  );

  // Which sidebar panel is open, and how the canvas reacts to the pointer, are
  // two independent concerns — collapsing them into one state is what used to
  // make the "Select" button close whatever panel happened to be open.
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("select");
  const [isGenerateSidebarOpen, setIsGenerateSidebarOpen] = useState(true);

  const onClearSelection = useCallback(() => {
    setActivePanel((current) =>
      current && selectionDependentPanels.includes(current) ? null : current,
    );
  }, []);

  // Read inside the keydown handler rather than passed as a value: useCrop needs
  // the editor that useEditor returns, so a boolean would be circular.
  const isCroppingRef = useRef(false);

  const { init, editor } = useEditor({
    defaultState: initialData.json,
    defaultWidth: initialData.width,
    defaultHeight: initialData.height,
    clearSelectionCallback: onClearSelection,
    saveCallback: debouncedSave,
    isCroppingRef,
  });

  const { removeBackground, isRemovingBackground } = useRemoveBackground({
    editor,
    projectId: initialData.id,
  });

  const onCropEnter = useCallback(() => {
    setCanvasMode("crop");
    // Panels are siblings in a flex row, so only one may be visible at a time.
    setActivePanel(null);
  }, []);

  const onCropExit = useCallback(() => setCanvasMode("select"), []);

  const { isCropping, startCrop, applyCrop, cancelCrop } = useCrop({
    editor,
    onEnter: onCropEnter,
    onExit: onCropExit,
  });

  useEffect(() => {
    isCroppingRef.current = isCropping;
  }, [isCropping]);

  const closePanel = useCallback(() => setActivePanel(null), []);

  const exitDrawMode = useCallback(() => {
    editor?.disableDrawingMode();
    setCanvasMode("select");
  }, [editor]);

  // Only one canvas mode at a time: leaving a crop by any other route discards
  // it rather than committing, matching Esc.
  const leaveCrop = useCallback(() => {
    if (isCropping) cancelCrop();
  }, [cancelCrop, isCropping]);

  const enterDrawMode = useCallback(() => {
    leaveCrop();
    editor?.enableDrawingMode();
    setCanvasMode("draw");
    // Panels are siblings in a flex row, so only one may be visible at a time.
    setActivePanel(null);
  }, [editor, leaveCrop]);

  const onStartCrop = useCallback(() => {
    exitDrawMode();
    startCrop();
  }, [exitDrawMode, startCrop]);

  const toggleDrawMode = useCallback(() => {
    if (canvasMode === "draw") {
      exitDrawMode();
      return;
    }

    enterDrawMode();
  }, [canvasMode, enterDrawMode, exitDrawMode]);

  const togglePanel = useCallback(
    (panel: ActivePanel) => {
      leaveCrop();
      exitDrawMode();
      setActivePanel((current) => (current === panel ? null : panel));
    },
    [exitDrawMode, leaveCrop],
  );

  const canvasRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      controlsAboveOverlay: true,
      preserveObjectStacking: true,
    });

    init({
      initialCanvas: canvas,
      initialContainer: containerRef.current!,
    });

    return () => {
      canvas.dispose();
    };
  }, [init]);

  return (
    <div className="h-full flex flex-col">
      <Navbar
        id={initialData.id}
        editor={editor}
        canvasMode={canvasMode}
        onSelectMode={exitDrawMode}
      />
      <div className="absolute h-[calc(100%-68px)] w-full top-[68px] flex">
        <Sidebar
          activePanel={activePanel}
          canvasMode={canvasMode}
          onTogglePanel={togglePanel}
          onToggleDrawMode={toggleDrawMode}
        />
        <ShapeSidebar
          editor={editor}
          isOpen={activePanel === "shapes"}
          onClose={closePanel}
        />
        <FillColorSidebar
          editor={editor}
          isOpen={activePanel === "fill"}
          onClose={closePanel}
        />
        <StrokeColorSidebar
          editor={editor}
          isOpen={activePanel === "stroke-color"}
          onClose={closePanel}
        />
        <StrokeWidthSidebar
          editor={editor}
          isOpen={activePanel === "stroke-width"}
          onClose={closePanel}
        />
        <OpacitySidebar
          editor={editor}
          isOpen={activePanel === "opacity"}
          onClose={closePanel}
        />
        <TextSidebar
          editor={editor}
          isOpen={activePanel === "text"}
          onClose={closePanel}
        />
        <FontSidebar
          editor={editor}
          isOpen={activePanel === "font"}
          onClose={closePanel}
        />
        <ImageSidebar
          editor={editor}
          isOpen={activePanel === "images"}
          onClose={closePanel}
          projectId={initialData.id}
        />
        <TemplateSidebar
          editor={editor}
          isOpen={activePanel === "templates"}
          onClose={closePanel}
        />
        <FilterSidebar
          editor={editor}
          isOpen={activePanel === "filter"}
          onClose={closePanel}
        />
        <DrawSidebar
          editor={editor}
          isOpen={canvasMode === "draw"}
          onClose={exitDrawMode}
        />
        <SettingsSidebar
          editor={editor}
          isOpen={activePanel === "settings"}
          onClose={closePanel}
        />
        <main className="bg-muted flex-1 overflow-auto relative flex flex-col">
          <ResizablePanelGroup direction="vertical" className="flex-1">
            <ResizablePanel defaultSize={50} minSize={0}>
              <Toolbar
                editor={editor}
                activePanel={activePanel}
                onTogglePanel={togglePanel}
                onRemoveBackground={removeBackground}
                isRemovingBackground={isRemovingBackground}
                onStartCrop={onStartCrop}
                onApplyCrop={applyCrop}
                onCancelCrop={cancelCrop}
                isCropping={isCropping}
                key={JSON.stringify(editor?.canvas.getActiveObject())}
              />
              <div className="flex-1 h-[calc(90%)] bg-muted" ref={containerRef}>
                <canvas ref={canvasRef} />
              </div>
              {/* <Footer editor={editor} /> */}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel className="bg-black p-0" minSize={0}>
              <ScrollArea className="h-full w-full">
                <GeneratedImage projectId={initialData.id} />
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>

        {!isGenerateSidebarOpen && (
          <MagicWandButton onClick={() => setIsGenerateSidebarOpen(true)} />
        )}
        <div className="h-full">
          <GenerateSidebar
            editor={editor}
            isOpen={isGenerateSidebarOpen}
            onClose={() => setIsGenerateSidebarOpen(false)}
            projectId={initialData.id}
          />
        </div>
      </div>
    </div>
  );
};
