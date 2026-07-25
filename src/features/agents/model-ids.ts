/**
 * Single source of truth for model ids and enum-like settings.
 *
 * These are runtime `as const` tuples so both the TypeScript unions (in
 * `./types`) and the zod enums (in the API routes) derive from one place.
 * This module intentionally imports nothing — `./types` and `./models`
 * already reference each other for types only, and pulling runtime values
 * into that cycle would make it a real one.
 */

export const IMAGE_GENERATION_MODELS = [
  "flux-kontext-pro",
  "flux-1.1-pro-ultra",
  "flux-schnell",
] as const;

export const TEXT_GENERATION_MODELS = ["llama-3-70b-instruct"] as const;

export const BACKGROUND_REMOVER_MODELS = ["labs/background-remover"] as const;

export const DEFAULT_IMAGE_MODEL = "flux-kontext-pro";
export const DEFAULT_TEXT_MODEL = "llama-3-70b-instruct";

export const IMAGE_ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "9:16",
  "21:9",
  "9:21",
  "3:2",
  "2:3",
  "4:5",
  "5:4",
  "3:4",
  "4:3",
] as const;

export const IMAGE_QUALITIES = ["low", "medium", "high"] as const;

export const SKETCH_STRICTNESS = ["loose", "moderate", "strict"] as const;
