import {
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
    supportsSeed?: boolean;
    quality?: string[];
    aspectRatio?: string[];

    maxTokens?: number;
    contextSize?: number;
  };
}

type AnyModel = ImageGenerationModel | TextGenerationModel;

export const modelRegistry = new Map<AnyModel, ModelConfig>([
  // TODO: For local testing
  [
    "flux-schnell",
    {
      provider: "replicate",
      name: "Flux Schnell",
      description: "Standard speed, standard queue",
      capabilities: ["image-generation"],
      params: {
        supportsSeed: true,
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
    "gpt-image-1",
    {
      provider: "openai",
      name: "GPT Image",
      description: "Faster speed, higher quality images",
      capabilities: ["image-generation"],
      params: {
        supportsSeed: false,
        quality: ["low", "medium", "high"],
        aspectRatio: ["1:1", "2:3", "3:2"],
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
]);
