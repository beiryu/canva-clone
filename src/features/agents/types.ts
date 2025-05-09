export type AgentTask = "image" | "text";

export type ImageGenerationModel = "gpt-image-1" | "flux-schnell";

export type TextGenerationModel = "gpt-4";

export type ModelCapability =
  | "image-generation"
  | "text-generation"
  | "image-editing"
  | "image-variations"
  | "prompt-enhancement";

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
  model: string;
}

export interface ImageGenerationOptions extends BaseGenerationOptions {
  prompt: string;
  aspectRatio?: ImageAspectRatio;
  quality?: ImageQuality;
  model: ImageGenerationModel;
  seed?: number;
  n?: number;
  canvasImage?: string;
}

export interface TextGenerationOptions extends BaseGenerationOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model: TextGenerationModel;
}

// Result interfaces
export interface ImageGenerationResult {
  url: string;
  model: ImageGenerationModel;
  prompt: string;
}

export interface TextGenerationResult {
  text: string;
  model: TextGenerationModel;
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
}

export interface TextGenerationHandler extends ModelHandler {
  generateText: (
    options: TextGenerationOptions,
  ) => Promise<TextGenerationResult>;
}
