import { fabric } from "fabric";
import type { MutableRefObject } from "react";
import { useEvent } from "react-use";

interface UseHotkeysProps {
  canvas: fabric.Canvas | null;
  undo: () => void;
  redo: () => void;
  save: (skip?: boolean) => void;
  copy: () => void;
  paste: () => void;
  isCroppingRef?: MutableRefObject<boolean>;
}

export const useHotkeys = ({
  canvas,
  undo,
  redo,
  save,
  copy,
  paste,
  isCroppingRef,
}: UseHotkeysProps) => {
  useEvent("keydown", (event) => {
    const isCtrlKey = event.ctrlKey || event.metaKey;
    const isBackspace = event.key === "Backspace";
    const isInput = ["INPUT", "TEXTAREA"].includes(
      (event.target as HTMLElement).tagName,
    );

    if (isInput) return;

    // Crop mode owns the keyboard: Delete would remove the very image being
    // cropped, and undo's clear() + loadFromJSON would leave the crop hook
    // holding a stale object. Enter/Escape are handled in use-crop.
    if (isCroppingRef?.current) return;

    // delete key
    if (event.keyCode === 46) {
      canvas?.getActiveObjects().forEach((Object) => canvas?.remove(Object));
      canvas?.discardActiveObject();
      canvas?.renderAll();
    }

    if (isBackspace) {
      canvas?.remove(...canvas.getActiveObjects());
      canvas?.discardActiveObject();
    }

    if (isCtrlKey && event.key === "z") {
      event.preventDefault();
      undo();
    }

    if (isCtrlKey && event.key === "y") {
      event.preventDefault();
      redo();
    }

    if (isCtrlKey && event.key === "c") {
      event.preventDefault();
      copy();
    }

    if (isCtrlKey && event.key === "v") {
      event.preventDefault();
      paste();
    }

    if (isCtrlKey && event.key === "s") {
      event.preventDefault();
      save(true);
    }

    if (isCtrlKey && event.key === "a") {
      event.preventDefault();
      canvas?.discardActiveObject();

      const allObjects = canvas
        ?.getObjects()
        .filter((object) => object.selectable);

      canvas?.setActiveObject(
        new fabric.ActiveSelection(allObjects, { canvas }),
      );
      canvas?.renderAll();
    }
  });
};
