import { IMAGE_ASPECT_RATIOS, IMAGE_QUALITIES } from "./model-ids";
import {
  BackgroundRemoverModel,
  ImageGenerationModel,
  ModelCapability,
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
  | BackgroundRemoverModel;

const ALL_ASPECT_RATIOS = [...IMAGE_ASPECT_RATIOS];

// Registry order drives the order of the model dropdown, so the default
// (flux-kontext-pro) comes first.
const productionModels: [AnyModel, ModelConfig][] = [
  [
    "flux-kontext-pro",
    {
      provider: "replicate",
      name: "Flux Kontext Pro",
      description: "Best for turning your canvas sketch into an image",
      capabilities: ["image-generation"],
      // No quality param on this model.
      params: {
        aspectRatio: ALL_ASPECT_RATIOS,
        supportsImageInput: true,
      },
    },
  ],
  [
    "flux-1.1-pro-ultra",
    {
      provider: "replicate",
      name: "Flux Pro Ultra",
      description: "Highest detail, looser sketch guidance",
      capabilities: ["image-generation"],
      // No quality param on this model.
      params: {
        aspectRatio: ALL_ASPECT_RATIOS,
        supportsImageInput: true,
      },
    },
  ],
  [
    "flux-schnell",
    {
      provider: "replicate",
      name: "Flux Schnell",
      description: "Fastest, prompt only — ignores your sketch",
      capabilities: ["image-generation"],
      params: {
        quality: [...IMAGE_QUALITIES],
        aspectRatio: ALL_ASPECT_RATIOS,
        supportsImageInput: false,
      },
    },
  ],
  [
    "llama-3-70b-instruct",
    {
      provider: "replicate",
      name: "Llama 3 70B Instruct",
      description: "Prompt enhancement",
      capabilities: ["text-generation"],
      params: {
        maxTokens: 500,
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
];

export const modelRegistry = new Map<AnyModel, ModelConfig>(productionModels);
