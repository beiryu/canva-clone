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
    case "nature":
      instructions = `Breathtaking nature photography, golden hour lighting, vibrant natural colors, high detail landscape, atmospheric perspective, shallow depth of field, National Geographic style, pristine wilderness, dramatic natural scenery`;
      break;
    case "pixel":
      instructions = `Detailed pixel art, 16-bit style, limited color palette, visible pixels, retro game aesthetic, isometric perspective, clean pixel edges, nostalgic gaming style, inspired by classic SNES and arcade games`;
      break;
    case "sketch":
      instructions = `Detailed hand-drawn sketch, pencil strokes, hatching technique, gestural linework, minimal shading, artistic composition, sketchbook aesthetic, loose drawing style, black and white, high contrast`;
      break;
    case "cinematic":
      instructions = `Hollywood cinematic style, dramatic lighting, wide-angle composition, movie poster aesthetic, bold typography, high production value, professional color grading, epic scale, dynamic framing, theatrical atmosphere, blockbuster quality`;
      break;
    case "comic":
      instructions = `Dynamic comic book style, bold linework, dramatic shading, vibrant colors, action-packed composition, halftone patterns, speech bubble elements, comic panel layout, superhero aesthetic, dramatic lighting, high contrast, Marvel/DC inspired`;
      break;
    case "cyberpunk":
      instructions = `Neon-lit cyberpunk style, futuristic cityscape, rain-slicked streets, holographic elements, high-tech low-life aesthetic, vibrant neon colors, dark atmospheric lighting, Blade Runner inspired, technological dystopia, digital glitch effects`;
      break;
    case "ghibli":
      instructions = `Studio Ghibli-inspired anime style, soft watercolor textures, expressive large eyes, dynamic hair movement, dreamy atmosphere, hand-painted backgrounds, warm lighting, detailed character expressions, whimsical elements`;
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
