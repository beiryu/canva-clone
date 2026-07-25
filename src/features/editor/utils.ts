import { fabric } from "fabric";
import type { RGBColor } from "react-color";
import { uuid } from "uuidv4";

import { CropRect } from "@/features/editor/types";

/**
 * Size of the untouched source bitmap.
 *
 * Deliberately reads `_originalElement` rather than `getOriginalSize()`, which
 * measures the *filtered* `_element` — once a filter that resizes has run, that
 * returns the wrong bounds, and crop offsets are always in original-image space.
 */
export function getImageNaturalSize(image: fabric.Image) {
  // @ts-ignore — _originalElement is internal but the only correct source here.
  const element = image._originalElement as HTMLImageElement | undefined;

  return {
    width: element?.naturalWidth || image.width || 0,
    height: element?.naturalHeight || image.height || 0,
  };
}

/**
 * Keeps a crop window inside the bitmap and above a minimum size. Without this
 * fabric silently clamps an oversized window while drawing, leaving part of the
 * object's box empty instead of erroring.
 */
export function clampCropRect(
  rect: CropRect,
  natural: { width: number; height: number },
  minSize = 20,
): CropRect {
  const width = Math.min(Math.max(rect.width, minSize), natural.width);
  const height = Math.min(Math.max(rect.height, minSize), natural.height);

  return {
    width,
    height,
    x: Math.min(Math.max(rect.x, 0), natural.width - width),
    y: Math.min(Math.max(rect.y, 0), natural.height - height),
  };
}

/**
 * Maps a source-bitmap pixel to scene coordinates, assuming the image is
 * currently showing its full bitmap (as it is during crop mode). Fabric renders
 * images from a centre origin, hence the half-size shift.
 */
export function sourceToScene(
  image: fabric.Image,
  sourceX: number,
  sourceY: number,
) {
  const natural = getImageNaturalSize(image);

  return fabric.util.transformPoint(
    new fabric.Point(sourceX - natural.width / 2, sourceY - natural.height / 2),
    image.calcTransformMatrix(),
  );
}

/**
 * Maps a scene point back to a source-bitmap pixel. Inverse of `sourceToScene`,
 * and the simplest way to test whether a pointer is inside a rotated crop
 * window: undo the transform and compare against an axis-aligned rect.
 */
export function sceneToSource(image: fabric.Image, point: fabric.Point) {
  const natural = getImageNaturalSize(image);
  const local = fabric.util.transformPoint(
    point,
    fabric.util.invertTransform(image.calcTransformMatrix()),
  );

  return {
    x: local.x + natural.width / 2,
    y: local.y + natural.height / 2,
  };
}

/**
 * Converts a scene-space drag delta into source-bitmap pixels, undoing the
 * object's rotation and scale. This is what makes a rotated image croppable.
 */
export function sceneDeltaToSource(
  image: fabric.Image,
  deltaX: number,
  deltaY: number,
) {
  const unrotated = fabric.util.rotateVector(
    new fabric.Point(deltaX, deltaY),
    -fabric.util.degreesToRadians(image.angle || 0),
  );

  return {
    x: unrotated.x / (image.scaleX || 1),
    y: unrotated.y / (image.scaleY || 1),
  };
}

/** Inverse of `sceneDeltaToSource`. */
export function sourceDeltaToScene(
  image: fabric.Image,
  deltaX: number,
  deltaY: number,
) {
  const scaled = new fabric.Point(
    deltaX * (image.scaleX || 1),
    deltaY * (image.scaleY || 1),
  );

  return fabric.util.rotateVector(
    scaled,
    fabric.util.degreesToRadians(image.angle || 0),
  );
}

export function transformText(objects: any) {
  if (!objects) return;

  objects.forEach((item: any) => {
    if (item.objects) {
      transformText(item.objects);
    } else {
      item.type === "text" && item.type === "textbox";
    }
  });
}

export function downloadFile(file: string, type: string) {
  const anchorElement = document.createElement("a");

  anchorElement.href = file;
  anchorElement.download = `${uuid()}.${type}`;
  document.body.appendChild(anchorElement);
  anchorElement.click();
  anchorElement.remove();
}

export function isTextType(type: string | undefined) {
  return type === "text" || type === "i-text" || type === "textbox";
}

export function rgbaObjectToString(rgba: RGBColor | "transparent") {
  if (rgba === "transparent") {
    return `rgba(0,0,0,0)`;
  }

  const alpha = rgba.a === undefined ? 1 : rgba.a;

  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`;
}

export const createFilter = (value: string) => {
  let effect;

  switch (value) {
    case "greyscale":
      effect = new fabric.Image.filters.Grayscale();
      break;
    case "polaroid":
      // @ts-ignore
      effect = new fabric.Image.filters.Polaroid();
      break;
    case "sepia":
      effect = new fabric.Image.filters.Sepia();
      break;
    case "kodachrome":
      // @ts-ignore
      effect = new fabric.Image.filters.Kodachrome();
      break;
    case "contrast":
      effect = new fabric.Image.filters.Contrast({ contrast: 0.3 });
      break;
    case "brightness":
      effect = new fabric.Image.filters.Brightness({ brightness: 0.8 });
      break;
    case "brownie":
      // @ts-ignore
      effect = new fabric.Image.filters.Brownie();
      break;
    case "vintage":
      // @ts-ignore
      effect = new fabric.Image.filters.Vintage();
      break;
    case "technicolor":
      // @ts-ignore
      effect = new fabric.Image.filters.Technicolor();
      break;
    case "pixelate":
      effect = new fabric.Image.filters.Pixelate();
      break;
    case "invert":
      effect = new fabric.Image.filters.Invert();
      break;
    case "blur":
      effect = new fabric.Image.filters.Blur();
      break;
    case "sharpen":
      effect = new fabric.Image.filters.Convolute({
        matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
      });
      break;
    case "emboss":
      effect = new fabric.Image.filters.Convolute({
        matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1],
      });
      break;
    case "removecolor":
      // @ts-ignore
      effect = new fabric.Image.filters.RemoveColor({
        threshold: 0.2,
        distance: 0.5,
      });
      break;
    case "blacknwhite":
      // @ts-ignore
      effect = new fabric.Image.filters.BlackWhite();
      break;
    case "vibrance":
      // @ts-ignore
      effect = new fabric.Image.filters.Vibrance({
        vibrance: 1,
      });
      break;
    case "blendcolor":
      effect = new fabric.Image.filters.BlendColor({
        color: "#00ff00",
        mode: "multiply",
      });
      break;
    case "huerotate":
      effect = new fabric.Image.filters.HueRotation({
        rotation: 0.5,
      });
      break;
    case "resize":
      effect = new fabric.Image.filters.Resize();
      break;
    case "gamma":
      // @ts-ignore
      effect = new fabric.Image.filters.Gamma({
        gamma: [1, 0.5, 2.1],
      });
    case "saturation":
      effect = new fabric.Image.filters.Saturation({
        saturation: 0.7,
      });
      break;
    default:
      effect = null;
      return;
  }

  return effect;
};
