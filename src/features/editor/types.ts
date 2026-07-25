import { fabric } from "fabric";
import { ITextboxOptions } from "fabric/fabric-impl";
import * as material from "material-colors";
import type { MutableRefObject } from "react";

import {
  ImageAspectRatio,
  ImageQuality,
  SketchGuidanceStrictness,
} from "@/features/agents/types";

export const JSON_KEYS = [
  "name",
  "gradientAngle",
  "selectable",
  "hasControls",
  "linkData",
  "editable",
  "extensionType",
  "extension",
];

export const filters = [
  "none",
  "polaroid",
  "sepia",
  "kodachrome",
  "contrast",
  "brightness",
  "greyscale",
  "brownie",
  "vintage",
  "technicolor",
  "pixelate",
  "invert",
  "blur",
  "sharpen",
  "emboss",
  "removecolor",
  "blacknwhite",
  "vibrance",
  "blendcolor",
  "huerotate",
  "resize",
  "saturation",
  "gamma",
];

export const fonts = [
  "Arial",
  "Arial Black",
  "Verdana",
  "Helvetica",
  "Tahoma",
  "Trebuchet MS",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Brush Script MT",
  "Palatino",
  "Bookman",
  "Comic Sans MS",
  "Impact",
  "Lucida Sans Unicode",
  "Geneva",
  "Lucida Console",
];

export const selectionDependentPanels: ActivePanel[] = [
  "fill",
  "font",
  "filter",
  "opacity",
  "stroke-color",
  "stroke-width",
];

export const colors = [
  material.red["500"],
  material.pink["500"],
  material.purple["500"],
  material.deepPurple["500"],
  material.indigo["500"],
  material.blue["500"],
  material.lightBlue["500"],
  material.cyan["500"],
  material.teal["500"],
  material.green["500"],
  material.lightGreen["500"],
  material.lime["500"],
  material.yellow["500"],
  material.amber["500"],
  material.orange["500"],
  material.deepOrange["500"],
  material.brown["500"],
  material.blueGrey["500"],
  "transparent",
];

/**
 * Which sidebar panel is currently open. `null` means no panel is open.
 * Note: "draw" is not a panel — it is a canvas mode, see `CanvasMode`.
 */
export type ActivePanel =
  | "shapes"
  | "text"
  | "images"
  | "templates"
  | "settings"
  | "fill"
  | "stroke-color"
  | "stroke-width"
  | "font"
  | "opacity"
  | "filter";

/** How the canvas reacts to the pointer. */
export type CanvasMode = "select" | "draw" | "crop";

/**
 * A crop window, in SOURCE-BITMAP PIXELS — the same units as fabric's
 * `cropX`/`cropY`, and independent of the object's scale, rotation or position.
 * Not screen pixels.
 */
export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const FILL_COLOR = "rgb(214, 255, 58, 1)";
export const STROKE_COLOR = "rgba(214, 255, 58, 1)";
export const STROKE_WIDTH = 15;
export const STROKE_DASH_ARRAY = [];
export const FONT_FAMILY = "Arial";
export const FONT_SIZE = 32;
export const FONT_WEIGHT = 400;

export const CIRCLE_OPTIONS = {
  radius: 225,
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
};

export const RECTANGLE_OPTIONS = {
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
  width: 400,
  height: 400,
  angle: 0,
};

export const DIAMOND_OPTIONS = {
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
  width: 600,
  height: 600,
  angle: 0,
};

export const TRIANGLE_OPTIONS = {
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
  width: 400,
  height: 400,
  angle: 0,
};

export const TEXT_OPTIONS = {
  type: "textbox",
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  fontSize: FONT_SIZE,
  fontFamily: FONT_FAMILY,
};

export interface EditorHookProps {
  defaultState?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  clearSelectionCallback?: () => void;
  /**
   * Lets crop mode mute the global hotkeys. A ref rather than a boolean because
   * `useCrop` needs the `editor` this hook returns, so the flag cannot travel
   * in as a value without a circular dependency.
   */
  isCroppingRef?: MutableRefObject<boolean>;
  saveCallback?: (values: {
    json: string;
    height: number;
    width: number;
  }) => void;
}

