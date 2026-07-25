import { fabric } from "fabric";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { Editor } from "@/features/editor/types";
import { useAgentRemoveBg } from "@/features/ai/api/use-agent-remove-bg";
import { getImageUrl } from "@/features/images/utils";

interface UseRemoveBackgroundProps {
  editor: Editor | undefined;
  projectId: string;
}

/**
 * One-click background removal for the selected canvas image: the result
 * replaces the image in place, keeping its position, scale and rotation.
 *
 * Lives above `Toolbar` because that component is force-remounted whenever the
 * active object changes — dimming the image would otherwise wipe the in-flight
 * state mid-request.
 */
export const useRemoveBackground = ({
  editor,
  projectId,
}: UseRemoveBackgroundProps) => {
  const mutation = useAgentRemoveBg();

  // Holds the target and its original opacity so the dim can be reverted even
  // if the selection changed while the request was running.
  const pendingRef = useRef<{ image: fabric.Image; opacity: number } | null>(
    null,
  );

  const removeBackground = useCallback(() => {
    const canvas = editor?.canvas;
    const active = canvas?.getActiveObject();

    if (!canvas || !active || active.type !== "image" || mutation.isPending) {
      return;
    }

    const image = active as fabric.Image;
    const src = image.getSrc();

    // The route hands the src straight to Replicate, so data:/blob: URLs fail.
    if (!/^https?:\/\//.test(src)) {
      toast.error("This image can't be processed");
      return;
    }

    const opacity = image.opacity ?? 1;
    pendingRef.current = { image, opacity };

    image.set({ opacity: opacity * 0.5, selectable: false, evented: false });
    canvas.renderAll();

    mutation.mutate(
      { image: src, projectId },
      {
        onSuccess: ({ data: { fullPath } }) => {
          editor?.replaceImageSrc(image, getImageUrl(fullPath));
        },
        onSettled: () => {
          const pending = pendingRef.current;
          pendingRef.current = null;

          if (!pending) return;

          pending.image.set({
            opacity: pending.opacity,
            selectable: true,
            evented: true,
          });
          canvas.renderAll();
        },
      },
    );
  }, [editor, mutation, projectId]);

  return {
    removeBackground,
    isRemovingBackground: mutation.isPending,
  };
};
