import { AnyModel, ModelConfig, modelRegistry } from "./models";
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

export const getModelDisplayName = (model?: string | null): string | null => {
  if (!model) return null;

  return modelRegistry.get(model as AnyModel)?.name ?? model;
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

/**
 * Replicate returns either a bare URI string (flux-kontext-pro,
 * flux-1.1-pro-ultra, background-remover) or an array of URIs (seedream-5-lite).
 * Normalize to the first URI.
 */
export const firstOutputUri = (output: unknown, model: string): string => {
  const value = Array.isArray(output) ? output[0] : output;

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid image output from Replicate for model "${model}"`);
  }

  return value;
};

/**
 * Replicate text models stream token-by-token, so `wait()` resolves with the
 * accumulated array of string chunks.
 */
export const joinTextOutput = (output: unknown, model: string): string => {
  const text = Array.isArray(output) ? output.join("") : output;

  if (typeof text !== "string") {
    throw new Error(`Invalid text output from Replicate for model "${model}"`);
  }

  return text;
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

/**
 * flux-1.1-pro-ultra blends its `image_prompt` with the text prompt via
 * `image_prompt_strength` (0-1, model default 0.1). Higher means the reference
 * image dominates.
 *
 * These are deliberately lower than they might look right on paper: the
 * reference here is `editor.canvas.toDataURL()` — a mostly-flat workspace fill
 * with thin strokes on it, not a photo. Push "strict" up near 0.85 and ultra
 * faithfully reproduces that near-blank canvas, which makes the strictest
 * setting look the most broken. Tune from real output.
 */
export const mapStrictnessToImageStrength = (
  strictness: SketchGuidanceStrictness = "moderate",
): number => {
  switch (strictness) {
    case "strict":
      return 0.6;
    case "moderate":
      return 0.35;
    case "loose":
      return 0.15;
  }
};

export interface ImagePromptOptions {
  prompt: string;
  style?: string;
  /**
   * Style guidance for a user-created preset, already resolved from the
   * database. Takes precedence over `style` — preset ids are not in
   * `createStyleInstruction`'s switch, which would silently yield "" and drop
   * the [STYLE GUIDANCE] block entirely.
   */
  styleInstruction?: string;
  strictness?: SketchGuidanceStrictness;
  /**
   * True only when an image is actually being sent to the model. This is a
   * per-request fact, not a per-model one: without it, a sketch-capable model
   * invoked on an empty canvas still gets told to "use the provided sketch as
   * a strict blueprint".
   */
  withImageGuidance?: boolean;
}

export const buildImagePrompt = ({
  prompt,
  style,
  styleInstruction,
  strictness = "moderate",
  withImageGuidance = false,
}: ImagePromptOptions): string => {
  const blocks: string[] = [];

  if (withImageGuidance) {
    blocks.push(
      `[SKETCH GUIDANCE] ${createSketchGuidanceInstruction(strictness)}`,
    );
  }

  // A resolved preset wins; otherwise fall back to the built-in switch.
  // createStyleInstruction returns "" for anything outside its switch, which
  // would otherwise emit a bare [STYLE GUIDANCE] label.
  const resolvedStyle =
    styleInstruction?.trim() || (style ? createStyleInstruction(style) : "");
  if (resolvedStyle) {
    blocks.push(`[STYLE GUIDANCE] ${resolvedStyle}`);
  }

  blocks.push(`[USER PROMPT] ${prompt}`);

  return blocks.join("\n");
};
