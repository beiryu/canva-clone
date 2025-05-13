import { AnyModel } from "./models";

export type ImageGenerationModel =
  | "o/gpt-image-1"
  | "flux-schnell"
  | "r/gpt-image-1"
  | "flux-1.1-pro-ultra";

export type TextGenerationModel = "gpt-4.1-mini";

export type BackgroundRemoverModel = "labs/background-remover";

export type ModelCapability =
  | "image-generation"
  | "text-generation"
  | "background-remover";

export type ImageAspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "21:9"
  | "9:21"
  | "3:2"
  | "2:3"
  | "4:5"
  | "5:4"
  | "3:4"
  | "4:3";

export type ImageQuality = "low" | "medium" | "high";

export type SketchGuidanceStrictness = "loose" | "moderate" | "strict";

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

export interface TextGenerationOptions extends BaseGenerationOptions {
  temperature?: number;
  maxTokens?: number;
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
  editImage: (
    options: ImageGenerationOptions,
  ) => Promise<ImageGenerationResult>;
}

export interface TextGenerationHandler extends ModelHandler {
  generateText: (
    options: TextGenerationOptions,
  ) => Promise<TextGenerationResult>;
  enhancePrompt: (
    options: EnhancePromptOptions,
  ) => Promise<TextGenerationResult>;
}

export interface BackgroundRemoverHandler extends ModelHandler {
  removeBg: (options: RemoveBgOptions) => Promise<RemoveBgResult>;
}
