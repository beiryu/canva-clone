import { convertToFile } from "@/features/images/utils";
import { replicate } from "@/lib/replicate";
import { BaseModelHandler } from "../model-handler";
import {
  AgentProvider,
  BackgroundRemoverHandler,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ModelCapability,
  ModelHandler,
  RemoveBgOptions,
  RemoveBgResult,
  StyleAnalysisHandler,
  StyleAnalysisOptions,
  StyleAnalysisResult,
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
  "seedream-5-lite": "bytedance/seedream-5-lite",
  "flux-kontext-pro": "black-forest-labs/flux-kontext-pro",
  "flux-1.1-pro-ultra": "black-forest-labs/flux-1.1-pro-ultra",
} as const;

// Model handler for Seedream 5 Lite — text-to-image plus sketch editing.
class Seedream5LiteHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("seedream-5-lite", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, canvasImage, style, styleInstruction } =
        options;

      const { aspectRatio = "1:1", strictness = "moderate" } = settings;

      const input = {
        prompt: buildImagePrompt({
          prompt,
          style,
          styleInstruction,
          strictness,
          withImageGuidance: Boolean(canvasImage),
        }),
        aspect_ratio: aspectRatio,
        size: "2K",
        output_format: "png",
        // "auto" would let the model decide to emit a batch of related images;
        // the gallery expects exactly one.
        sequential_image_generation: "disabled",
        // Unlike kontext's singular `input_image` string, this key is an array
        // of URIs. Omit it entirely when there is no sketch.
        ...(canvasImage ? { image_input: [canvasImage] } : {}),
      };

      console.log("Generating image with Seedream 5 Lite", input);

      const prediction = await replicate.predictions.create({
        model: REPLICATE_SLUGS["seedream-5-lite"],
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const file = await convertToFile(
        firstOutputUri(completedPrediction.output, this.model),
        { filePrefix: "seedream-5-lite", fileType: "image/png" },
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
      const { prompt, settings, canvasImage, style, styleInstruction } =
        options;

      const { aspectRatio = "1:1", strictness = "moderate" } = settings;

      const input = {
        prompt: buildImagePrompt({
          prompt,
          style,
          styleInstruction,
          strictness,
          withImageGuidance: Boolean(canvasImage),
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
      const { prompt, settings, canvasImage, style, styleInstruction } =
        options;

      const { aspectRatio = "1:1", strictness = "moderate" } = settings;

      const input = {
        prompt: buildImagePrompt({
          prompt,
          style,
          styleInstruction,
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

/**
 * Janus-Pro-7B is a small VLM, so the question stays short and concrete —
 * asking it for a long structured document makes it drift or loop. It is asked
 * only for the *look* of the reference; the constant thumbnail-composition
 * rules are appended by the caller, where they cannot be forgotten.
 *
 * "Do not describe the subject" is load-bearing: without it the preset carries
 * the reference image's content, and every future generation inherits it.
 */
const STYLE_ANALYSIS_QUESTION =
  "Describe the visual style of this image so it can be reproduced on a " +
  "completely different subject. Cover: the rendering technique, the colour " +
  "palette with specific colours, the lighting, the texture and level of " +
  "detail, and the contrast. Write one dense paragraph of visual descriptors. " +
  "Do NOT describe the subject or what is happening in the image.";

class JanusProStyleHandler
  extends BaseModelHandler
  implements StyleAnalysisHandler
{
  constructor() {
    super("janus-pro-7b", ["style-analysis"]);
  }

  async analyzeStyle(
    options: StyleAnalysisOptions,
  ): Promise<StyleAnalysisResult> {
    try {
      const { image } = options;

      const input = {
        image,
        question: STYLE_ANALYSIS_QUESTION,
        // The model default of 0.1 sends it into repetition loops
        // ("evocative, visually striking, evocative, ..."). 0.7 is the lowest
        // value that produced clean output in testing.
        temperature: 0.7,
        top_p: 0.95,
      };

      console.log("Analyzing reference style with Janus Pro 7B");

      // Pinned to a version hash — this is a community-published model, so the
      // `model:` endpoint 404s for it.
      const prediction = await replicate.predictions.create({
        version:
          "deepseek-ai/janus-pro-7b:fbf6eb41957601528aab2b3f6d37a287015d9f486c3ac4ec6e80f04744ac1a32",
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const instruction = joinTextOutput(
        completedPrediction.output,
        this.model,
      ).trim();

      if (!instruction) {
        throw new Error("Style analysis returned an empty description");
      }

      return { instruction };
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
    "background-remover",
    "style-analysis",
  ];

  private modelHandlers: Map<string, ModelHandler> = new Map();

  constructor() {
    this.registerHandler(new Seedream5LiteHandler());
    this.registerHandler(new FluxKontextProHandler());
    this.registerHandler(new Flux11ProUltraHandler());
    this.registerHandler(new LabsBackgroundRemoverHandler());
    this.registerHandler(new JanusProStyleHandler());
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
