import {
  BACKGROUND_REMOVER_MODELS,
  IMAGE_ASPECT_RATIOS,
  IMAGE_GENERATION_MODELS,
  IMAGE_QUALITIES,
  SKETCH_STRICTNESS,
  STYLE_ANALYSIS_MODELS,
  TEXT_GENERATION_MODELS,
} from "./model-ids";
import { AnyModel } from "./models";

export type ImageGenerationModel = (typeof IMAGE_GENERATION_MODELS)[number];

export type TextGenerationModel = (typeof TEXT_GENERATION_MODELS)[number];

export type BackgroundRemoverModel = (typeof BACKGROUND_REMOVER_MODELS)[number];

export type StyleAnalysisModel = (typeof STYLE_ANALYSIS_MODELS)[number];

export type ModelCapability =
  | "image-generation"
  | "text-generation"
  | "background-remover"
  | "style-analysis";

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];

export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

export type SketchGuidanceStrictness = (typeof SKETCH_STRICTNESS)[number];

export interface BaseGenerationOptions {
  model: AnyModel;
}

export interface ImageGenerationOptions extends BaseGenerationOptions {
  prompt: string;
  canvasImage?: string;
  style?: string;
  /**
   * Fully-resolved style guidance from a user-created preset. When present it
   * replaces whatever `style` would have produced via `createStyleInstruction`,
   * because preset text lives in the database rather than the built-in switch.
   */
  styleInstruction?: string;
  settings: {
    aspectRatio?: ImageAspectRatio;
    quality?: ImageQuality;
    strictness?: SketchGuidanceStrictness;
  };
}

export interface AutoPromptOptions extends BaseGenerationOptions {
  /**
   * The current canvas, as a downscaled data URL. Required — the whole point is
   * writing a prompt from what the user drew.
   */
  canvasImage: string;
  /** Whatever the user already typed, used as topic context. May be empty. */
  context?: string;
  /**
   * Verbatim contents of the canvas' text layers, read straight off the fabric
   * objects rather than out of `canvasImage`. The snapshot is downscaled to
   * 512px, at which point a headline is usually too soft to transcribe — and a
   * half-read Vietnamese headline is worse than none, since the image model
   * would then render the misreading.
   */
  canvasText?: string[];
}

export interface RemoveBgOptions extends BaseGenerationOptions {
  image: string;
}

export interface StyleAnalysisOptions extends BaseGenerationOptions {
  /** Publicly fetchable URI — Replicate cannot read private storage. */
  image: string;
}

export interface ImageGenerationResult {
  file: File;
  providerName?: string;
  providerImageId?: string;
}

export interface TextGenerationResult {
  text: string;
}

export interface RemoveBgResult {
  file: File;
}

export interface StyleAnalysisResult {
  instruction: string;
}

export interface AgentProvider {
  name: string;
  supportedCapabilities: ModelCapability[];
  getModelHandler: (model: string) => ModelHandler;
}

export interface ModelHandler {
  model: string;
  capabilities: ModelCapability[];
  supportsModel: (model: string) => boolean;
}

export interface ImageGenerationHandler extends ModelHandler {
  generateImage: (
    options: ImageGenerationOptions,
  ) => Promise<ImageGenerationResult>;
}

export interface TextGenerationHandler extends ModelHandler {
  autoPrompt: (options: AutoPromptOptions) => Promise<TextGenerationResult>;
}

export interface BackgroundRemoverHandler extends ModelHandler {
  removeBg: (options: RemoveBgOptions) => Promise<RemoveBgResult>;
}

export interface StyleAnalysisHandler extends ModelHandler {
  analyzeStyle: (
    options: StyleAnalysisOptions,
  ) => Promise<StyleAnalysisResult>;
}
