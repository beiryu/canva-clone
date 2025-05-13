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
    quality?: string[];
    aspectRatio?: string[];

    maxTokens?: number;
    contextSize?: number;
  };
}

export type AnyModel =
  | ImageGenerationModel
  | TextGenerationModel
  | BackgroundRemoverModel;

const productionModels: [AnyModel, ModelConfig][] = [
  [
    "r/gpt-image-1",
    {
      provider: "replicate",
      name: "GPT Image",
      description: "Faster speed, higher quality images",
      capabilities: ["image-generation"],
      params: {
        quality: ["low", "medium", "high"],
        aspectRatio: ["1:1", "2:3", "3:2"],
      },
    },
  ],
  [
    "flux-pro-ultra",
    {
      provider: "replicate",
      name: "Flux Pro Ultra",
      description: "Standard speed, high quality images",
      capabilities: ["image-generation"],
      params: {
        quality: ["high"],
        aspectRatio: [
          "1:1",
          "16:9",
          "9:16",
          "21:9",
          "9:21",
          "3:2",
          "2:3",
          "4:5",
          "5:4",
          "3:4",
          "4:3",
        ],
      },
    },
  ],
  [
    "gpt-4",
    {
      provider: "openai",
      name: "GPT-4",
      description: "Advanced reasoning and text generation",
      capabilities: ["text-generation"],
      params: {
        maxTokens: 4096,
        contextSize: 8192,
      },
    },
  ],
  [
    "851-labs/background-remover",
    {
      provider: "replicate",
      name: "Background Remover",
      description: "Remove the background from an image",
      capabilities: ["background-remover"],
      params: {},
    },
  ],
];

const localModels = [
  [
    "flux-schnell",
    {
      provider: "replicate",
      name: "Flux Schnell",
      description: "Standard speed, standard queue",
      capabilities: ["image-generation"],
      params: {
        quality: ["low", "medium", "high"],
        aspectRatio: [
          "1:1",
          "16:9",
          "9:16",
          "21:9",
          "9:21",
          "3:2",
          "2:3",
          "4:5",
          "5:4",
          "3:4",
          "4:3",
        ],
      },
    },
  ],
  [
    "o/gpt-image-1",
    {
      provider: "openai",
      name: "GPT Image",
      description: "Faster speed, higher quality images",
      capabilities: ["image-generation"],
      params: {
        quality: ["low", "medium", "high"],
        aspectRatio: ["1:1", "2:3", "3:2"],
      },
    },
  ],
];

export const modelRegistry = new Map<AnyModel, ModelConfig>(productionModels);
