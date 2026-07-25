import { fabric } from "fabric";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEvent } from "react-use";

import { CropRect, Editor } from "@/features/editor/types";
import {
  clampCropRect,
  getImageNaturalSize,
  sceneDeltaToSource,
  sceneToSource,
  sourceDeltaToScene,
  sourceToScene,
} from "@/features/editor/utils";

/** Drawn handle size and hit tolerance, both in screen pixels. */
const HANDLE_SIZE = 9;
const HANDLE_HIT_SIZE = 16;
const MIN_CROP_SIZE = 20;

const SHADE_COLOR = "rgba(0, 0, 0, 0.55)";
// Matches the control theme set in use-editor's init.
const FRAME_COLOR = "#3b82f6";
const HANDLE_FILL = "#FFFFFF";

/** Corner and edge-midpoint handles. Letters encode which edges they move. */
const HANDLE_KEYS = ["tl", "tr", "bl", "br", "ml", "mr", "mt", "mb"] as const;

type HandleKey = (typeof HANDLE_KEYS)[number];

type Drag =
  | { kind: "handle"; which: HandleKey; pointer: fabric.Point }
  | { kind: "image"; pointer: fabric.Point };

/** Everything Esc has to put back. */
type Snapshot = {
  cropX: number;
  cropY: number;
  width: number;
  height: number;
  left: number;
  top: number;
  hasControls: boolean;
  hasBorders: boolean;
  lockMovementX: boolean;
  lockMovementY: boolean;
  lockRotation: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Resizes a crop window edge-wise so the handle being dragged moves only its own
 * edges and the opposite ones stay pinned.
 */
const resizeCropRect = (
  rect: CropRect,
  which: HandleKey,
  delta: { x: number; y: number },
  natural: { width: number; height: number },
): CropRect => {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (which.includes("l")) {
    left = clamp(left + delta.x, 0, right - MIN_CROP_SIZE);
  }
  if (which.includes("r")) {
    right = clamp(right + delta.x, left + MIN_CROP_SIZE, natural.width);
  }
  if (which.includes("t")) {
    top = clamp(top + delta.y, 0, bottom - MIN_CROP_SIZE);
  }
  if (which.includes("b")) {
    bottom = clamp(bottom + delta.y, top + MIN_CROP_SIZE, natural.height);
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
};

/** Handle positions in source-bitmap pixels. */
const handlePoint = (rect: CropRect, which: HandleKey) => {
  const x = which.includes("l")
    ? rect.x
    : which.includes("r")
      ? rect.x + rect.width
      : rect.x + rect.width / 2;
  const y = which.includes("t")
    ? rect.y
    : which.includes("b")
      ? rect.y + rect.height
      : rect.y + rect.height / 2;

  return { x, y };
};

interface UseCropProps {
  editor: Editor | undefined;
  onEnter?: () => void;
  onExit?: () => void;
}

/**
 * Canva-style crop mode for the selected image.
 *
 * While cropping, the image is expanded to show its whole bitmap and the crop
 * window is drawn as an overlay on `canvas.contextTop` — deliberately not as
 * fabric objects, which would push junk entries onto the undo stack (history is
 * driven by object:added/removed) and steal the active selection from the image.
 *
 * Lives above `Toolbar` for the same reason as `useRemoveBackground`: that
 * component is force-remounted whenever the active object changes.
 */
export const useCrop = ({ editor, onEnter, onExit }: UseCropProps) => {
  const [isCropping, setIsCropping] = useState(false);

  const imageRef = useRef<fabric.Image | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  // The single source of truth while cropping, in source-bitmap pixels.
  const rectRef = useRef<CropRect | null>(null);
  const dragRef = useRef<Drag | null>(null);
  // Other objects are frozen during a crop; this restores them.
  const frozenRef = useRef<
    { object: fabric.Object; selectable: boolean; evented: boolean }[]
  >([]);
  const canvasSelectionRef = useRef(true);

  const teardown = useCallback(() => {
    const canvas = editor?.canvas;
    const image = imageRef.current;
    const snapshot = snapshotRef.current;

    if (canvas && image && snapshot) {
      image.set({
        hasControls: snapshot.hasControls,
        hasBorders: snapshot.hasBorders,
        lockMovementX: snapshot.lockMovementX,
        lockMovementY: snapshot.lockMovementY,
        lockRotation: snapshot.lockRotation,
      });
      image.setCoords();
    }

    if (canvas) {
      canvas.selection = canvasSelectionRef.current;
      frozenRef.current.forEach(({ object, selectable, evented }) =>
        object.set({ selectable, evented }),
      );
      // The overlay is drawn on contextTop; marking it dirty makes fabric clear
      // it on the next render.
      // @ts-ignore — contextTopDirty is internal and missing from @types/fabric.
      canvas.contextTopDirty = true;
      canvas.requestRenderAll();
    }

    frozenRef.current = [];
    imageRef.current = null;
    snapshotRef.current = null;
    rectRef.current = null;
    dragRef.current = null;

    setIsCropping(false);
    onExit?.();
  }, [editor, onExit]);

  const startCrop = useCallback(() => {
    const canvas = editor?.canvas;
    const active = canvas?.getActiveObject();

    if (!canvas || !active || active.type !== "image" || isCropping) return;

    const image = active as fabric.Image;
    const natural = getImageNaturalSize(image);

    if (!natural.width || !natural.height) return;

    snapshotRef.current = {
      cropX: image.cropX || 0,
      cropY: image.cropY || 0,
      width: image.width || natural.width,
      height: image.height || natural.height,
      left: image.left || 0,
      top: image.top || 0,
      hasControls: image.hasControls ?? true,
      hasBorders: image.hasBorders ?? true,
      lockMovementX: image.lockMovementX ?? false,
      lockMovementY: image.lockMovementY ?? false,
      lockRotation: image.lockRotation ?? false,
    };

    rectRef.current = clampCropRect(
      {
        x: image.cropX || 0,
        y: image.cropY || 0,
        width: image.width || natural.width,
        height: image.height || natural.height,
      },
      natural,
      MIN_CROP_SIZE,
    );

    // Expand to the full bitmap, then shift the object so the region that was
    // visible a moment ago stays exactly where it was on screen.
    const anchor = image.getPointByOrigin("left", "top");

    image.set({
      cropX: 0,
      cropY: 0,
      width: natural.width,
      height: natural.height,
      // Let the overlay own the frame — fabric's own controls and border would
      // otherwise sit around the full bitmap and fight the crop handles.
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
    });
    image.setCoords();

    const shifted = sourceToScene(image, rectRef.current.x, rectRef.current.y);
    image.set({
      left: (image.left || 0) + (anchor.x - shifted.x),
      top: (image.top || 0) + (anchor.y - shifted.y),
    });
    image.setCoords();

    canvasSelectionRef.current = canvas.selection ?? true;
    canvas.selection = false;

    frozenRef.current = canvas
      .getObjects()
      .filter((object) => object !== image)
      .map((object) => ({
        object,
        selectable: object.selectable ?? true,
        evented: object.evented ?? true,
      }));
    frozenRef.current.forEach(({ object }) =>
      object.set({ selectable: false, evented: false }),
    );

    imageRef.current = image;
    setIsCropping(true);
    onEnter?.();
    canvas.requestRenderAll();
  }, [editor, isCropping, onEnter]);

  const applyCrop = useCallback(() => {
    const image = imageRef.current;
    const rect = rectRef.current;

    if (image && rect) {
      editor?.applyCrop(image, rect);
    }

    teardown();
  }, [editor, teardown]);

  const cancelCrop = useCallback(() => {
    const image = imageRef.current;
    const snapshot = snapshotRef.current;

    if (image && snapshot) {
      image.set({
        cropX: snapshot.cropX,
        cropY: snapshot.cropY,
        width: snapshot.width,
        height: snapshot.height,
        left: snapshot.left,
        top: snapshot.top,
      });
      image.setCoords();
    }

    // No save() — a cancelled crop must not touch history.
    teardown();
  }, [teardown]);

  // Overlay rendering: shade everything, punch out the crop window, then draw
  // the frame and handles.
  useEffect(() => {
    const canvas = editor?.canvas;

    if (!canvas || !isCropping) return;

    const draw = () => {
      const image = imageRef.current;
      const rect = rectRef.current;
      // @ts-ignore — contextTop exists at runtime but is absent from @types/fabric.
      const context = canvas.contextTop as CanvasRenderingContext2D | undefined;

      if (!image || !rect || !context) return;

      const toScreen = (sourceX: number, sourceY: number) =>
        fabric.util.transformPoint(
          sourceToScene(image, sourceX, sourceY),
          canvas.viewportTransform as number[],
        );

      const quad = [
        toScreen(rect.x, rect.y),
        toScreen(rect.x + rect.width, rect.y),
        toScreen(rect.x + rect.width, rect.y + rect.height),
        toScreen(rect.x, rect.y + rect.height),
      ];

      context.save();

      context.fillStyle = SHADE_COLOR;
      context.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());

      // Clear the shade inside the window. Works for any quad, so a rotated
      // image needs no special case.
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      quad.forEach((point, index) =>
        index === 0
          ? context.moveTo(point.x, point.y)
          : context.lineTo(point.x, point.y),
      );
      context.closePath();
      context.fill();

      context.globalCompositeOperation = "source-over";
      context.strokeStyle = FRAME_COLOR;
      context.lineWidth = 1.5;
      context.beginPath();
      quad.forEach((point, index) =>
        index === 0
          ? context.moveTo(point.x, point.y)
          : context.lineTo(point.x, point.y),
      );
      context.closePath();
      context.stroke();

      context.fillStyle = HANDLE_FILL;
      HANDLE_KEYS.forEach((which) => {
        const source = handlePoint(rect, which);
        const point = toScreen(source.x, source.y);

        context.beginPath();
        context.arc(point.x, point.y, HANDLE_SIZE / 2, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });

      context.restore();

      // @ts-ignore — internal flag, tells fabric to clear contextTop next frame.
      canvas.contextTopDirty = true;
    };

    canvas.on("after:render", draw);
    canvas.requestRenderAll();

    return () => {
      canvas.off("after:render", draw);
    };
  }, [editor, isCropping]);

  // Pointer handling. These are the only mouse:* listeners in the app, and
  // use-canvas-events only detaches object:*/selection:* names, so the two
  // hooks can't clobber each other.
  useEffect(() => {
    const canvas = editor?.canvas;

    if (!canvas || !isCropping) return;

    const onMouseDown = (opt: fabric.IEvent) => {
      const image = imageRef.current;
      const rect = rectRef.current;

      if (!image || !rect) return;

      const pointer = canvas.getPointer(opt.e);
      const zoom = canvas.getZoom() || 1;
      const tolerance = HANDLE_HIT_SIZE / 2 / zoom;

      const hit = HANDLE_KEYS.find((which) => {
        const source = handlePoint(rect, which);
        const scene = sourceToScene(image, source.x, source.y);

        return (
          Math.abs(scene.x - pointer.x) <= tolerance &&
          Math.abs(scene.y - pointer.y) <= tolerance
        );
      });

      if (hit) {
        dragRef.current = {
          kind: "handle",
          which: hit,
          pointer: new fabric.Point(pointer.x, pointer.y),
        };
        return;
      }

      const source = sceneToSource(image, new fabric.Point(pointer.x, pointer.y));
      const isInside =
        source.x >= rect.x &&
        source.x <= rect.x + rect.width &&
        source.y >= rect.y &&
        source.y <= rect.y + rect.height;

      if (isInside) {
        dragRef.current = {
          kind: "image",
          pointer: new fabric.Point(pointer.x, pointer.y),
        };
      }
    };

    const onMouseMove = (opt: fabric.IEvent) => {
      const drag = dragRef.current;
      const image = imageRef.current;
      const rect = rectRef.current;

      if (!drag || !image || !rect) return;

      const pointer = canvas.getPointer(opt.e);
      const sceneDeltaX = pointer.x - drag.pointer.x;
      const sceneDeltaY = pointer.y - drag.pointer.y;
      const natural = getImageNaturalSize(image);
      const delta = sceneDeltaToSource(image, sceneDeltaX, sceneDeltaY);

      if (drag.kind === "handle") {
        rectRef.current = resizeCropRect(rect, drag.which, delta, natural);
      } else {
        // Slide the photo under a frame that stays put: move the object, then
        // shift the window the other way by however much actually applied
        // (clamping at the bitmap edge can shorten it).
        const clamped = clampCropRect(
          { ...rect, x: rect.x - delta.x, y: rect.y - delta.y },
          natural,
          MIN_CROP_SIZE,
        );
        const applied = sourceDeltaToScene(
          image,
          rect.x - clamped.x,
          rect.y - clamped.y,
        );

        image.set({
          left: (image.left || 0) + applied.x,
          top: (image.top || 0) + applied.y,
        });
        image.setCoords();
        rectRef.current = clamped;
      }

      drag.pointer = new fabric.Point(pointer.x, pointer.y);
      canvas.requestRenderAll();
    };

    const onMouseUp = () => {
      dragRef.current = null;
    };

    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);

    return () => {
      canvas.off("mouse:down", onMouseDown);
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:up", onMouseUp);
    };
  }, [editor, isCropping]);

  useEvent("keydown", (event: KeyboardEvent) => {
    if (!isCropping) return;

    if (event.key === "Enter") {
      event.preventDefault();
      applyCrop();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelCrop();
    }
  });

  return { isCropping, startCrop, applyCrop, cancelCrop };
};
