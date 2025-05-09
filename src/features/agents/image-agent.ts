import { modelRegistry } from "./models";
import { OpenAIProvider } from "./providers/openai";
import { ReplicateProvider } from "./providers/replicate";
import {
  AgentProvider,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
} from "./types";

export class ImageAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("openai", new OpenAIProvider());
    this.providers.set("replicate", new ReplicateProvider());
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const modelConfig = modelRegistry.get(options.settings.model);

    if (!modelConfig) {
      throw new Error(`Model ${options.settings.model} not found in registry`);
    }

    const provider = this.providers.get(modelConfig.provider);

    if (!provider) {
      throw new Error(`Provider ${modelConfig.provider} not configured`);
    }

    try {
      // Get the appropriate model handler from the provider
      const modelHandler = provider.getModelHandler(options.settings.model);

      // Ensure the handler implements ImageGenerationHandler
      if (!this.isImageGenerationHandler(modelHandler)) {
        throw new Error(
          `Model ${options.settings.model} does not support image generation`,
        );
      }

      // Call the handler's generateImage method
      return modelHandler.generateImage(options);
    } catch (error) {
      console.error(
        `Error generating image with model ${options.settings.model}:`,
        error,
      );
      throw error;
    }
  }

  // Type guard to check if a model handler implements ImageGenerationHandler
  private isImageGenerationHandler(
    handler: any,
  ): handler is ImageGenerationHandler {
    return (
      handler &&
      typeof handler.generateImage === "function" &&
      handler.capabilities &&
      handler.capabilities.includes("image-generation")
    );
  }

  // Get available models that support image generation
  getAvailableModels(): string[] {
    const models: string[] = [];

    modelRegistry.forEach((config, model) => {
      if (config.capabilities.includes("image-generation")) {
        models.push(model as string);
      }
    });

    return models;
  }
}
