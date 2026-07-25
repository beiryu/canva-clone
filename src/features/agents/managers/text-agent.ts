import { modelRegistry } from "../models";
import { getReplicateProvider } from "../providers/replicate";
import {
  AgentProvider,
  EnhancePromptOptions,
  TextGenerationHandler,
  TextGenerationResult,
} from "../types";

export class TextAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("replicate", getReplicateProvider());
  }

  async enhancePrompt(
    options: EnhancePromptOptions,
  ): Promise<TextGenerationResult> {
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

      // Ensure the handler implements TextGenerationHandler
      if (!this.isTextGenerationHandler(modelHandler)) {
        throw new Error(
          `Model ${options.model} does not support text generation`,
        );
      }

      return modelHandler.enhancePrompt(options);
    } catch (error) {
      console.error(
        `Error enhancing prompt with model ${options.model}:`,
        error,
      );
      throw error;
    }
  }

  // Type guard to check if a model handler implements TextGenerationHandler
  private isTextGenerationHandler(
    handler: any,
  ): handler is TextGenerationHandler {
    return (
      handler &&
      handler.capabilities &&
      handler.capabilities.includes("text-generation")
    );
  }
}
