import { fabric } from "fabric";
import { useCallback, useRef } from "react";

import { JSON_KEYS } from "@/features/editor/types";

interface UseClipboardProps {
  canvas: fabric.Canvas | null;
}

export const useClipboard = ({ canvas }: UseClipboardProps) => {
  const clipboard = useRef<any>(null);

  // clone() round-trips through toObject(propertiesToInclude), so without
  // JSON_KEYS every custom prop is dropped: a pasted textbox lost its text
  // effect (and with it the render path keyed off `textEffect`), and paste has
  // always silently dropped `name`, `linkData` and `extension` too.
  const copy = useCallback(() => {
    canvas?.getActiveObject()?.clone((cloned: any) => {
      clipboard.current = cloned;
    }, JSON_KEYS);
  }, [canvas]);

  const paste = useCallback(() => {
    if (!clipboard.current) return;

    clipboard.current.clone((clonedObj: any) => {
      canvas?.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true,
      });

      if (clonedObj.type === "activeSelection") {
        clonedObj.canvas = canvas;
        clonedObj.forEachObject((obj: any) => {
          canvas?.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvas?.add(clonedObj);
      }

      clipboard.current.top += 10;
      clipboard.current.left += 10;
      canvas?.setActiveObject(clonedObj);
      canvas?.requestRenderAll();
    }, JSON_KEYS);
  }, [canvas]);

  return { copy, paste };
};
