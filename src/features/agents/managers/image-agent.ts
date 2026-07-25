import { modelRegistry } from "../models";
import { getReplicateProvider } from "../providers/replicate";
import {
  AgentProvider,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
} from "../types";

export class ImageAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("replicate", getReplicateProvider());
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const modelConfig = modelRegistry.get(options.model);

    if (!modelConfig) {
      throw new Error(`Model ${options.model} not found in registry`);
    }

    const provider = this.providers.get(modelConfig.provider);

    if (!provider) {
      throw new Error(`Provider ${modelConfig.provider} not configured`);
    }

    try {
      const modelHandler = provider.getModelHandler(options.model);

      if (!this.isImageGenerationHandler(modelHandler)) {
        throw new Error(
          `Model ${options.model} does not support image generation`,
        );
      }

      return modelHandler.generateImage(options);
    } catch (error) {
      console.error(
        `Error generating image with model ${options.model}:`,
        error,
      );
      throw error;
    }
  }

  private isImageGenerationHandler(
    handler: any,
  ): handler is ImageGenerationHandler {
    return (
      handler &&
      handler.capabilities &&
      handler.capabilities.includes("image-generation")
    );
  }
}
