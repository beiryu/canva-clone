import { convertToFile } from "@/features/images/utils";
import { replicate } from "@/lib/replicate";
import { BaseModelHandler } from "../model-handler";
import {
  AgentProvider,
  BackgroundRemoverHandler,
  EnhancePromptOptions,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageQuality,
  ModelCapability,
  ModelHandler,
  RemoveBgOptions,
  RemoveBgResult,
  TextGenerationHandler,
  TextGenerationResult,
} from "../types";
import {
  buildImagePrompt,
  firstOutputUri,
  joinTextOutput,
  mapStrictnessToImageStrength,
} from "../utils";

/**
 * Official Replicate models are addressed by `owner/name` and passed as
 * `model:`, which hits POST /models/{owner}/{name}/predictions. `version:` is
 * for pinned version hashes and hits POST /predictions instead — passing a
 * bare name there sends a name where a hash belongs.
 */
const REPLICATE_SLUGS = {
  "flux-kontext-pro": "black-forest-labs/flux-kontext-pro",
  "flux-1.1-pro-ultra": "black-forest-labs/flux-1.1-pro-ultra",
  "flux-schnell": "black-forest-labs/flux-schnell",
  "llama-3-70b-instruct": "meta/meta-llama-3-70b-instruct",
} as const;

// Model handler for Flux Kontext Pro — the sketch-to-image model.
class FluxKontextProHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("flux-kontext-pro", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, canvasImage, style } = options;

      const { aspectRatio = "1:1", strictness = "moderate" } = settings;

      const input = {
        prompt: buildImagePrompt({
          prompt,
          style,
          strictness,
          withImageGuidance: Boolean(canvasImage),
          suffix: "NO TEXT, ONLY IMAGE",
        }),
        aspect_ratio: aspectRatio,
        output_format: "png",
        // `input_image` is singular and a plain URI string. Omit the key
        // entirely when there is no sketch rather than sending "".
        ...(canvasImage ? { input_image: canvasImage } : {}),
      };

      console.log("Generating image with Flux Kontext Pro", input);

      const prediction = await replicate.predictions.create({
        model: REPLICATE_SLUGS["flux-kontext-pro"],
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const file = await convertToFile(
        firstOutputUri(completedPrediction.output, this.model),
        { filePrefix: "flux-kontext-pro", fileType: "image/png" },
      );

      return {
        file,
        providerName: "replicate",
        providerImageId: prediction.id,
      };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }
}

// Model handler for Flux Pro Ultra
class Flux11ProUltraHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("flux-1.1-pro-ultra", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, canvasImage, style } = options;

      const { aspectRatio = "1:1", strictness = "moderate" } = settings;

      const input = {
        prompt: buildImagePrompt({
          prompt,
          style,
          strictness,
          withImageGuidance: Boolean(canvasImage),
        }),
        aspect_ratio: aspectRatio,
        output_format: "jpg",
        ...(canvasImage
          ? {
              image_prompt: canvasImage,
              image_prompt_strength: mapStrictnessToImageStrength(strictness),
            }
          : {}),
      };

      console.log("Generating image with Flux Pro Ultra", input);

      const prediction = await replicate.predictions.create({
        model: REPLICATE_SLUGS["flux-1.1-pro-ultra"],
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const file = await convertToFile(
        firstOutputUri(completedPrediction.output, this.model),
        { filePrefix: "flux-pro-ultra", fileType: "image/jpeg" },
      );

      return {
        file,
        providerName: "replicate",
        providerImageId: prediction.id,
      };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }
}

// Model handler for Flux Schnell — prompt only, no image input whatsoever.
class FluxSchnellHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("flux-schnell", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, style } = options;

      const { aspectRatio = "1:1", quality = "medium" } = settings;

      const input = {
        // This model accepts no reference image, so sketch guidance would be
        // pure noise in the prompt.
        prompt: buildImagePrompt({
          prompt,
          style,
          withImageGuidance: false,
        }),
        aspect_ratio: aspectRatio,
        output_format: "webp",
        output_quality: this.mapQuality(quality),
      };

      console.log("Generating image with Flux Schnell", input);

      const prediction = await replicate.predictions.create({
        model: REPLICATE_SLUGS["flux-schnell"],
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const file = await convertToFile(
        firstOutputUri(completedPrediction.output, this.model),
        { filePrefix: "flux-schnell", fileType: "image/webp" },
      );

      return {
        file,
        providerName: "replicate",
        providerImageId: prediction.id,
      };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }

  private mapQuality(quality: ImageQuality): number {
    switch (quality) {
      case "low":
        return 60;
      case "medium":
        return 80;
      case "high":
        return 100;
      default:
        return 80;
    }
  }
}

