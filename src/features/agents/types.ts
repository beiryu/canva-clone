import {
  BACKGROUND_REMOVER_MODELS,
  IMAGE_ASPECT_RATIOS,
  IMAGE_GENERATION_MODELS,
  IMAGE_QUALITIES,
  SKETCH_STRICTNESS,
  STYLE_ANALYSIS_MODELS,
  TEXT_GENERATION_MODELS,
} from "./model-ids";
import { AnyModel } from "./models";

export type ImageGenerationModel = (typeof IMAGE_GENERATION_MODELS)[number];

export type TextGenerationModel = (typeof TEXT_GENERATION_MODELS)[number];

export type BackgroundRemoverModel = (typeof BACKGROUND_REMOVER_MODELS)[number];

export type StyleAnalysisModel = (typeof STYLE_ANALYSIS_MODELS)[number];

export type ModelCapability =
  | "image-generation"
  | "text-generation"
  | "background-remover"
  | "style-analysis";

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];

export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

export type SketchGuidanceStrictness = (typeof SKETCH_STRICTNESS)[number];

export interface BaseGenerationOptions {
  model: AnyModel;
}

export interface ImageGenerationOptions extends BaseGenerationOptions {
  prompt: string;
  canvasImage?: string;
  style?: string;
  /**
   * Fully-resolved style guidance from a user-created preset. When present it
   * replaces whatever `style` would have produced via `createStyleInstruction`,
   * because preset text lives in the database rather than the built-in switch.
   */
  styleInstruction?: string;
  /**
   * Fetchable URI for the image the preset was built from, sent to the model as
   * a second input alongside `canvasImage`. `styleInstruction` is that image
   * compressed to a paragraph by a 7B vision model — lossy twice over — so the
   * actual reference is what makes generations match the style.
   *
   * Undefined for built-in styles, for presets saved without a reference, and
   * for models that take no image input at all.
   */
  styleReferenceImage?: string;
  /**
   * Real MIME of `styleReferenceImage`. Required rather than assumed: the http
   * branch of `convertToFile` labels the blob with whatever type it is given
   * and ignores the response header, so a wrong value here reaches OpenAI as
   * mislabelled bytes.
   */
  styleReferenceMimeType?: string;
  settings: {
    aspectRatio?: ImageAspectRatio;
    quality?: ImageQuality;
    strictness?: SketchGuidanceStrictness;
  };
}

export interface AutoPromptOptions extends BaseGenerationOptions {
  /**
   * The current canvas, as a downscaled data URL. Required — the whole point is
   * writing a prompt from what the user drew.
   */
  canvasImage: string;
  /** Whatever the user already typed, used as topic context. May be empty. */
  context?: string;
  /** Display name of the selected style, built-in or user preset. */
  styleName?: string;
  /**
   * The [STYLE GUIDANCE] text that will be applied at generation time. Passed
   * so the written prompt does not contradict it — without this the two are
   * composed blind to each other and can ask for opposite renderings.
   */
  styleInstruction?: string;
}

export interface RemoveBgOptions extends BaseGenerationOptions {
  image: string;
}

export interface StyleAnalysisOptions extends BaseGenerationOptions {
  /** Publicly fetchable URI — Replicate cannot read private storage. */
  image: string;
}

export interface ImageGenerationResult {
  file: File;
  providerName?: string;
  providerImageId?: string;
}

export interface TextGenerationResult {
  text: string;
}

export interface RemoveBgResult {
  file: File;
}

export interface StyleAnalysisResult {
  instruction: string;
}

export interface AgentProvider {
  name: string;
  supportedCapabilities: ModelCapability[];
  getModelHandler: (model: string) => ModelHandler;
}

export interface ModelHandler {
  model: string;
  capabilities: ModelCapability[];
  supportsModel: (model: string) => boolean;
}

export interface ImageGenerationHandler extends ModelHandler {
  generateImage: (
    options: ImageGenerationOptions,
  ) => Promise<ImageGenerationResult>;
}

export interface TextGenerationHandler extends ModelHandler {
  autoPrompt: (options: AutoPromptOptions) => Promise<TextGenerationResult>;
}

export interface BackgroundRemoverHandler extends ModelHandler {
  removeBg: (options: RemoveBgOptions) => Promise<RemoveBgResult>;
}

export interface StyleAnalysisHandler extends ModelHandler {
  analyzeStyle: (
    options: StyleAnalysisOptions,
  ) => Promise<StyleAnalysisResult>;
}
