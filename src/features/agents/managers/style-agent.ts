import { modelRegistry } from "../models";
import { getReplicateProvider } from "../providers/replicate";
import {
  AgentProvider,
  StyleAnalysisHandler,
  StyleAnalysisOptions,
  StyleAnalysisResult,
} from "../types";

export class StyleAgent {
  private providers: Map<string, AgentProvider> = new Map();

  constructor() {
    this.providers.set("replicate", getReplicateProvider());
  }

  async analyzeStyle(
    options: StyleAnalysisOptions,
  ): Promise<StyleAnalysisResult> {
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

      if (!this.isStyleAnalysisHandler(modelHandler)) {
        throw new Error(
          `Model ${options.model} does not support style analysis`,
        );
      }

      return modelHandler.analyzeStyle(options);
    } catch (error) {
      console.error(
        `Error analyzing style with model ${options.model}:`,
        error,
      );
      throw error;
    }
  }

  private isStyleAnalysisHandler(handler: any): handler is StyleAnalysisHandler {
    return (
      handler &&
      handler.capabilities &&
      handler.capabilities.includes("style-analysis")
    );
  }
}
