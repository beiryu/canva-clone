import { modelRegistry } from "../models";
import { getOpenAIProvider } from "../providers/openai";
import { getReplicateProvider } from "../providers/replicate";
import {
  AgentProvider,
  AutoPromptOptions,
  TextGenerationHandler,
  TextGenerationResult,
} from "../types";

export class TextAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("replicate", getReplicateProvider());
    // The auto-prompt model is a vision model on OpenAI. Without this entry the
    // registry resolves it to "Provider openai not configured".
    this.providers.set("openai", getOpenAIProvider());
  }

  async autoPrompt(options: AutoPromptOptions): Promise<TextGenerationResult> {
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

      if (!this.isTextGenerationHandler(modelHandler)) {
        throw new Error(
          `Model ${options.model} does not support text generation`,
        );
      }

      return modelHandler.autoPrompt(options);
    } catch (error) {
      console.error(
        `Error generating auto prompt with model ${options.model}:`,
        error,
      );
      throw error;
    }
  }

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