const ENHANCE_SYSTEM_PROMPT =
  "You are an expert AI prompt engineer specializing in modern, cutting-edge image generation. Your task is to transform simple user prompts into highly detailed, visually striking descriptions that leverage the latest capabilities of modern AI image models. Focus on enhancing with: detailed subjects, precise lighting conditions, composition elements, camera perspectives, color palettes, mood/atmosphere, and technical specifications. Preserve the original intent while making the prompt incredibly vivid and specific.";

/**
 * meta/meta-llama-3-70b-instruct exposes no `system_prompt` input — its
 * `prompt_template` defaults to "{prompt}". The system turn therefore has to be
 * baked into the template with Llama-3 chat special tokens, where `{prompt}` is
 * the only placeholder Replicate substitutes.
 *
 * The token layout is load-bearing: `<|begin_of_text|>` exactly once at the
 * start, each turn is `<|start_header_id|>ROLE<|end_header_id|>` + two newlines
 * + content + `<|eot_id|>`, and the trailing assistant header deliberately has
 * no `<|eot_id|>` — that is the cue to start generating. Getting the double
 * newline or the trailing header wrong makes the model echo the prompt back.
 */
const LLAMA3_PROMPT_TEMPLATE =
  "<|begin_of_text|>" +
  "<|start_header_id|>system<|end_header_id|>\n\n" +
  ENHANCE_SYSTEM_PROMPT +
  "<|eot_id|>" +
  "<|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|>" +
  "<|start_header_id|>assistant<|end_header_id|>\n\n";

class ReplicateTextHandler
  extends BaseModelHandler
  implements TextGenerationHandler
{
  constructor() {
    super("llama-3-70b-instruct", ["text-generation"]);
  }

  async enhancePrompt(
    options: EnhancePromptOptions,
  ): Promise<TextGenerationResult> {
    const { currentPrompt } = options;

    try {
      const prediction = await replicate.predictions.create({
        model: REPLICATE_SLUGS["llama-3-70b-instruct"],
        input: {
          prompt: `Enhance this image prompt: "${currentPrompt}"`,
          prompt_template: LLAMA3_PROMPT_TEMPLATE,
          max_tokens: 500,
          temperature: 0.6,
          top_p: 0.9,
          frequency_penalty: 0.2,
          // presence_penalty is deliberately left at the model default (1.15).
          // Replicate's llama-3 treats it as a multiplicative repetition
          // penalty where 1.0 is neutral, unlike OpenAI's additive -2..2 scale.
          // Carrying over the old OpenAI value of 0.1 would land far below
          // neutral and actively encourage token loops.
        },
      });

      const completedPrediction = await replicate.wait(prediction);

      const text = joinTextOutput(
        completedPrediction.output,
        this.model,
      ).trim();

      return { text: text.length > 0 ? text : currentPrompt };
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      throw error;
    }
  }
}

// Model handler for Background Remover
class LabsBackgroundRemoverHandler
  extends BaseModelHandler
  implements BackgroundRemoverHandler
{
  constructor() {
    super("labs/background-remover", ["background-remover"]);
  }

  async removeBg(options: RemoveBgOptions): Promise<RemoveBgResult> {
    try {
      const { image } = options;

      const input = {
        image,
      };

      console.log("Removing background with Background Remover", input);

      // Pinned to a version hash, so `version:` is correct here.
      const prediction = await replicate.predictions.create({
        version:
          "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const file = await convertToFile(
        firstOutputUri(completedPrediction.output, this.model),
        { filePrefix: "background-remover" },
      );

      return { file };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }
}

export class ReplicateProvider implements AgentProvider {
  name = "replicate";
  supportedCapabilities: ModelCapability[] = [
    "image-generation",
    "text-generation",
    "background-remover",
  ];

  private modelHandlers: Map<string, ModelHandler> = new Map();

  constructor() {
    // Initialize handlers for each model
    this.registerHandler(new FluxKontextProHandler());
    this.registerHandler(new Flux11ProUltraHandler());
    this.registerHandler(new FluxSchnellHandler());
    this.registerHandler(new ReplicateTextHandler());
    this.registerHandler(new LabsBackgroundRemoverHandler());
  }

  private registerHandler(handler: ModelHandler): void {
    this.modelHandlers.set(handler.model, handler);
  }

  getModelHandler(model: string): ModelHandler {
    const handler = this.modelHandlers.get(model);
    if (!handler) {
      throw new Error(`No handler found for model: ${model}`);
    }
    return handler;
  }
}

/**
 * Handlers are stateless, so share one provider instance. AgentManager builds
 * three agents per request, each of which would otherwise construct its own
 * provider and full handler set.
 */
let cachedProvider: ReplicateProvider | null = null;

export const getReplicateProvider = (): ReplicateProvider =>
  (cachedProvider ??= new ReplicateProvider());