export type BuildEditorProps = {
  undo: () => void;
  redo: () => void;
  save: (skip?: boolean) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  autoZoom: () => void;
  copy: () => void;
  paste: () => void;
  canvas: fabric.Canvas;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  selectedObjects: fabric.Object[];
  strokeDashArray: number[];
  fontFamily: string;
  setStrokeDashArray: (value: number[]) => void;
  setFillColor: (value: string) => void;
  setStrokeColor: (value: string) => void;
  setStrokeWidth: (value: number) => void;
  setFontFamily: (value: string) => void;
};

export interface Editor {
  savePng: () => void;
  saveJpg: () => void;
  saveSvg: () => void;
  saveJson: () => void;
  loadJson: (json: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  autoZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getWorkspace: () => fabric.Object | undefined;
  changeBackground: (value: string) => void;
  changeSize: (value: { width: number; height: number }) => void;
  enableDrawingMode: () => void;
  disableDrawingMode: () => void;
  onCopy: () => void;
  onPaste: () => void;
  changeImageFilter: (value: string) => void;
  addImage: (value: string) => void;
  replaceImageSrc: (object: fabric.Image, value: string) => void;
  applyCrop: (image: fabric.Image, rect: CropRect) => void;
  delete: () => void;
  changeFontSize: (value: number) => void;
  getActiveFontSize: () => number;
  changeTextAlign: (value: string) => void;
  getActiveTextAlign: () => string;
  changeFontUnderline: (value: boolean) => void;
  getActiveFontUnderline: () => boolean;
  changeFontLinethrough: (value: boolean) => void;
  getActiveFontLinethrough: () => boolean;
  changeFontStyle: (value: string) => void;
  getActiveFontStyle: () => string;
  changeFontWeight: (value: number) => void;
  getActiveFontWeight: () => number;
  getActiveFontFamily: () => string;
  changeFontFamily: (value: string) => void;
  addText: (value: string, options?: ITextboxOptions) => void;
  getActiveOpacity: () => number;
  changeOpacity: (value: number) => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  bringForward: () => void;
  sendBackwards: () => void;
  changeStrokeWidth: (value: number) => void;
  changeFillColor: (value: string) => void;
  changeStrokeColor: (value: string) => void;
  changeStrokeDashArray: (value: number[]) => void;
  addCircle: () => void;
  addSoftRectangle: () => void;
  addRectangle: () => void;
  addTriangle: () => void;
  addInverseTriangle: () => void;
  addDiamond: () => void;
  canvas: fabric.Canvas;
  getActiveFillColor: () => string;
  getActiveStrokeColor: () => string;
  getActiveStrokeWidth: () => number;
  getActiveStrokeDashArray: () => number[];
  selectedObjects: fabric.Object[];
}

export interface GenerateState {
  formData: {
    prompt: string;
    aspectRatio: ImageAspectRatio;
    quality: ImageQuality;
    strictness: SketchGuidanceStrictness;
  };
}

export const INITIAL_GENERATE_STATE: GenerateState = {
  formData: {
    prompt:
      "Artistic background with multiple overlapping characters, in an abstract or semi-abstract style",
    aspectRatio: "1:1",
    quality: "medium",
    strictness: "moderate",
  },
};

export const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "1:1", description: "Square" },
  { value: "2:3", label: "2:3", description: "Portrait" },
  { value: "3:2", label: "3:2", description: "Landscape" },
  { value: "4:3", label: "4:3", description: "Traditional TV/Monitor" },
  { value: "3:4", label: "3:4", description: "Portrait Document" },
  { value: "4:5", label: "4:5", description: "Tall Photo" },
  { value: "5:4", label: "5:4", description: "Photo Print" },
  { value: "16:9", label: "16:9", description: "HD Widescreen" },
  { value: "9:16", label: "9:16", description: "Mobile/Story" },
  { value: "21:9", label: "21:9", description: "Ultra Wide Cinema" },
  { value: "9:21", label: "9:21", description: "Extra Tall Mobile" },
];
