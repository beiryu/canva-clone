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

  supportsCapability(capability: ModelCapability): boolean {
    return this.capabilities.includes(capability);
  }

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
