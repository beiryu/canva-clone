import {
  BACKGROUND_REMOVER_MODELS,
  IMAGE_ASPECT_RATIOS,
  IMAGE_GENERATION_MODELS,
  IMAGE_QUALITIES,
  SKETCH_STRICTNESS,
  TEXT_GENERATION_MODELS,
} from "./model-ids";
import { AnyModel } from "./models";

export type ImageGenerationModel = (typeof IMAGE_GENERATION_MODELS)[number];

export type TextGenerationModel = (typeof TEXT_GENERATION_MODELS)[number];

export type BackgroundRemoverModel = (typeof BACKGROUND_REMOVER_MODELS)[number];

export type ModelCapability =
  | "image-generation"
  | "text-generation"
  | "background-remover";

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];

export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

export type SketchGuidanceStrictness = (typeof SKETCH_STRICTNESS)[number];

// Base options interface for all generation types
export interface BaseGenerationOptions {
  model: AnyModel;
}

export interface ImageGenerationOptions extends BaseGenerationOptions {
  prompt: string;
  canvasImage?: string;
  style?: string;
  settings: {
    aspectRatio?: ImageAspectRatio;
    quality?: ImageQuality;
    strictness?: SketchGuidanceStrictness;
  };
}

export interface EnhancePromptOptions extends BaseGenerationOptions {
  currentPrompt: string;
}

export interface RemoveBgOptions extends BaseGenerationOptions {
  image: string;
}

// Result interfaces
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

// Provider API interfaces
export interface AgentProvider {
  name: string;
  supportedCapabilities: ModelCapability[];
  getModelHandler: (model: string) => ModelHandler;
}

// Model handler interface
export interface ModelHandler {
  model: string;
  capabilities: ModelCapability[];
  supportsModel: (model: string) => boolean;
}

// Specific capability interfaces
export interface ImageGenerationHandler extends ModelHandler {
  generateImage: (
    options: ImageGenerationOptions,
  ) => Promise<ImageGenerationResult>;
  /**
   * Optional: no model implements this yet. flux-kontext-pro genuinely is an
   * image-editing model, so this is the natural home for that feature — but a
   * required method every handler stubs out with a throw is worse than none.
   */
  editImage?: (
    options: ImageGenerationOptions,
  ) => Promise<ImageGenerationResult>;
}

export interface TextGenerationHandler extends ModelHandler {
  enhancePrompt: (
    options: EnhancePromptOptions,
  ) => Promise<TextGenerationResult>;
}

export interface BackgroundRemoverHandler extends ModelHandler {
  removeBg: (options: RemoveBgOptions) => Promise<RemoveBgResult>;
}
