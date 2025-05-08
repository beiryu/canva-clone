import { ModelConfig, modelRegistry } from "./models";
import { ModelCapability } from "./types";

export function getModelsByCapability(
  capability: ModelCapability,
): ModelConfig[] {
  const models: ModelConfig[] = [];

  modelRegistry.forEach((config, model) => {
    if (config.capabilities.includes(capability)) {
      models.push({ ...config, id: model });
    }
  });

  return models;
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  const models: ModelConfig[] = [];

  modelRegistry.forEach((config, model) => {
    if (config.provider === provider) {
      models.push({ ...config, id: model });
    }
  });

  return models;
}
