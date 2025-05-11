import { AnyModel } from "./models";

export type ImageGenerationModel =
  | "gpt-image-1"
  | "flux-schnell"
  | "replicate/gpt-image";

export type TextGenerationModel = "gpt-4";

export type ModelCapability = "image-generation" | "text-generation";

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

// Base options interface for all generation types
export interface BaseGenerationOptions {
  model: AnyModel;
}

export interface ImageGenerationOptions extends BaseGenerationOptions {
  prompt: string;
  canvasImage?: string;
  settings: {
    aspectRatio?: ImageAspectRatio;
    quality?: ImageQuality;
  };
}

export interface TextGenerationOptions extends BaseGenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface EnhancePromptOptions extends BaseGenerationOptions {
  currentPrompt: string;
}

// Result interfaces
export interface ImageGenerationResult {
  file: File;
}

export interface TextGenerationResult {
  text: string;
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
