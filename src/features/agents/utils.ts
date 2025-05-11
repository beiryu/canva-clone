import { ModelConfig, modelRegistry } from "./models";
import { ModelCapability } from "./types";

export const getModelsByCapability = (
  capability: ModelCapability,
): ModelConfig[] => {
  const models: ModelConfig[] = [];

  modelRegistry.forEach((config, model) => {
    if (config.capabilities.includes(capability)) {
      models.push({ ...config, id: model });
    }
  });

  return models;
};

export const getModelsByProvider = (provider: string): ModelConfig[] => {
  const models: ModelConfig[] = [];

  modelRegistry.forEach((config, model) => {
    if (config.provider === provider) {
      models.push({ ...config, id: model });
    }
  });

  return models;
};

export const formatPromptWithStyle = (
  prompt: string,
  style?: string,
): string => {
  if (!style) return prompt;

  switch (style) {
    case "cartoon":
      return `${prompt}, vibrant cartoon style with bold outlines, flat colors, exaggerated features, comic book aesthetic, cell shading, expressive character design, clean vector-like appearance, Disney/Pixar inspired`;
    case "fantasy":
      return `${prompt}, epic fantasy artwork, magical atmosphere, ethereal lighting, mystical elements, detailed environment, dramatic composition, vibrant colors, high detail, dreamlike quality`;
    case "pixel":
      return `${prompt}, detailed pixel art, 16-bit style, limited color palette, visible pixels, retro game aesthetic, isometric perspective, clean pixel edges, nostalgic gaming style, inspired by classic SNES and arcade games`;
    case "retro":
      return `${prompt}, vintage retro style, 1970s/1980s aesthetic, nostalgic elements, muted color palette with warm tones, film grain texture, analog photography feel, vaporwave elements, synthwave lighting, old-school design`;
    case "sketch":
      return `${prompt}, detailed hand-drawn sketch, pencil strokes, hatching technique, gestural linework, minimal shading, artistic composition, sketchbook aesthetic, loose drawing style, black and white, high contrast`;
    case "nature":
      return `${prompt}, breathtaking nature photography, golden hour lighting, vibrant natural colors, high detail landscape, atmospheric perspective, shallow depth of field, National Geographic style, pristine wilderness, dramatic natural scenery`;
    default:
      return prompt;
  }
};
