import { modelRegistry } from "../models";
import { ReplicateProvider } from "../providers/replicate";
import {
  AgentProvider,
  BackgroundRemoverHandler,
  RemoveBgOptions,
  RemoveBgResult,
} from "../types";

export class BackgroundRemoverAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("replicate", new ReplicateProvider());
  }

  async removeBg(options: RemoveBgOptions): Promise<RemoveBgResult> {
    const modelConfig = modelRegistry.get(options.model);

    if (!modelConfig) {
      throw new Error(`Model ${options.model} not found in registry`);
    }

    const provider = this.providers.get(modelConfig.provider);

    if (!provider) {
      throw new Error(`Provider ${modelConfig.provider} not configured`);
    }

    try {
      // Get the appropriate model handler from the provider
      const modelHandler = provider.getModelHandler(options.model);

      // Ensure the handler implements BackgroundRemoverHandler
      if (!this.isBackgroundRemoverHandler(modelHandler)) {
        throw new Error(
          `Model ${options.model} does not support removing background`,
        );
      }

      // Call the handler's removeBg method
      return modelHandler.removeBg(options);
    } catch (error) {
      console.error(
        `Error removing background with model ${options.model}:`,
        error,
      );
      throw error;
    }
  }

  // Type guard to check if a model handler implements BackgroundRemoverHandler
  private isBackgroundRemoverHandler(
    handler: any,
  ): handler is BackgroundRemoverHandler {
    return (
      handler &&
      handler.capabilities &&
      handler.capabilities.includes("background-remover")
    );
  }

  // Get available models that support image generation
  getAvailableModels(): string[] {
    const models: string[] = [];

    modelRegistry.forEach((config, model) => {
      if (config.capabilities.includes("background-remover")) {
        models.push(model as string);
      }
    });

    return models;
  }
}
