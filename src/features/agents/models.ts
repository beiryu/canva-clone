import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_QUALITIES,
  SEEDREAM_ASPECT_RATIOS,
} from "./model-ids";
import {
  BackgroundRemoverModel,
  ImageGenerationModel,
  ModelCapability,
  StyleAnalysisModel,
  TextGenerationModel,
} from "./types";

export interface ModelConfig {
  id?: string;
  provider: string;
  name: string;
  description: string;
  capabilities: ModelCapability[];
  params: {
    /**
     * Omitted entirely when the model exposes no quality knob — the UI hides
     * the Quality select when this is absent.
     */
    quality?: string[];
    aspectRatio?: string[];
    /**
     * Model accepts a sketch / reference image. Drives whether the UI shows
     * Sketch Guidance and whether the canvas is captured and uploaded at all.
     */
    supportsImageInput?: boolean;

    maxTokens?: number;
    contextSize?: number;
  };
}

export type AnyModel =
  | ImageGenerationModel
  | TextGenerationModel
  | BackgroundRemoverModel
  | StyleAnalysisModel;

const ALL_ASPECT_RATIOS = [...IMAGE_ASPECT_RATIOS];

// Registry order drives the order of the model dropdown, so the default
// (gpt-image-2) comes first.
const productionModels: [AnyModel, ModelConfig][] = [
  [
    "gpt-image-2",
    {
      provider: "openai",
      name: "GPT Image 2",
      description: "Highest quality — supports every aspect ratio",
      capabilities: ["image-generation"],
      params: {
        quality: [...IMAGE_QUALITIES],
        // The only model here that covers all eleven ratios, because
        // gpt-image-2 takes an explicit pixel size rather than a fixed enum.
        aspectRatio: ALL_ASPECT_RATIOS,
        supportsImageInput: true,
      },
    },
  ],
  [
    "seedream-5-lite",
    {
      provider: "replicate",
      name: "Seedream 5 Lite",
      description: "Reasoning-aware generation and sketch editing",
      capabilities: ["image-generation"],
      // Resolution is fixed at 2K in the handler, so no quality knob.
      params: {
        aspectRatio: [...SEEDREAM_ASPECT_RATIOS],
        supportsImageInput: true,
      },
    },
  ],
  [
    "gpt-5.4-mini",
    {
      provider: "openai",
      name: "GPT-5.4 mini",
      description: "Reads the canvas and writes a thumbnail prompt",
      capabilities: ["text-generation"],
      params: {
        maxTokens: 300,
      },
    },
  ],
  [
    "labs/background-remover",
    {
      provider: "replicate",
      name: "Background Remover",
      description: "Remove the background from an image",
      capabilities: ["background-remover"],
      params: {},
    },
  ],
  [
    "janus-pro-7b",
    {
      provider: "replicate",
      name: "Janus Pro 7B",
      description: "Reads a reference image and writes a style instruction",
      capabilities: ["style-analysis"],
      params: {},
    },
  ],
];

export const modelRegistry = new Map<AnyModel, ModelConfig>(productionModels);
