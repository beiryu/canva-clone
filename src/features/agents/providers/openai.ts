import { convertToFile } from "@/features/images/utils";
import { getOpenAIClient } from "@/lib/openai";
import { BaseModelHandler } from "../model-handler";
import { GPT_IMAGE_SIZES } from "../model-ids";
import {
  AgentProvider,
  ImageAspectRatio,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageQuality,
  ModelCapability,
  ModelHandler,
} from "../types";
import { buildImagePrompt, orderInputImages } from "../utils";

const GPT_IMAGE_MODEL = "gpt-image-2";

/**
 * OpenAI surfaces content-policy rejections as a structured API error. The
 * route's generic "Failed to generate image" would bury the reason, so the
 * message is lifted out here and rethrown.
 */
const rethrowWithReason = (error: unknown): never => {
  const message =
    error && typeof error === "object" && "error" in error
      ? ((error as { error?: { message?: string } }).error?.message ?? null)
      : null;

  if (message) {
    throw new Error(`OpenAI rejected the request: ${message}`);
  }

  throw error;
};

class GPTImage2Handler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super(GPT_IMAGE_MODEL, ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const {
      prompt,
      settings,
      canvasImage,
      style,
      styleInstruction,
      styleReferenceImage,
      styleReferenceMimeType,
    } = options;

    const {
      aspectRatio = "1:1",
      quality = "medium",
      strictness = "moderate",
    } = settings;

    try {
      const openai = getOpenAIClient();

      const size = this.mapAspectRatioToSize(aspectRatio);

      const inputImages = orderInputImages({ canvasImage, styleReferenceImage });

      const composedPrompt = buildImagePrompt({
        prompt,
        style,
        styleInstruction,
        strictness,
        withImageGuidance: Boolean(canvasImage),
        withStyleReference: Boolean(styleReferenceImage),
      });

      // Roles rather than a boolean: when a generation comes back wearing the
      // style reference's subject, this is the line that says which images went
      // in and in what order.
      console.log("Generating image with GPT Image 2", {
        size,
        quality,
        inputImages: inputImages.map((image) => image.role),
      });

      // Any input image makes this an edit rather than a generation. `ai.ts`
      // hands over signed Supabase URLs, so they are pulled back down into
      // Files — the edits endpoint takes bytes, not URLs. That extra hop keeps
      // the route provider-agnostic instead of special-casing OpenAI upstream.
      //
      // `size` is honoured on the edit endpoint too, so a reference image with
      // an odd aspect ratio does not drag the output away from the requested
      // one.
      const response = inputImages.length
        ? await openai.images.edit({
            model: GPT_IMAGE_MODEL,
            image: await Promise.all(
              inputImages.map((image) =>
                convertToFile(image.uri, {
                  filePrefix:
                    image.role === "sketch" ? "canvas" : "style-reference",
                  // convertToFile's http branch stamps whatever type it is
                  // handed and ignores the response header, so this has to be
                  // the object's real type. The canvas is always a PNG we
                  // produced; the reference's comes from its stored extension.
                  fileType:
                    image.role === "sketch"
                      ? "image/png"
                      : (styleReferenceMimeType ?? "image/png"),
                }),
              ),
            ),
            prompt: composedPrompt,
            size,
            quality: this.mapQuality(quality),
            // input_fidelity is deliberately omitted: gpt-image-2 processes
            // every input at high fidelity and rejects the parameter.
          })
        : await openai.images.generate({
            model: GPT_IMAGE_MODEL,
            prompt: composedPrompt,
            size,
            quality: this.mapQuality(quality),
            output_format: "png",
          });

      const b64 = response.data?.[0]?.b64_json;

      if (!b64) {
        throw new Error("OpenAI returned no image data");
      }

      const file = await convertToFile(b64, {
        // No slash in the prefix — it becomes part of the Supabase object name
        // and a "/" there would silently nest the upload under a new folder.
        filePrefix: "gpt-image-2",
        fileType: "image/png",
      });

      return { file, providerName: "openai" };
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      return rethrowWithReason(error);
    }
  }

  private mapQuality(quality: ImageQuality): "low" | "medium" | "high" {
    // IMAGE_QUALITIES is low|medium|high, which gpt-image-2 accepts verbatim.
    return quality;
  }

  private mapAspectRatioToSize(aspectRatio: ImageAspectRatio): string {
    const size = GPT_IMAGE_SIZES[aspectRatio];

    if (!size) {
      throw new Error(`No gpt-image-2 size mapped for ratio "${aspectRatio}"`);
    }

    return size;
  }
}

export class OpenAIProvider implements AgentProvider {
  name = "openai";
  supportedCapabilities: ModelCapability[] = ["image-generation"];

  private modelHandlers: Map<string, ModelHandler> = new Map();

  constructor() {
    this.registerHandler(new GPTImage2Handler());
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

/** Handlers are stateless, so share one provider instance — see replicate.ts. */
let cachedProvider: OpenAIProvider | null = null;

export const getOpenAIProvider = (): OpenAIProvider =>
  (cachedProvider ??= new OpenAIProvider());
