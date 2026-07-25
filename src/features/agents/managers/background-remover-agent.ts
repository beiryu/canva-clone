import { modelRegistry } from "../models";
import { getReplicateProvider } from "../providers/replicate";
import {
  AgentProvider,
  BackgroundRemoverHandler,
  RemoveBgOptions,
  RemoveBgResult,
} from "../types";

export class BackgroundRemoverAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("replicate", getReplicateProvider());
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
      const modelHandler = provider.getModelHandler(options.model);

      if (!this.isBackgroundRemoverHandler(modelHandler)) {
        throw new Error(
          `Model ${options.model} does not support removing background`,
        );
      }

      return modelHandler.removeBg(options);
    } catch (error) {
      console.error(
        `Error removing background with model ${options.model}:`,
        error,
      );
      throw error;
    }
  }

  private isBackgroundRemoverHandler(
    handler: any,
  ): handler is BackgroundRemoverHandler {
    return (
      handler &&
      handler.capabilities &&
      handler.capabilities.includes("background-remover")
    );
  }
}
