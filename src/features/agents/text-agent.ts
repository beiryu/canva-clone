import { modelRegistry } from "./models";
import { OpenAIProvider } from "./providers/openai";
import {
  AgentProvider,
  TextGenerationHandler,
  TextGenerationOptions,
  TextGenerationResult,
} from "./types";

export class TextAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("openai", new OpenAIProvider());
  }

  async generateText(
    options: TextGenerationOptions,
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

      // Call the handler's generateText method
      return modelHandler.generateText(options);
    } catch (error) {
      console.error(
        `Error generating text with model ${options.model}:`,
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
      typeof handler.generateText === "function" &&
      handler.capabilities &&
      handler.capabilities.includes("text-generation")
    );
  }

  // Get available models that support text generation
  getAvailableModels(): string[] {
    const models: string[] = [];

    modelRegistry.forEach((config, model) => {
      if (config.capabilities.includes("text-generation")) {
        models.push(model as string);
      }
    });

    return models;
  }
}
