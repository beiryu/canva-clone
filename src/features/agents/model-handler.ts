import { modelRegistry } from "./models";
import { ModelCapability, ModelHandler } from "./types";

export abstract class BaseModelHandler implements ModelHandler {
  constructor(
    public readonly model: string,
    public readonly capabilities: ModelCapability[],
  ) {}

  supportsModel(model: string): boolean {
    return this.model === model;
  }

  protected getModelConfig() {
    const config = modelRegistry.get(this.model as any);
    if (!config) {
      throw new Error(`Model ${this.model} not found in registry`);
    }
    return config;
  }

  /**
   * Check if the model supports a specific capability
   */
  supportsCapability(capability: ModelCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Validate that the model supports the capabilities required for an operation
   */
  validateCapabilities(requiredCapabilities: ModelCapability[]): void {
    for (const capability of requiredCapabilities) {
      if (!this.supportsCapability(capability)) {
        throw new Error(
          `Model ${this.model} does not support capability: ${capability}`,
        );
      }
    }
  }
}
