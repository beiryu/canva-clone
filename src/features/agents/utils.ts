import { ModelConfig, modelRegistry } from "./models";
import { ModelCapability, SketchGuidanceStrictness } from "./types";

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

export const createStyleInstruction = (style: string): string => {
  let instructions = "";

  switch (style) {
    case "cartoon":
      instructions = `Vibrant cartoon style with bold outlines, flat colors, exaggerated features, comic book aesthetic, cell shading, expressive character design, clean vector-like appearance, Disney/Pixar inspired`;
      break;
    case "fantasy":
      instructions = `Epic fantasy artwork, magical atmosphere, ethereal lighting, mystical elements, detailed environment, dramatic composition, vibrant colors, high detail, dreamlike quality`;
      break;
    case "pixel":
      instructions = `Detailed pixel art, 16-bit style, limited color palette, visible pixels, retro game aesthetic, isometric perspective, clean pixel edges, nostalgic gaming style, inspired by classic SNES and arcade games`;
      break;
    case "retro":
      instructions = `Vintage retro style, 1970s/1980s aesthetic, nostalgic elements, muted color palette with warm tones, film grain texture, analog photography feel, vaporwave elements, synthwave lighting, old-school design`;
      break;
    case "sketch":
      instructions = `Detailed hand-drawn sketch, pencil strokes, hatching technique, gestural linework, minimal shading, artistic composition, sketchbook aesthetic, loose drawing style, black and white, high contrast`;
      break;
    case "nature":
      instructions = `Breathtaking nature photography, golden hour lighting, vibrant natural colors, high detail landscape, atmospheric perspective, shallow depth of field, National Geographic style, pristine wilderness, dramatic natural scenery`;
      break;
  }

  return instructions;
};

export const createSketchGuidanceInstruction = (
  strictness: SketchGuidanceStrictness,
): string => {
  let instructions = "Use the provided sketch as a ";

  switch (strictness) {
    case "strict":
      instructions +=
        "strict blueprint. Follow the exact composition, layout, and proportions of the sketch. Preserve all distinct elements and maintain the color palette where colors are present.";
      break;
    case "moderate":
      instructions +=
        "general guide. Maintain the overall composition and key elements while allowing artistic interpretation. Keep the main elements recognizable but feel free to enhance details and colors.";
      break;
    case "loose":
      instructions +=
        "loose inspiration. Capture the essence and concept of the sketch while having creative freedom with details, composition, and colors. Use the sketch as a starting point but feel free to expand upon it.";
      break;
  }

  return instructions;
};
