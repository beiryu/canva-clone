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
  "gpt-image-2",
  "seedream-5-lite",
] as const;

export const TEXT_GENERATION_MODELS = ["gpt-5.4-mini"] as const;

export const BACKGROUND_REMOVER_MODELS = ["labs/background-remover"] as const;

export const STYLE_ANALYSIS_MODELS = ["janus-pro-7b"] as const;

export const DEFAULT_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_TEXT_MODEL = "gpt-5.4-mini";
export const DEFAULT_STYLE_ANALYSIS_MODEL = "janus-pro-7b";

/**
 * Ids of the built-in styles handled by `createStyleInstruction`. Anything
 * outside this set is treated as a user-created preset id and resolved from
 * the database instead.
 */
export const BUILT_IN_STYLE_IDS = [
  "nature",
  "pixel",
  "sketch",
  "cinematic",
  "comic",
  "cyberpunk",
  "ghibli",
] as const;

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

/**
 * gpt-image-2 takes an explicit `WxH` size rather than a ratio name. It accepts
 * arbitrary resolutions provided both edges are multiples of 16, the longest
 * edge is <= 3840, the long:short ratio is <= 3:1, and the total pixel count is
 * between 655,360 and 8,294,400.
 *
 * Every entry below is an exact match for its ratio (no rounding) and lands
 * around 2MP. Adding a ratio to IMAGE_ASPECT_RATIOS without adding it here is a
 * type error at the lookup site, which is the point of keeping them adjacent.
 */
export const GPT_IMAGE_SIZES = {
  "1:1": "1472x1472",
  "16:9": "1792x1008",
  "9:16": "1008x1792",
  "21:9": "2240x960",
  "9:21": "960x2240",
  "3:2": "1776x1184",
  "2:3": "1184x1776",
  "4:5": "1280x1600",
  "5:4": "1600x1280",
  "3:4": "1248x1664",
  "4:3": "1664x1248",
} as const;

/** seedream-5-lite accepts a narrower set — it rejects 9:21, 4:5 and 5:4. */
export const SEEDREAM_ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "9:16",
  "21:9",
  "3:2",
  "2:3",
  "3:4",
  "4:3",
] as const;

export const IMAGE_QUALITIES = ["low", "medium", "high"] as const;

export const SKETCH_STRICTNESS = ["loose", "moderate", "strict"] as const;
